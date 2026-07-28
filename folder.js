// folder.js — the folder window kit. A folder is the desk at half
// scale: the same items with the same behaviours, on a 4px grid where
// the desk uses 8 — one is the room, the other is a drawer inside it.
//
// The kit owns everything a folder window is:
//   - the window and its info bar (address on the left with the way
//     back, count in the middle, an owner's button on the right);
//   - the pane the items live on — a little desk, mannered like the
//     classic folder window: items are ARRANGED ONCE on first showing
//     (the desk's greedy centred rows, halved) and hold those fixed
//     spots forever after — resizing clips and scrolls, never
//     re-arranges — and they DRAG through the shared physics
//     (VisualIdentity.makeDragSurface, unit 4) as a CARRY: the lifted
//     item leaves the pane and floats above every window at the scale
//     of where it points, half over its folder and desk scale
//     elsewhere. Three drop verdicts, the OS's: in this window it
//     takes the spot; on the bare desk it leaves through onDropOut;
//     anywhere illegal (another window) it walks home (item.spot,
//     kept on the data because the elements re-render, is unchanged);
//   - what a tap opens: folders drill in place, text and images open
//     in the one shared viewer window, app shortcuts open their app;
//   - the glyph language: the desk's own 112x136 8px-cell drawings at
//     scale 0.5 — cells land on exact 4px, lossless because the art is
//     solid DOM rects. Shortcuts clone the live desk icon's spans, so
//     an icon is the same drawing at either scale. Labels are the one
//     licensed deviation: half of 24px would be 12, below the pixel
//     fonts' 16px crisp floor, so they wear chrome-size 16 instead.
//
// An owner — the Trash is one — supplies the items and may add a bar
// button and two verdicts: onDropOut(item, event, level) for drags
// that leave the window onto the bare desk (the owner splices the item
// out if it takes it), and onDropIn(item, level) after any item lands
// in the pane — a landing report, not a veto (the Trash uses it to
// mutter when the disk is dropped on the console in a drawer).
// Cross-module door: window.FolderKit.create. Feature-module pattern
// otherwise: this file owns its CSS, DOM and behavior; the page
// supplies .mac-window chrome + VisualIdentity.
(() => {
  const UNIT = 4;       // the desk's 8, halved
  const GAP = 24;       // the desk's 48 icon gap, halved (columns)
  const VGAP = 16;      // rows sit tight — with 12px label lines a
                        // two-line name fills the shell exactly (68 + 4
                        // + 24) and every row keeps at least 16px of air
  const ITEM_W = 96;    // item shell: glyph row + label lines
  const ITEM_H = 96;    // 68 glyph + 4 gap + 24 label

  const CSS = `
    .folder-window { min-width: 512px; }

    /* The info bar, the classic folder window's: fixed under the title
       bar (the content scrolls beneath it), the address on the left —
       back button, then the current folder's name — the count in the
       middle, and the owner's button, if any, on the right. Chrome-size
       text, a 4px rule below, like the original. */
    .folder-window .f-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 24px;
      border-bottom: 4px solid var(--identity-normal);
      font-size: 16px;
      line-height: 24px;
      color: var(--identity-gray);
    }

    /* The address doubles as the owner's status line (folder.say);
       the next render puts the name back. Address and end slots grow
       evenly, so the count sits centered between them. */
    .folder-window .f-address {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      min-width: 0;
    }

    .folder-window .f-end {
      flex: 1 1 0;
      display: flex;
      justify-content: flex-end;
    }

    .folder-window .f-bar-btn {
      padding: 0 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      font-size: 16px;
      line-height: 24px;
      cursor: pointer;
    }

    .folder-window .f-bar-btn:hover { color: var(--identity-primary-ink); }

    .folder-window .f-bar-btn:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* The pane: a little desk. Items sit absolute on the 4px grid —
       flowed rows for the untouched, remembered spots for the moved. */
    .folder-window .f-pane {
      position: relative;
      min-height: 192px;
    }

    .folder-window .f-item {
      position: absolute;
      width: ${ITEM_W}px;
      height: ${ITEM_H}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--identity-normal);
      cursor: grab;
      touch-action: none;
    }

    .folder-window .f-item.dragging { cursor: grabbing; }

    /* The carry: a lifted item leaves the pane (fixed — so the pane
       never grows a scrollbar while something is in hand) and rides
       above every window, still under the transition overlay. Its
       scale is written per move: half over its own folder, doubled to
       desk scale elsewhere — scale(2) of half-cells is exact. */
    .folder-window .f-item.f-carry {
      position: fixed;
      z-index: 9990;
      margin: 0;
      transform-origin: top left;
    }

    .folder-window .f-item:hover { color: var(--identity-primary-ink); }

    .folder-window .f-item:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* Size and leading come from the page's .px-wrap-16 law — wrapped
       Enter Command must sit on same-size line boxes or it reads gappy. */
    .folder-window .f-label {
      text-align: center;
      overflow-wrap: anywhere;
      max-width: ${ITEM_W}px;
    }

    /* Glyphs: the desk's drawings, half scale, lossless. Ink rides
       currentColor so a hovered item glows whole. */
    .folder-window .f-glyph {
      position: relative;
      flex: none;   /* a wrapped label must overflow the shell downward,
                       never squeeze the slot — the label line is fixed */
      width: 56px;
      height: 68px;
    }

    .folder-window .f-art {
      position: absolute;
      left: 0;
      top: 0;
      width: 112px;
      height: 136px;
      transform: scale(0.5);
      transform-origin: top left;
    }

    /* Tones are context-free — the same art renders at desk scale when an
       item is dragged out of a folder onto the desk, so these bind to no
       window. */
    .f-px-ink { background: currentColor; }
    .f-px-paper { background: var(--identity-paper); }
    .f-px-soft { background: var(--identity-tint-soft); }
    .f-px-mid { background: var(--identity-tint-mid); }
    .f-px-deep { background: var(--identity-tint-deep); }
    .f-px-primary { background: var(--identity-primary); }
    .f-px-shadow { background: var(--identity-tint-shadow); }

    /* The viewer: one small window, shared by every folder, retitled
       per file. */
    .folder-view-window .f-view { min-width: 288px; }

    .folder-view-window .f-text {
      white-space: pre-line;
      margin: 0;
      font: inherit;
    }

    .folder-view-window .f-view img {
      display: block;
      width: 144px;
      height: 144px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
  `;

  let cssInstalled = false;
  const ensureCSS = () => {
    if (cssInstalled) return;
    cssInstalled = true;
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  };

  // ---- item art: [x, y, w, h, tone] on the desk icons' 8px grid, in
  // their 112x136 canvas, to their conventions (ink outline on
  // currentColor, paper fills, tint-soft inner shading, one primary or
  // tint accent, the family shadow one cell down-right). Rendered at 0.5.
  const ART = {
    // A returned draft: the Publications page's silhouette — same paper,
    // fold ramp and shading, sibling by design — but no primary heading
    // (the heading did not survive review) and one line broken mid-way.
    draft: [
      [16, 128, 88, 8, 'shadow'], [104, 32, 8, 104, 'shadow'],
      [16, 8, 64, 8, 'paper'], [16, 16, 80, 104, 'paper'],
      [16, 112, 80, 8, 'soft'], [88, 32, 8, 88, 'soft'],
      [72, 8, 8, 8, 'mid'], [72, 16, 16, 8, 'mid'], [72, 24, 24, 8, 'deep'],
      [8, 0, 8, 128, 'ink'], [8, 0, 72, 8, 'ink'],
      [80, 8, 8, 8, 'ink'], [88, 16, 8, 8, 'ink'], [96, 24, 8, 8, 'ink'],
      [96, 32, 8, 88, 'ink'], [8, 120, 96, 8, 'ink'],
      [24, 40, 64, 8, 'ink'], [24, 56, 56, 8, 'ink'],
      [24, 72, 16, 8, 'ink'], [48, 72, 24, 8, 'ink'],
      [24, 88, 32, 8, 'ink'],
    ],
    // A manila folder, geometry transcribed from a drawn mockup (change
    // it only against a new drawing): a flat TAB — one line of primary,
    // the folder's one accent, its ink side stepping one cell OUT at
    // the base — standing on the back panel's rim, a full-width line of
    // its own; then an OPEN slit of transparent interior between rim
    // and front flap (the family's unfilled-body convention: the desk
    // shows through the folder's mouth). The upper-right corner is
    // CUT, twice, in echo: the rim stops a cell short of the wall,
    // whose top rises only to the slit row — one diagonal step — and
    // the flap's edge stops a cell shorter still, its own corner cell
    // joining the wall a row lower — the second. The slit is bounded,
    // not bleeding out the side; the tab's outward step is the same
    // move mirrored. The L of inner shade toward the right wall and
    // the foot, and the family shadows, are the transcription's one
    // refinement.
    // 13 cells wide — the canvas's full 14 minus only the column the
    // shadow law needs. The drawing compresses 16 -> 13 in width and
    // nothing else: every row of the mockup keeps its own row.
    folder: [
      [104, 56, 8, 72, 'shadow'], [8, 120, 104, 8, 'shadow'],
      [0, 24, 40, 8, 'ink'],
      [0, 32, 8, 80, 'ink'],
      [8, 32, 32, 8, 'primary'],
      [40, 32, 8, 8, 'ink'],
      [0, 40, 96, 8, 'ink'],
      [96, 48, 8, 64, 'ink'],
      [0, 56, 88, 8, 'ink'],
      [8, 64, 88, 48, 'soft'],
      [88, 64, 8, 8, 'ink'],
      [88, 72, 8, 32, 'mid'],
      [8, 104, 88, 8, 'mid'],
      [0, 112, 104, 8, 'ink'],
    ],
    // An instant photo, landscape at print proportions: the image
    // window between the frame's walls is 88x56 — a 3:2 film frame on
    // its side — with the caption chin below. Sun in primary, stepped
    // mountains off the horizon line.
    photo: [
      [104, 48, 8, 88, 'shadow'], [8, 128, 104, 8, 'shadow'],
      [0, 40, 104, 8, 'ink'],
      [0, 48, 8, 72, 'ink'], [96, 48, 8, 72, 'ink'],
      [8, 48, 88, 48, 'soft'],
      [72, 56, 16, 16, 'primary'],
      [32, 72, 8, 8, 'ink'], [24, 80, 24, 8, 'ink'], [16, 88, 40, 8, 'ink'],
      [8, 96, 88, 8, 'mid'],
      [8, 104, 88, 16, 'paper'],
      [16, 112, 32, 8, 'mid'],
      [0, 120, 104, 8, 'ink'],
    ],
    // A game disk: the 3.5" square — clipped top-right corner, metal
    // shutter with its slit up top, and the label low, its title
    // stripe the one primary accent.
    disk: [
      [96, 40, 8, 88, 'shadow'], [16, 120, 88, 8, 'shadow'],
      [8, 32, 72, 8, 'ink'],
      [80, 40, 8, 8, 'ink'],
      [8, 40, 8, 72, 'ink'],
      [88, 48, 8, 64, 'ink'],
      [8, 112, 88, 8, 'ink'],
      [16, 40, 8, 16, 'soft'],
      [24, 40, 32, 16, 'mid'],
      [56, 40, 8, 16, 'ink'],
      [64, 40, 16, 16, 'mid'],
      [80, 48, 8, 8, 'soft'],
      [16, 56, 72, 16, 'soft'],
      [24, 72, 56, 8, 'primary'],
      [24, 80, 56, 24, 'paper'],
      [16, 72, 8, 32, 'soft'],
      [80, 72, 8, 32, 'soft'],
      [16, 104, 72, 8, 'soft'],
    ],
    // A book: a 文庫本 stood on end, its spine on the RIGHT where a
    // Japanese binding carries it, a title band and an author rule on
    // the cover — and a RIBBON poking up out of the pages by the
    // binding, which is the whole point of the drawing: a bookmark is
    // what a re-read book has and a shelved one does not. The ribbon
    // takes the icon's one primary accent for the same reason.
    book: [
      [104, 24, 8, 104, 'shadow'], [16, 128, 88, 8, 'shadow'],
      [8, 16, 96, 8, 'ink'], [8, 120, 96, 8, 'ink'],
      [8, 24, 8, 96, 'ink'], [96, 24, 8, 96, 'ink'],
      [16, 24, 56, 96, 'soft'],
      [16, 24, 8, 96, 'paper'],
      [16, 40, 8, 8, 'mid'], [16, 64, 8, 8, 'mid'], [16, 88, 8, 8, 'mid'],
      [72, 24, 8, 96, 'ink'],
      [80, 24, 16, 96, 'deep'],
      [80, 40, 16, 8, 'mid'], [80, 96, 16, 8, 'mid'],
      [32, 40, 32, 8, 'deep'], [32, 56, 24, 8, 'mid'],
      [32, 8, 8, 24, 'primary'],
    ],
    // A stranger's executable, which this desk cannot run — so the app
    // window wears the mark the system stamps on anything it refuses to
    // open: the SLASHED CIRCLE, drawn as a disc on the icons' own grid.
    // A paper halo one cell proud of the ring holds it clear of the art
    // beneath, the ring is two cells thick so it survives desk scale,
    // and the bar crosses on the 45 the grid allows — one cell per row,
    // two cells wide, ink like the ring.
    exe: [
      [96, 24, 8, 88, 'shadow'], [16, 112, 80, 8, 'shadow'],
      [8, 16, 88, 8, 'ink'], [8, 104, 88, 8, 'ink'],
      [8, 24, 8, 80, 'ink'], [88, 24, 8, 80, 'ink'],
      [16, 24, 72, 80, 'paper'],
      [16, 24, 72, 16, 'mid'], [16, 40, 72, 8, 'ink'],
      [24, 24, 8, 8, 'primary'],
      [24, 56, 48, 8, 'deep'], [24, 72, 32, 8, 'mid'],
      [56, 32, 32, 8, 'paper'], [40, 40, 64, 8, 'paper'],
      [32, 48, 80, 8, 'paper'], [32, 56, 80, 8, 'paper'],
      [24, 64, 96, 8, 'paper'], [24, 72, 96, 8, 'paper'],
      [24, 80, 96, 8, 'paper'], [24, 88, 96, 8, 'paper'],
      [32, 96, 80, 8, 'paper'], [32, 104, 80, 8, 'paper'],
      [40, 112, 64, 8, 'paper'], [56, 120, 32, 8, 'paper'],
      [56, 56, 24, 8, 'paper'], [48, 64, 24, 8, 'paper'],
      [48, 72, 16, 8, 'paper'], [88, 72, 8, 8, 'paper'],
      [48, 80, 8, 8, 'paper'], [80, 80, 16, 8, 'paper'],
      [72, 88, 24, 8, 'paper'], [64, 96, 24, 8, 'paper'],
      [56, 40, 32, 8, 'ink'], [40, 48, 64, 8, 'ink'],
      [40, 56, 16, 8, 'ink'], [80, 56, 24, 8, 'ink'],
      [32, 64, 16, 8, 'ink'], [72, 64, 40, 8, 'ink'],
      [32, 72, 16, 8, 'ink'], [64, 72, 24, 8, 'ink'], [96, 72, 16, 8, 'ink'],
      [32, 80, 16, 8, 'ink'], [56, 80, 24, 8, 'ink'], [96, 80, 16, 8, 'ink'],
      [32, 88, 40, 8, 'ink'], [96, 88, 16, 8, 'ink'],
      [40, 96, 24, 8, 'ink'], [88, 96, 16, 8, 'ink'],
      [40, 104, 64, 8, 'ink'], [56, 112, 32, 8, 'ink'],
    ],
    // The game console: the CONTROLLER, whole and alone. The machine's
    // body has its own window now (console.js draws the deck, slot and
    // cable there), so the icon keeps only the part a hand knows — and
    // only three things, each big enough to survive 4px cells: the
    // body at the canvas's full 13 cells, the ink D-PAD CROSS on the
    // left, and TWO ACTION BUTTONS on the right, a full 2x2 cells
    // each with a cell of air between them and a cell before the
    // wall. No cord, no select-and-start: at this size the small
    // parts were four grey specks, and specks are what stopped it
    // reading as a controller.
    console: [
      [104, 56, 8, 72, 'shadow'], [8, 120, 104, 8, 'shadow'],
      [0, 48, 104, 8, 'ink'],
      [0, 56, 8, 56, 'ink'], [96, 56, 8, 56, 'ink'],
      [8, 56, 88, 56, 'soft'],
      [8, 104, 88, 8, 'mid'],
      [0, 112, 104, 8, 'ink'],
      [16, 72, 8, 8, 'ink'], [8, 80, 24, 8, 'ink'], [16, 88, 8, 8, 'ink'],
      [48, 80, 16, 16, 'deep'], [72, 80, 16, 16, 'deep'],
    ],
    // The same controller with a game in the machine: the two action
    // buttons come alive in primary. Nothing else moves — the disk
    // itself shows in the console's own window, seated in the slot;
    // out here it is only the difference between a pad that will do
    // something and one that will not.
    'console-loaded': [
      [104, 56, 8, 72, 'shadow'], [8, 120, 104, 8, 'shadow'],
      [0, 48, 104, 8, 'ink'],
      [0, 56, 8, 56, 'ink'], [96, 56, 8, 56, 'ink'],
      [8, 56, 88, 56, 'soft'],
      [8, 104, 88, 8, 'mid'],
      [0, 112, 104, 8, 'ink'],
      [16, 72, 8, 8, 'ink'], [8, 80, 24, 8, 'ink'], [16, 88, 8, 8, 'ink'],
      [48, 80, 16, 16, 'primary'], [72, 80, 16, 16, 'primary'],
    ],
  };

  // A shortcut wears the app's own desk icon: the live spans, cloned —
  // exactly the same drawing at either scale.
  const cloneGlyph = selector =>
    [...document.querySelectorAll(`${selector} .doc-px`)]
      .map(px => px.outerHTML).join('');

  const artGlyph = cells => cells
    .map(([x, y, w, h, tone]) =>
      `<span class="doc-px f-px-${tone}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></span>`)
    .join('');

  // Drawings end at different heights inside their shared canvas (a
  // folder's foot above a page's), so each art rides down until its
  // last row sits on the slot's floor — icons in a row BOTTOM-ALIGN,
  // standing on one line right above the labels, and every label
  // starts at the same top line below: the classic folder read.
  // Computed style, not layout: a cloned desk icon may be hidden
  // (moved to the trash) and still must measure.
  const artBottom = item => {
    if (item.artFrom) {
      let max = 0;
      document.querySelectorAll(`${item.artFrom} .doc-px`).forEach(px => {
        const style = getComputedStyle(px);
        max = Math.max(max, (parseInt(style.top, 10) || 0) + (parseInt(style.height, 10) || 0));
      });
      return max || 136;
    }
    return ART[item.art].reduce((max, cell) => Math.max(max, cell[1] + cell[3]), 0);
  };

  const glyph = item => `<span class="f-glyph" aria-hidden="true"><span class="f-art"
    style="top:${(136 - artBottom(item)) / 2}px">${
    item.artFrom ? cloneGlyph(item.artFrom) : artGlyph(ART[item.art])}</span></span>`;

  // Every folder window registers here, so a drop from anywhere — the
  // desk, another folder — can be filed into it by its window element.
  const REGISTRY = new WeakMap();

  // ---- the shared viewer ---------------------------------------------
  // Built on first use (after the page's boot pass, so it fits its own
  // grips), which also keeps its Escape handler behind every folder's:
  // a folder closes the viewer first and itself second.
  let viewer = null;
  let viewerChrome = null;
  let viewerTitle = null;
  let viewerBody = null;

  const ensureViewer = VI => {
    if (viewer) return;
    viewer = document.createElement('section');
    viewer.className = 'mac-window folder-view-window';
    viewer.hidden = true;
    viewer.innerHTML = `
      <div class="mac-content">
        <div class="f-view"></div>
      </div>`;
    document.body.appendChild(viewer);
    viewerChrome = VI.attachWindowChrome(viewer, {
      title: 'File',
      closeLabel: 'Close file window',
    });
    viewerTitle = viewer.querySelector('.mac-title');
    viewerBody = viewer.querySelector('.f-view');
    VI.makeResizable?.(viewer);
  };

  const openFile = (VI, item) => {
    ensureViewer(VI);
    viewerTitle.textContent = item.name;
    if (item.kind === 'image') {
      viewerBody.innerHTML = `<img src="${item.src}" alt="${item.name}" draggable="false" />`;
    } else {
      viewerBody.innerHTML = '<p class="f-text"></p>';
      viewerBody.querySelector('.f-text').textContent = item.body;
    }
    viewerChrome.open();
  };

  // ---- the folder window ---------------------------------------------
  const create = options => {
    const VI = window.VisualIdentity;
    ensureCSS();

    const win = document.createElement('section');
    win.className = `mac-window folder-window ${options.className || ''}`.trim();
    win.hidden = true;
    win.innerHTML = `
      <div class="f-bar">
        <span class="f-address">
          <button class="f-back f-bar-btn" type="button" hidden>back</button>
          <span class="f-where" aria-live="polite"></span>
        </span>
        <span class="f-count"></span>
        <span class="f-end"></span>
      </div>
      <div class="mac-content">
        <div class="f-pane"></div>
      </div>`;
    document.body.appendChild(win);
    if (options.barButton) {
      options.barButton.classList.add('f-bar-btn');
      win.querySelector('.f-end').appendChild(options.barButton);
    }

    const back = win.querySelector('.f-back');
    const where = win.querySelector('.f-where');
    const pane = win.querySelector('.f-pane');
    const count = win.querySelector('.f-count');

    const root = () => ({ name: options.rootName, items: options.items });
    let stack = [root()];

    // The arrangement: assigned once, kept forever — the classic folder
    // window's manner. When a level first shows, spotless items flow
    // into greedy centred rows (the desk's algorithm, halved) measured
    // against the pane as it stands that day, and each takes a fixed
    // spot (item.spot). From then on nothing re-arranges: resizing the
    // window clips and scrolls, dragging one item moves only that item,
    // and a newcomer just takes the slot the flow would have dealt it —
    // everyone else stands still.
    const ensureSpots = level => {
      const width = Math.max(pane.clientWidth, ITEM_W);
      const rows = [[]];
      let run = 0;
      level.items.forEach(item => {
        const row = rows[rows.length - 1];
        const next = run + (row.length ? GAP : 0) + ITEM_W;
        if (row.length && next > width) {
          rows.push([item]);
          run = ITEM_W;
        } else {
          row.push(item);
          run = next;
        }
      });
      let y = 0;
      rows.forEach(row => {
        if (!row.length) return;
        const rowWidth = row.length * ITEM_W + (row.length - 1) * GAP;
        let x = Math.max(0, Math.round((width - rowWidth) / 2 / UNIT) * UNIT);
        row.forEach(item => {
          if (!item.spot) item.spot = { x, y };
          x += ITEM_W + GAP;
        });
        y += ITEM_H + VGAP;
      });
    };

    // A spoken notice (folder.say) survives exactly one render — so an
    // owner may speak from inside a drop verdict and still be heard over
    // the re-render that follows; the render after that restores the
    // folder's name, the way the address always heals.
    let notice = null;

    const render = () => {
      const level = stack[stack.length - 1];
      back.hidden = stack.length === 1;
      where.textContent = notice ?? level.name;   // the folder's name, never the path
      notice = null;
      count.textContent = `${level.items.length} item${level.items.length === 1 ? '' : 's'}`;

      ensureSpots(level);
      let bottom = 0;
      pane.innerHTML = level.items.map((item, index) => {
        bottom = Math.max(bottom, item.spot.y + ITEM_H);
        return `
        <button class="f-item" type="button" data-index="${index}"
          style="left:${item.spot.x}px;top:${item.spot.y}px">
          ${glyph(item)}
          <span class="f-label px-wrap-16">${item.name}</span>
        </button>`;
      }).join('');
      pane.style.height = `${bottom + UNIT * 2}px`;
      pane.querySelectorAll('.f-item').forEach(button =>
        surface.attach(button, level.items[Number(button.dataset.index)]));
    };

    // The same physics as the desk, with the folder's own carry: a
    // lifted item floats above every window at the scale of where it
    // points — half over ANY folder window (it would land as a folder
    // item there), desk scale elsewhere. The drop verdicts, hit-tested
    // by real stacking (VisualIdentity.windowUnder): inside this window
    // it takes the spot it was dropped on; inside another FOLDER window
    // it moves there — same thing, different drawer; on the bare desk
    // it leaves through the owner's onDropOut; on any other window the
    // place is illegal and the item walks home (render puts it back —
    // its spot never changed). A cancelled drag walks home the same
    // way. Grip offsets ride the surface's grab, captured at the press.
    const surface = VI.makeDragSurface({
      unit: UNIT,
      space: pane,
      onLift: element => {
        element.classList.add('f-carry');
      },
      place: (element, px, py, grab) => {
        const under = VI.windowUnder(px, py, element);
        const overCan = !under && VI.overTrashCan(px, py);
        VI.setCanOpen(overCan);
        const folderBound = overCan || (under && under.classList.contains('folder-window'));
        const scale = folderBound ? 1 : 2;
        element.style.left = `${surface.snapTo(px - grab.grabDX * scale)}px`;
        element.style.top = `${surface.snapTo(py - grab.grabDY * scale)}px`;
        element.style.transform = scale === 2 ? 'scale(2)' : '';
      },
      onDrop: (element, item, event, grab) => {
        VI.setCanOpen(false);
        const px = event.clientX;
        const py = event.clientY;
        const under = VI.windowUnder(px, py, element);
        if (under === win) {
          const paneRect = pane.getBoundingClientRect();
          item.spot = {
            x: Math.max(0, Math.min(surface.snapTo(px - paneRect.left - grab.grabDX),
              Math.max(0, pane.clientWidth - ITEM_W))),
            y: Math.max(0, surface.snapTo(py - paneRect.top - grab.grabDY)),
          };
          options.onDropIn?.(item, stack[stack.length - 1]);
        } else if (under && under.classList.contains('folder-window')) {
          const dest = REGISTRY.get(under);
          if (dest) {
            const level = stack[stack.length - 1];
            const at = level.items.indexOf(item);
            if (at !== -1) level.items.splice(at, 1);
            delete item.spot;   // the new drawer deals the landing spot
            dest.drop(item, px, py);
          }
        } else if (under) {
          // Any other window is offered the drop (the console's slot
          // takes the disk); a claim takes the item out of this level,
          // an unclaimed offer walks home through the render below.
          if (!document.dispatchEvent(new CustomEvent('identity-window-drop', {
            cancelable: true,
            detail: { item, window: under, clientX: px, clientY: py },
          }))) {
            const level = stack[stack.length - 1];
            const at = level.items.indexOf(item);
            if (at !== -1) level.items.splice(at, 1);
            delete item.spot;
          }
        } else if (!under) {
          options.onDropOut?.(item, event, stack[stack.length - 1]);
        }
        render();
      },
      onCancel: () => {
        VI.setCanOpen(false);
        render();
      },
      onTap: (element, item) => {
        if (item.kind === 'folder') {
          stack.push(item);
          render();
        } else if (item.kind === 'app') {
          item.open?.();
        } else {
          openFile(VI, item);
        }
      },
    });

    back.addEventListener('click', () => {
      stack.pop();
      render();
    });

    const chrome = VI.attachWindowChrome(win, {
      title: options.title,
      closeLabel: options.closeLabel,
      icon: options.icon,
      onOpen: () => {
        stack = [root()];
        render();
        win.querySelector('.mac-content').scrollTop = 0;
      },
      onEscape: () => {
        if (viewer && !viewer.hidden) {
          viewerChrome.close();
          return true;
        }
        return false;
      },
    });

    // A folder window may be created after the page's boot pass (a folder
    // dragged onto the desk opens as its own window) — it fits its own
    // grips then; makeResizable is idempotent for the boot-time ones.
    VI.makeResizable?.(win);

    // Receiving a drop from anywhere: the item lands in the CURRENT
    // level, centred under the pointer, on the grid.
    REGISTRY.set(win, {
      drop: (item, clientX, clientY) => {
        const paneRect = pane.getBoundingClientRect();
        const snapUnit = value => Math.round(value / UNIT) * UNIT;
        item.spot = {
          x: Math.max(0, Math.min(snapUnit(clientX - paneRect.left - ITEM_W / 2),
            Math.max(0, pane.clientWidth - ITEM_W))),
          y: Math.max(0, snapUnit(clientY - paneRect.top - 34)),
        };
        stack[stack.length - 1].items.push(item);
        options.onDropIn?.(item, stack[stack.length - 1]);
        render();
      },
    });

    return {
      win,
      chrome,
      render,
      home: () => {
        stack = [root()];
        render();
      },
      say: text => {
        notice = text;
        where.textContent = text;
      },
      close: () => {
        if (viewer) viewerChrome.close();
        chrome.close();
      },
    };
  };

  // The kit's doors: create a folder window; render an item's art raw
  // (desk scale — the caller wraps or scales it); open a file in the one
  // shared viewer; reach the folder behind a window element to file a
  // drop into it.
  window.FolderKit = {
    create,
    art: item => item.artFrom ? cloneGlyph(item.artFrom) : artGlyph(ART[item.art]),
    open: item => openFile(window.VisualIdentity, item),
    at: windowElement => REGISTRY.get(windowElement),
  };
})();
