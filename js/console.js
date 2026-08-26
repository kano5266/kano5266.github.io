// console.js — the game console: a machine that happens to be in the
// trash, not a thing the trash owns. Opening it opens the CONSOLE — a
// window of the hardware itself, the way the TV window holds a whole
// set: the slot, the power switch, the LED, the vents, the pad on its
// cord, and the RF cable rooted at the machine's side.
//
// Everything is done BY HAND, in the recovery card's spirit — nothing
// asks, everything simply fits where it fits: carry a .dsk over the
// SLOT (it lights — the can's lid-lift signal, spoken by hardware —
// and the drop seats it), and carry the cable's free PLUG across the
// desk into the TV's antenna jack. The cable is a real cord: 8px
// cells laid along a sagging curve at floor level, so it drapes
// BEHIND the windows and shows in the gaps, pays out after the hand,
// re-drapes live as either window moves, and hangs slack off the
// window's edge while unplugged. Far windows pull it taut; near ones
// let it hang deep.
//
// Feature-module pattern: this file owns its CSS, DOM and behavior;
// the page supplies .mac-window chrome + VisualIdentity (carrying,
// windowUnder, the cancelable identity-window-drop offer). Cross-
// module doors: window.ConsoleApp = { item, open, reset }; consumes
// TVApp (jack, jackWilling, setFeed), TrashApp (takeStray, refresh),
// SystemFiles (the disk's identity; closing its window when the
// floppy goes into the machine).
(() => {
  const CSS = `
    /* ---- the machine's window ----------------------------------------
       Hardware, the way the TV window holds a set: surface tokens
       (physical objects), one true size, no grow box. The slot is
       REAL — it lights while the disk hovers, and a drop seats it. */
    .console-window .cw-scene {
      position: relative;
      width: 432px;
      height: 232px;
    }

    .console-window .cw-body {
      position: absolute;
      left: 72px;
      top: 32px;
      width: 280px;
      height: 72px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .console-window .cw-slot {
      position: absolute;
      left: 24px;
      top: -4px;
      width: 136px;
      height: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-deep);
    }

    .console-window .cw-slot.willing { background: var(--identity-primary); }

    .console-window .cw-disk {
      position: absolute;
      left: 24px;
      top: -28px;
      width: 80px;
      height: 44px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-soft);
    }

    .console-window .cw-disk::after {
      content: '';
      position: absolute;
      left: 8px;
      top: 8px;
      width: 56px;
      height: 8px;
      background: var(--identity-primary);
    }

    .console-window .cw-switch {
      position: absolute;
      left: 180px;
      top: 8px;
      width: 32px;
      height: 20px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .console-window .cw-switch::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 8px;
      height: 12px;
      background: var(--identity-tint-mid);
    }

    .console-window .cw-led {
      position: absolute;
      left: 228px;
      top: 12px;
      width: 8px;
      height: 8px;
      background: var(--identity-accent-pink);
    }

    .console-window .cw-vents {
      position: absolute;
      left: 248px;
      top: 8px;
      width: 24px;
      height: 24px;
      background: repeating-linear-gradient(
        to bottom,
        var(--identity-tint-mid) 0 4px,
        transparent 4px 8px
      );
    }

    .console-window .cw-cord {
      position: absolute;
      left: 160px;
      top: 112px;
      width: 8px;
      height: 32px;
      background: var(--identity-normal);
    }

    /* The RF out: the soft cable's root, on the machine's right side. */
    .console-window .cw-jack {
      position: absolute;
      right: -16px;
      top: 24px;
      width: 16px;
      height: 24px;
      background: var(--identity-normal);
    }

    .console-window .cw-pad {
      position: absolute;
      left: 136px;
      top: 144px;
      width: 160px;
      height: 64px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .console-window .cw-dv {
      position: absolute;
      left: 28px;
      top: 4px;
      width: 16px;
      height: 48px;
      background: var(--identity-normal);
    }

    .console-window .cw-dh {
      position: absolute;
      left: 12px;
      top: 20px;
      width: 48px;
      height: 16px;
      background: var(--identity-normal);
    }

    .console-window .cw-b,
    .console-window .cw-a {
      position: absolute;
      top: 20px;
      width: 16px;
      height: 16px;
      background: var(--identity-accent-pink);
    }

    .console-window .cw-b { left: 100px; }
    .console-window .cw-a { left: 124px; }

    /* ---- the soft cable ----------------------------------------------
       One cord, three surfaces: its stretch INSIDE the console window
       rides that window (above the paper — it leaves the MACHINE, not
       the frame), the stretch over open desk lies at floor level (z 2,
       behind every window, showing in the gaps), and the stretch
       inside the TV window rides the TV (the TVApp.feedLayer door).
       The free plug is the handle: parked hanging off the machine's RF
       stub, carried at the hand's z while dragged, seated on the
       antenna jack while plugged. */
    .rf-cable {
      position: fixed;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }

    /* Behind the machine, in front of the window's paper: the cord
       passes under the console's body the way it passes behind the
       set. The plug rides this layer, so it stays grabbable wherever
       the cord's end rests. */
    .console-window .cw-cable {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }

    /* The machine art sits above the cable's layer, but it is scenery,
       not controls — the slot is hit by geometry (windowUnder), never
       by its own events. So the scene lets the pointer fall THROUGH to
       the cord's plug resting on the layer beneath it; without this the
       transparent scene box swallows the plug's clicks and the cable
       cannot be grabbed. */
    .console-window .cw-scene {
      z-index: 1;
      pointer-events: none;
    }

    /* one cell of cord — the class is load-bearing: the plug lives on
       these same layers, so a redraw must sweep its own cells only */
    .rf-cell {
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--identity-normal);
    }

    /* The cable's head is the socket's mate: the same D-SUB, turned to
       face it — a shell with the D's flats stepped in top and bottom,
       a thumbscrew above and below, and the cord entering the back.
       The face stays solid: the socket carries the pins, the plug
       carries the shell, and two pin columns facing each other at
       this size read as noise. */
    .rf-plug {
      position: absolute;
      z-index: 2;
      width: 16px;
      height: 40px;
      padding: 0;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-mid);
      cursor: grab;
      touch-action: none;
      pointer-events: auto;
    }

    /* the D's flats — the nose steps in one cell at each end */
    .rf-plug::before,
    .rf-plug::after {
      content: '';
      position: absolute;
      right: -4px;
      width: 4px;
      height: 8px;
      background: var(--identity-normal);
    }

    .rf-plug::before { top: 0; }
    .rf-plug::after { bottom: 0; }

    /* the thumbscrews, above and below the shell */
    .rf-screw {
      position: absolute;
      left: -4px;
      width: 16px;
      height: 8px;
      background: var(--identity-tint-mid);
      border: 4px solid var(--identity-normal);
    }

    .rf-screw.t { top: -16px; }
    .rf-screw.b { bottom: -16px; }

    /* the cord entering the back */
    .rf-tail {
      position: absolute;
      left: -12px;
      top: 12px;
      width: 12px;
      height: 8px;
      background: var(--identity-normal);
    }

    .rf-plug.dragging {
      position: fixed;
      cursor: grabbing;
      z-index: 9990;
    }

    .rf-plug:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    @media (max-width: 640px) {
      .rf-plug,
      .rf-cable,
      .console-window .cw-cable { display: none; }
    }
  `;

  // The machine as an item — data the Trash may list; being a machine
  // is this file's business. `disk` rides on it while one is seated.
  const CONSOLE = { name: 'game console', kind: 'app', art: 'console',
    open: () => window.ConsoleApp?.open?.() };

  const boot = () => {
    const VI = window.VisualIdentity;
    const DISK = window.SystemFiles?.blockadeDisk;
    if (!VI || !DISK) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    // ---- the machine's window -----------------------------------------
    const win = document.createElement('section');
    win.className = 'mac-window console-window';
    win.dataset.resize = 'none';
    win.hidden = true;
    win.innerHTML = `
      <div class="mac-content">
        <div class="cw-scene">
          <div class="cw-body">
            <span class="cw-slot"><span class="cw-disk" hidden></span></span>
            <span class="cw-switch"></span>
            <span class="cw-led"></span>
            <span class="cw-vents"></span>
            <span class="cw-jack"></span>
          </div>
          <span class="cw-cord"></span>
          <div class="cw-pad">
            <span class="cw-dv"></span><span class="cw-dh"></span>
            <span class="cw-b"></span><span class="cw-a"></span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(win);
    const chrome = VI.attachWindowChrome(win, {
      title: 'Console',
      closeLabel: 'Close console window',
      onOpen: () => kickCable(),
    });
    const slotEl = win.querySelector('.cw-slot');
    const slotDisk = win.querySelector('.cw-disk');
    const jackEl = win.querySelector('.cw-jack');

    const renderWindow = () => {
      slotDisk.hidden = !CONSOLE.disk;
      slotEl.classList.remove('willing');
    };

    // ---- the soft cable -----------------------------------------------
    const CABLE_LENGTH = 480;
    const floorLayer = document.createElement('div');
    floorLayer.className = 'rf-cable';
    floorLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(floorLayer);
    const winLayer = document.createElement('div');
    winLayer.className = 'cw-cable';
    winLayer.setAttribute('aria-hidden', 'true');
    win.appendChild(winLayer);
    const plug = document.createElement('button');
    plug.type = 'button';
    plug.className = 'rf-plug';
    plug.setAttribute('aria-label', 'RF plug — drag it to the TV');
    plug.innerHTML =
      '<span class="rf-screw t"></span><span class="rf-screw b"></span>' +
      '<span class="rf-tail"></span>';
    plug.hidden = true;
    winLayer.appendChild(plug);

    let plugged = false;
    let plugHand = null;     // {x, y} while the hand carries the plug
    let cableFrame = null;

    const setPlugged = on => {
      plugged = Boolean(on);
      window.TVApp?.setFeed?.({ connected: plugged, loaded: Boolean(CONSOLE.disk) });
    };

    const rootPoint = () => {
      const rect = jackEl.getBoundingClientRect();
      return { x: rect.right - 4, y: rect.top + rect.height / 2 };
    };

    // The curve, dealt onto its three surfaces: cells over the console
    // window ride the window (the cord leaves the MACHINE, over the
    // paper), cells over the TV window ride the TV (in through the
    // frame, up to the jack), and the rest lie on the floor between —
    // behind every window, the way a cable runs behind the papers on a
    // desk. Every cell is viewport-snapped to the 8px grid first, so
    // the strand stays continuous across the seams.
    const paint = (host, cells) => {
      host.querySelectorAll(':scope > .rf-cell').forEach(cell => cell.remove());
      if (cells.length) host.insertAdjacentHTML('afterbegin', cells.join(''));
    };

    // Every surface put away at once — the cord is gone, the plug
    // (which lives on one of them) is not destroyed with it.
    const clearCable = feedEl => {
      paint(floorLayer, []);
      paint(winLayer, []);
      if (feedEl) paint(feedEl, []);
    };

    const drawCable = (from, to, feedEl) => {
      const d = Math.hypot(to.x - from.x, to.y - from.y);
      const slack = Math.max(24, Math.min(176, 24 + (CABLE_LENGTH - d) * 0.4));
      const midX = (from.x + to.x) / 2;
      const midY = Math.min((from.y + to.y) / 2 + slack, innerHeight - 24);
      const seen = new Set();
      const winRect = winLayer.getBoundingClientRect();
      const feedRect = feedEl ? feedEl.getBoundingClientRect() : null;
      const floor = [];
      const local = [];
      const remote = [];
      const steps = Math.max(32, Math.ceil(d / 2) + 32);
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const a = 1 - t;
        const x = a * a * from.x + 2 * a * t * midX + t * t * to.x;
        const y = a * a * from.y + 2 * a * t * midY + t * t * to.y;
        const cx = Math.floor(x / 8) * 8;
        const cy = Math.floor(y / 8) * 8;
        const key = cx + ',' + cy;
        if (seen.has(key)) continue;
        seen.add(key);
        const mx = cx + 4;
        const my = cy + 4;
        const cell = (x0, y0) => `<span class="rf-cell" style="left:${x0}px;top:${y0}px"></span>`;
        if (mx >= winRect.left && mx < winRect.right && my >= winRect.top && my < winRect.bottom) {
          local.push(cell(cx - winRect.left, cy - winRect.top));
        } else if (feedRect && mx >= feedRect.left && mx < feedRect.right &&
            my >= feedRect.top && my < feedRect.bottom) {
          remote.push(cell(cx - feedRect.left, cy - feedRect.top));
        } else {
          floor.push(cell(cx, cy));
        }
      }
      // Sweep only the cord's own cells: the plug rides these layers
      // too, and it keeps its screws and its tail.
      paint(floorLayer, floor);
      paint(winLayer, local);
      if (feedEl) paint(feedEl, remote);
    };

    // The plug's own measurements. The cord does not end wherever the
    // plug happens to be — it ends at the plug's TAIL, the stub on its
    // back, mid-height: that is where a cable actually meets its
    // connector. So the plug's box is the anchor and the cord's
    // terminus is derived from it (the tail reaches 8px past the
    // border box, being 12px past the padding edge).
    const PLUG_W = 16;
    const PLUG_H = 40;
    const TAIL_OUT = 8;
    const snap4 = value => Math.round(value / 4) * 4;
    const cordTip = box => ({ x: box.left - TAIL_OUT, y: box.top + PLUG_H / 2 });

    // The plug sits at its box — as a CHILD of the surface that holds
    // the cord's end, so it stacks honestly: on the machine's side
    // while parked, in the hand (above everything) while dragged, on
    // the antenna socket while plugged.
    const seatPlug = (mode, box, feedEl) => {
      plug.classList.toggle('dragging', mode === 'hand');
      const host = mode === 'hand' ? document.body
        : mode === 'tv' && feedEl ? feedEl : winLayer;
      if (plug.parentElement !== host) host.appendChild(plug);
      const base = mode === 'hand' ? { left: 0, top: 0 } : host.getBoundingClientRect();
      plug.style.left = `${box.left - base.left}px`;
      plug.style.top = `${box.top - base.top}px`;
      plug.hidden = false;
    };

    // One frame of the cable: while the machine's window stands open
    // the cord exists — parked, in hand, or plugged — and follows
    // whatever moves. The loop runs only then, and puts everything
    // away when the window goes.
    const cableTick = () => {
      cableFrame = null;
      const feedEl = window.TVApp?.feedLayer?.() || null;
      if (win.hidden) {
        clearCable(feedEl);
        plug.hidden = true;
        plugHand = null;
        if (plugged) setPlugged(false);
        window.TVApp?.jackWilling?.(false);
        return;
      }
      const root = rootPoint();
      let box = null;
      let mode = 'win';
      if (plugHand) {
        // in the hand: the pointer holds the shell, the tail trails it
        mode = 'hand';
        box = { left: snap4(plugHand.x - PLUG_W / 2), top: snap4(plugHand.y - PLUG_H / 2) };
      } else if (plugged) {
        const jack = window.TVApp?.jack?.();
        if (jack) {
          // MATED: the shell takes the socket's own footprint, nose
          // against the cabinet's flank (the socket hides behind it,
          // as a real port does) — so the connector stays inside the
          // set's window instead of hanging off its edge.
          mode = 'tv';
          box = {
            left: jack.rect.left,
            top: jack.rect.top + (jack.rect.height - PLUG_H) / 2,
          };
        } else {
          setPlugged(false);   // the set left; the plug fell out
        }
      }
      if (!box) {
        // parked: hanging off the machine's RF stub, a little slack
        mode = 'win';
        box = { left: snap4(root.x + 32), top: snap4(root.y + 44) };
      }
      drawCable(root, cordTip(box), feedEl);
      seatPlug(mode, box, feedEl);
      cableFrame = requestAnimationFrame(cableTick);
    };

    const kickCable = () => {
      if (!cableFrame) cableTick();
    };

    // The plug in the hand: no grid-walk, no verdicts — a cord end
    // follows fingers. Dropped on the TV's antenna jack (stacking-
    // honest, with the jack lit while hovered), it plugs; anywhere
    // else it falls back to dangling.
    const overJack = (jack, x, y) => Boolean(jack) &&
      x >= jack.rect.left - 16 && x <= jack.rect.right + 16 &&
      y >= jack.rect.top - 16 && y <= jack.rect.bottom + 16;

    const jackUnderHand = (x, y) => {
      const jack = window.TVApp?.jack?.();
      return jack && overJack(jack, x, y) &&
        VI.windowUnder(x, y, plug)?.classList.contains('tv-window') ? jack : null;
    };

    // A fast hand outruns a 24px plug between two move events — the
    // desk icons met this first, and their surface's lesson applies
    // with one amendment: capture is only an enhancement (and
    // reparenting the plug mid-drag silently DROPS it), so while the
    // cord is in the hand the drag listens at the DOCUMENT, which
    // hears every move no matter what the pointer is over or where
    // the plug currently lives. Window blur abandons the drag, like
    // every carry here.
    let plugPointer = null;

    const releasePlug = event => {
      if (!plugHand) return;
      const at = plugHand;
      plugHand = null;
      plug.classList.remove('dragging');
      window.TVApp?.jackWilling?.(false);
      window.TVApp?.jackShow?.(false);   // the port hides again
      if (event && !win.hidden && jackUnderHand(at.x, at.y)) {
        setPlugged(true);
      }
      kickCable();
    };

    const plugMove = event => {
      if (event.pointerId !== plugPointer) return;
      plugHand = { x: event.clientX, y: event.clientY };
      window.TVApp?.jackWilling?.(Boolean(jackUnderHand(event.clientX, event.clientY)));
    };

    const endPlugDrag = event => {
      if (plugPointer === null) return;
      plugPointer = null;
      removeEventListener('pointermove', plugMove);
      removeEventListener('pointerup', plugUp);
      removeEventListener('pointercancel', plugCancel);
      releasePlug(event);
    };

    const plugUp = event => {
      if (event.pointerId === plugPointer) endPlugDrag(event);
    };

    const plugCancel = event => {
      if (event.pointerId === plugPointer) endPlugDrag(null);
    };

    plug.addEventListener('pointerdown', event => {
      if (plugPointer !== null) return;
      event.preventDefault();
      try { plug.setPointerCapture?.(event.pointerId); } catch { /* uncapturable */ }
      plugPointer = event.pointerId;
      plugHand = { x: event.clientX, y: event.clientY };
      plug.classList.add('dragging');
      window.TVApp?.jackShow?.(true);   // the TV's port reveals its target
      if (plugged) setPlugged(false);   // yanked out to travel
      addEventListener('pointermove', plugMove);
      addEventListener('pointerup', plugUp);
      addEventListener('pointercancel', plugCancel);
      kickCable();
    });
    addEventListener('blur', () => endPlugDrag(null));

    // ---- the slot -----------------------------------------------------
    // The disk seats in the slot: the same console item, one drawing
    // further — refreshed wherever that console is showing. The floppy
    // is in the machine now, so its own window closes; a live feed
    // re-announces with the game on the line.
    const loadDisk = () => {
      CONSOLE.disk = DISK;
      CONSOLE.art = 'console-loaded';
      window.TrashApp?.refresh?.();
      renderWindow();
      window.SystemFiles?.closeDisk?.();
      if (plugged) setPlugged(true);
    };

    // Window drops (identity-window-drop, cancelable): the disk into
    // the slot. A drop anywhere else on this window goes unclaimed and
    // walks home like any illegal place.
    const overSlot = (rect, x, y) => Boolean(rect) &&
      x >= rect.left - 8 && x <= rect.right + 8 &&
      y >= rect.top - 8 && y <= rect.bottom + 8;

    document.addEventListener('identity-window-drop', event => {
      const { icon, item, window: target, clientX, clientY } = event.detail;
      const dropped = item || (icon && window.TrashApp?.strayItem?.(icon));
      if (dropped !== DISK || CONSOLE.disk) return;
      if (target === win &&
          overSlot(slotEl.getBoundingClientRect(), clientX, clientY)) {
        event.preventDefault();
        if (!item && icon) window.TrashApp?.takeStray?.(icon);
        loadDisk();
      }
    });

    // The slot lights while the disk hovers it. VisualIdentity.carrying
    // names what is in the hand, so the mouth only opens for its own
    // disk; and the glow is as stacking-honest as the drop (a covered
    // slot stays dark).
    document.addEventListener('pointermove', event => {
      if (win.hidden) return;
      const diskInHand = VI.carrying === DISK && !CONSOLE.disk;
      if (!diskInHand) {
        slotEl.classList.remove('willing');
        return;
      }
      const carried = document.querySelector('.dragging');
      const under = VI.windowUnder(event.clientX, event.clientY, carried);
      slotEl.classList.toggle('willing', under === win &&
        overSlot(slotEl.getBoundingClientRect(), event.clientX, event.clientY));
    });
    document.addEventListener('pointerup', () => {
      slotEl.classList.remove('willing');
    });

    // ---- the doors ------------------------------------------------------
    // reset() is the sweep's: unplug, close, open the slot — and hand
    // back the freed disk item (or null) so the caller can decide where
    // it lands. The machine keeps no opinion about folders.
    window.ConsoleApp = {
      item: CONSOLE,
      open: () => {
        renderWindow();
        chrome.open();
      },
      reset: () => {
        setPlugged(false);
        plugHand = null;
        clearCable(window.TVApp?.feedLayer?.());
        winLayer.appendChild(plug);   // the cord's end comes home
        plug.classList.remove('dragging');
        plug.hidden = true;
        window.TVApp?.jackWilling?.(false);
        window.TVApp?.jackShow?.(false);
        chrome.close();
        if (!CONSOLE.disk) return null;
        const freed = CONSOLE.disk;
        delete CONSOLE.disk;
        CONSOLE.art = 'console';
        renderWindow();
        return freed;
      },
    };
  };

  // The item must exist before trash.js builds its inventory (script
  // order runs this file first); the window can wait for boot.
  window.ConsoleApp = { item: CONSOLE };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
