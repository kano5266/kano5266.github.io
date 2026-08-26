// trash.js — the Trash: sana's wastepaper basket, a folder window with
// a disk recovery card behind it. The trash is just a folder with an
// empty-trash button and a can on the floor: the folder kit
// (folder.js) supplies the window, the info bar, the 4px item surface
// and all the physics; the Trash supplies its inventory, the can as a
// second door (anything dropped on it is moved to the trash, no
// questions — same as dropping into the open window), and the
// sign-out sweep.
//
// The THINGS in the can are not the can's: what a file is lives in
// files.js (the .dsk and friends), what the game console is lives in
// console.js — the trash merely lists them, the way a real bin holds
// whatever fell in. The hardware modules reach the desk's strays
// through window.TrashApp (strayItem / takeStray / refresh), and the
// sweep asks the console to reset itself and takes back whatever it
// frees.
//
// Signed in as sana, everything is allowed: empty the trash and it
// empties; drag anything out of the can and it lands on the desk at
// full scale — the same item, the same drawing, just the room's 8px
// grid instead of the drawer's 4 (folders open as their own folder
// windows out there; files open in the shared viewer; a trip back over
// the can swallows them home without a dialog). None of it survives a
// reboot, and that is the machine's doing, not a permission: the desk
// carries a DISK RECOVERY CARD in pci slot 1 (the System pane lists it,
// spec-style), the kind internet cafés ran — every boot restores the
// disk, so a refresh puts every file back where the card last saw it.
// Which is, conveniently, exactly what a static page does.
(() => {
  const CSS = `
    /* A folder item out on the desk: the desk icons' shell, worn by the
       kit's art at full scale. draggable-item gives it position: fixed
       and the grab cursor; alignToGrid never flows it (it is not a
       .pixel-icon — it stands exactly where sana dropped it). */
    .trash-out {
      z-index: 2;
      width: 112px;
      height: 160px;
      padding: 0;
      border: 0;
      background: transparent;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    /* Two buttons side by side would put their 4px borders against each
       other and draw one 8px line down the middle — a fused control,
       not a pair. A cell of air between them keeps each its own. */
    .trash-window .f-end { gap: 8px; }

    /* The empty button once the question is asked: it stops being a
       word in a bar and becomes the answer, filled the way the desk
       fills anything it wants a hand to land on. */
    .trash-window .f-bar-btn[data-armed] {
      background: var(--identity-primary);
      color: var(--identity-paper);      /* a label ON primary is paper */
    }

    .trash-window .f-bar-btn[data-armed]:hover { color: var(--identity-paper); }

    /* No desk, no strays: phones show apps only. */
    @media (max-width: 640px) {
      .trash-out { display: none; }
    }
  `;

  // The hardware sana threw out, by reference — their definitions live
  // in files.js and console.js (script order runs those first).
  const DISK = window.SystemFiles?.blockadeDisk;
  const BOOK = window.SystemFiles?.mikanBook;
  const DECK = window.SystemFiles?.eldraziDeck;
  const DECK2 = window.SystemFiles?.worldfireDeck;
  const EXE = window.SystemFiles?.setupExe;
  const INVOICE = window.SystemFiles?.invoiceApp;
  const CONSOLE = window.ConsoleApp?.item;

  // ---- the inventory --------------------------------------------------
  // A plain tree in the folder kit's item shape. kind: 'text' opens in
  // the viewer with a body; 'image' with a src; 'folder' drills in with
  // its own items; 'app' calls the door it points at. art names a kit
  // drawing; artFrom clones a desk icon instead.
  const ITEMS = [
    BOOK,
    DECK,
    DECK2,
    DISK,
    EXE,
    CONSOLE,
    // Two doors, both of them saying no, and the thing behind them is
    // the only file on this desk that does something to the desk.
    { name: 'do not open', kind: 'folder', art: 'folder', items: [
      { name: 'really, do not open', kind: 'folder', art: 'folder', items: [
        INVOICE,
      ] },
    ] },
  ].filter(Boolean);

  const boot = () => {
    const can = document.querySelector('.trash-can');
    const VI = window.VisualIdentity;
    const Folder = window.FolderKit;
    if (!can || !VI || !Folder) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    const trashedIcons = [];   // desk app icons filed into the can
    const strays = [];         // trash-born items standing on the desk
    const subWindows = new Map();   // desk folders open as their own windows

    // ---- opening an item, anywhere ------------------------------------
    // In a pane the kit handles taps itself; out on the desk the same
    // rules apply — a folder becomes its own folder window (made once,
    // reused), a file opens in the shared viewer, a shortcut opens its
    // app.
    const openItem = item => {
      if (item.kind === 'folder') {
        if (!subWindows.has(item)) {
          const sub = Folder.create({
            title: item.name,
            closeLabel: `Close ${item.name} window`,
            rootName: item.name,
            items: item.items,
            onDropOut: dropOut,
            onDropIn: (dropped, level) => slotHintFor(sub, dropped, level),
          });
          subWindows.set(item, sub);
        }
        subWindows.get(item).chrome.open();
      } else if (item.kind === 'app') {
        item.open?.();
      } else {
        Folder.open(item);
      }
    };

    // ---- dragging things out onto the desk ----------------------------
    // The same item at the room's scale: the kit's art unscaled in the
    // desk icons' shell, standing where it was dropped, dragging through
    // the desk surface like everything else. A trip back over the can
    // swallows it home without a dialog — it lives there.
    const deskify = (item, event, level) => {
      const at = level.items.indexOf(item);
      if (at !== -1) level.items.splice(at, 1);
      delete item.spot;   // a return trip earns a fresh slot from the flow

      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'trash-out draggable-item identity-pixel-color';
      element.dataset.trashItem = 'true';
      element.dataset.userMoved = 'true';
      element.innerHTML = `${Folder.art(item)}<span class="doc-label">${item.name}</span>`;
      element.style.left = `${VI.snap(Math.max(0, Math.min(event.clientX - 56, innerWidth - 112)))}px`;
      element.style.top = `${VI.snap(Math.max(0, Math.min(event.clientY - 80, innerHeight - 160)))}px`;
      document.body.appendChild(element);
      VI.deskSurface.attach(element, item);

      // taps open, the chrome's own click-vs-drag guard
      let pressX = 0;
      let pressY = 0;
      element.addEventListener('pointerdown', e => {
        pressX = e.clientX;
        pressY = e.clientY;
      });
      element.addEventListener('click', e => {
        if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > 4) return;
        openItem(item);
      });

      strays.push({ element, item });
    };

    // ---- the Trash's doors --------------------------------------------
    // The hardware modules reach the desk's strays through here: name
    // the item a desk element carries, TAKE it (the console's slot ate
    // the disk), and ask every showing of the inventory to redraw (an
    // item's art changed under it).
    window.TrashApp = {
      strayItem: element =>
        strays.find(stray => stray.element === element)?.item ?? null,
      takeStray: element => {
        const stray = strays.find(kept => kept.element === element);
        if (!stray) return null;
        strays.splice(strays.indexOf(stray), 1);
        stray.element.remove();
        return stray.item;
      },
      refresh: () => {
        strays.forEach(({ element, item }) => {
          element.innerHTML =
            `${Folder.art(item)}<span class="doc-label">${item.name}</span>`;
        });
        if (!folder.win.hidden) folder.render();
        subWindows.forEach(sub => {
          if (!sub.win.hidden) sub.render();
        });
      },
    };

    // The one thing a drawer refuses, it refuses for physics, not
    // permission: the slot reads nothing in the trash.
    const slotHintFor = (handle, item, level) => {
      if (!DISK || !CONSOLE) return;
      if (item !== DISK || CONSOLE.disk || !level.items.includes(CONSOLE)) return;
      if (!item.spot || !CONSOLE.spot) return;
      if (Math.abs(item.spot.x - CONSOLE.spot.x) < 96 &&
          Math.abs(item.spot.y - CONSOLE.spot.y) < 96) {
        handle.say("the slot won't read in here — open the console and feed it the disk.");
      }
    };

    // A drag that leaves any folder window: dropped on the CAN it goes
    // back into the top of the can (the can is the folder's own door,
    // never the desk); otherwise a trashed desk icon returns to the desk
    // as itself, right where it was dropped, and anything else steps out
    // at full scale.
    const dropOut = (item, event, level) => {
      if (VI.overTrashCan(event.clientX, event.clientY)) {
        const at = level.items.indexOf(item);
        if (at !== -1) level.items.splice(at, 1);
        delete item.spot;
        if (!ITEMS.includes(item)) ITEMS.push(item);
        if (!folder.win.hidden) folder.render();
        return;
      }
      const entry = trashedIcons.find(kept => kept.item === item);
      if (entry) {
        const at = level.items.indexOf(item);
        if (at !== -1) level.items.splice(at, 1);
        const icon = entry.icon;
        icon.hidden = false;
        icon.dataset.userMoved = 'true';
        icon.style.transform = 'none';
        const w = icon.offsetWidth;
        const h = icon.offsetHeight;
        icon.style.left = `${VI.snap(Math.max(0, Math.min(event.clientX - w / 2, innerWidth - w)))}px`;
        icon.style.top = `${VI.snap(Math.max(0, Math.min(event.clientY - h / 2, innerHeight - h)))}px`;
        icon.style.bottom = 'auto';
        trashedIcons.splice(trashedIcons.indexOf(entry), 1);
        return;
      }
      deskify(item, event, level);
    };

    // Emptying ASKS FIRST. Throwing a thing away is a drag you can see
    // coming; emptying the can is one click that takes everything, so
    // the button does not do it — it puts the question on the address
    // line, becomes the answer, and stands a way back beside itself.
    // Nothing leaves the can until the second click.
    const emptyBtn = document.createElement('button');
    emptyBtn.type = 'button';
    emptyBtn.textContent = 'empty trash';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'f-bar-btn';
    backBtn.textContent = 'cancel';
    backBtn.hidden = true;

    let armed = false;

    const disarm = () => {
      if (!armed) return;
      armed = false;
      backBtn.hidden = true;
      emptyBtn.textContent = 'empty trash';
      emptyBtn.removeAttribute('data-armed');
      folder.say(null);
      folder.render();          // the address line goes back to saying Trash
    };

    emptyBtn.addEventListener('click', () => {
      if (armed) {
        armed = false;
        backBtn.hidden = true;
        emptyBtn.textContent = 'empty trash';
        emptyBtn.removeAttribute('data-armed');
        ITEMS.splice(0);
        folder.say('emptied.');
        folder.home();
        return;
      }
      const held = ITEMS.length;   // what the bar counts, so the two agree
      if (!held) {
        folder.say('the trash is already empty.');
        return;
      }
      armed = true;
      backBtn.hidden = false;
      emptyBtn.textContent = 'empty';
      emptyBtn.dataset.armed = 'true';
      folder.say(`empty the trash? ${held} item${held === 1 ? '' : 's'} in it.`);
    });

    backBtn.addEventListener('click', disarm);

    const folder = Folder.create({
      className: 'trash-window',
      title: 'Trash',
      closeLabel: 'Close trash window',
      icon: can,
      rootName: 'Trash',
      items: ITEMS,
      barButton: emptyBtn,
      onDropOut: dropOut,
      onDropIn: (item, level) => slotHintFor(folder, item, level),
    });

    // Cancel stands to the LEFT of the answer, the way a desk puts the
    // way back before the way on. And a question only stands while
    // nothing else is going on: touch the pane, walk into a folder,
    // pick anything up, and it is withdrawn unanswered.
    folder.win.querySelector('.f-end').prepend(backBtn);
    folder.win.addEventListener('pointerdown', event => {
      if (!(event.target instanceof Element) || !event.target.closest('.f-end')) disarm();
    });
    folder.win.addEventListener('keydown', event => {
      if (event.key === 'Escape') disarm();
    });

    // ---- dropping on the can ------------------------------------------
    // The can is the window's second door, nothing more: anything
    // dropped on it is moved to the trash, no questions. A stray goes
    // home; an app icon files itself with no spot, so the flow deals it
    // a slot the next time the window shows.
    const DOORS = {
      'contacts-icon': () => window.ContactsApp?.open(),
      'chat-icon': () => window.ChatApp?.open(),
      'documentation-icon': () => window.PublicationsApp?.open(),
      'wallet-icon': () => window.WalletApp?.open(),
      'tv-icon': () => window.TVApp?.open(),
      'controls-icon': () => window.ControlPanelApp?.open(),
    };

    const swallow = icon => {
      if (icon.dataset.trashItem) {
        const entry = strays.find(stray => stray.element === icon);
        if (!entry) return;
        strays.splice(strays.indexOf(entry), 1);
        icon.remove();
        delete entry.item.spot;
        ITEMS.push(entry.item);
        if (!folder.win.hidden) folder.render();
        return;
      }

      const slug = [...icon.classList].find(cls => DOORS[cls]);
      if (!slug || icon.hidden) return;
      const label = icon.querySelector('.doc-label')?.textContent || 'this';
      icon.hidden = true;
      VI.alignToGrid();
      const item = { name: label, kind: 'app', artFrom: `.${slug}`, open: DOORS[slug] };
      ITEMS.push(item);
      trashedIcons.push({ icon, item });
      if (!folder.win.hidden) folder.render();
    };

    document.addEventListener('identity-trash-drop', event => swallow(event.detail.icon));

    // A desk icon dropped INTO a folder window files itself there —
    // the same move as the can, aimed at a particular drawer. Strays
    // simply go back to being items, in whichever folder caught them.
    document.addEventListener('identity-folder-drop', event => {
      const { icon, window: target, clientX, clientY } = event.detail;
      const dest = Folder.at(target);
      if (!dest) return;

      const stray = strays.find(kept => kept.element === icon);
      if (stray) {
        strays.splice(strays.indexOf(stray), 1);
        icon.remove();
        delete stray.item.spot;
        dest.drop(stray.item, clientX, clientY);
        return;
      }

      const slug = [...icon.classList].find(cls => DOORS[cls]);
      if (!slug || icon.hidden) return;
      const label = icon.querySelector('.doc-label')?.textContent || 'this';
      icon.hidden = true;
      VI.alignToGrid();
      const item = { name: label, kind: 'app', artFrom: `.${slug}`, open: DOORS[slug] };
      trashedIcons.push({ icon, item });
      dest.drop(item, clientX, clientY);
    });

    // An item may have been filed or moved into any depth of the tree —
    // the sweep has to find it wherever it ended up.
    const removeFromTree = (list, item) => {
      const at = list.indexOf(item);
      if (at !== -1) {
        list.splice(at, 1);
        return true;
      }
      return list.some(entry => entry.items && removeFromTree(entry.items, item));
    };

    // Whether an item still lives anywhere in the can's tree — the
    // sweep asks before giving the disk back (emptied stays emptied
    // until the recovery card's reboot).
    const inTree = (list, item) => list.includes(item) ||
      list.some(entry => entry.items && inTree(entry.items, item));

    // The play layer signs out with sana: windows close, strays sweep
    // back into the can, and — content never gates — every trashed desk
    // icon walks back to the desk, emptied or not. (The recovery card
    // only rides reboots; the sweep is the law's.) The console resets
    // itself — unplugs, closes, opens its slot — and hands back the
    // disk it frees; the Trash files it beside the console, wherever
    // the console ended up (emptied stays emptied).
    document.addEventListener('identity-user-change', event => {
      if (!event.detail.user) {
        disarm();
        trashedIcons.splice(0).forEach(({ icon, item }) => {
          icon.hidden = false;
          removeFromTree(ITEMS, item);
        });
        strays.splice(0).forEach(({ element, item }) => {
          element.remove();
          ITEMS.push(item);
        });
        const freed = window.ConsoleApp?.reset?.();
        if (freed && CONSOLE && inTree(ITEMS, CONSOLE)) {
          delete freed.spot;
          ITEMS.push(freed);
        }
        subWindows.forEach(sub => sub.close());
        VI.alignToGrid();
        folder.close();
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
