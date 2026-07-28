// locker.js — the joke that takes the desk hostage.
//
// invoice.pdf.app sits in "do not open", wearing a document's icon
// because the double extension IS the joke: it looks like a bill and it
// is a program. (A program on THIS desk is a .app; setup.exe keeps its
// foreign extension because being foreign is its whole premise.) Open
// it and a ghost sits on every icon, nothing opens, the palette goes
// red, and a window you cannot close counts down.
//
// THE NOTE BLAMES THE CLICK, because that is what happened: a program
// that looked like an invoice, in a folder that said not to, opened
// anyway. A note that reads as weather — things came up from the trash
// on their own — lets the reader off and stops being ransomware.
//
// TWO DECISIONS KEEP THIS A JOKE RATHER THAN A FRIGHT:
//
//   It stays INSIDE the desk. A full-screen red takeover with a
//   countdown is, pixel for pixel, the tech-support scam pattern, and a
//   visitor who has not worked out that System 8 is a fiction could
//   reasonably think their own machine was taken. A System 8 WINDOW
//   locking System 8 ICONS reads as what it is: the pretend computer
//   caught something.
//
//   The countdown ENDS the joke. At zero the locker gives up —
//   nobody has ever paid — and puts everything back. Nobody is ever
//   stuck, which is also the desk's own law: a screen with no way out
//   has to print its way out. (A reload was always an exit too; nothing
//   here is kept.)
//
// The ransom cannot be paid, and that is the joke rather than a
// cruelty: the price is to read one of them a story, and the one
// holding the reader is sitting on the reader. No money is ever asked
// for and no button pretends to take any.
//
// Feature-module pattern: this file owns its CSS, DOM and behavior.
// Cross-module door: window.SystemLocker.run(). Raises `data-locked` on
// <html> the way crash.js raises `data-stopped`.
(() => {
  const RANSOM_MS = 60000;     // one minute of theatre
  const TICK_MS = 1000;        // whole seconds, like every clock here
  const GIVE_UP_MS = 2600;     // how long the punchline sits before it tidies up
  const COFFEE_MS = 15000;     // what pressing the one forbidden button costs,
                               // once and once only — a button that can be
                               // pressed forever is a trap, not a joke

  // IT SPREADS, it does not switch. A desk that fell in one frame would
  // read as a redraw; taken a window and then an icon at a time, it
  // reads as something happening while you watch. The palette turns
  // last, once there is nothing left to take.
  const ERROR_UP_MS = 260;     // the machine notices
  const ERROR_HOLD_MS = 1100;  // and tells you, for a moment
  const SHUT_MS = 220;         // one window closes
  const TAKE_MS = 180;         // one icon is taken
  const FLIP_MS = 420;         // the beat before everything goes red
  const DEMAND_MS = 460;       // and the beat before it asks

  // WHAT TOOK THE ICONS: a small ghost, seven cells by seven, drawn in
  // the desk's own icon language — ink outline, paper body, exactly one
  // accent — so the thing holding the desk hostage still belongs to the
  // family. The accent is a pair of cheeks. A padlock said "you are
  // locked out"; this says "something is in here", which is funnier and,
  // at 56px, very much the cuter.
  // WHAT TOOK THE ICONS: a ghost drawn in the desk's own icon language —
  // one body, five faces (see FACES below) —
  // ink outline, paper body, exactly one accent, spent on a pair of
  // cheeks. FOURTEEN CELLS SQUARE at the grid's own 8px, which is the
  // only honest way to make pixel art bigger: more pixels, not fatter
  // ones. (It was seven cells drawn at 16 and 24 for a while — the same
  // drawing with coarser pixels, which is a different thing and a worse
  // one.) 112px: exactly the width of the icon it is sitting on, and
  // the same drawing does the talking in the window.
  const BODY = [
    [5, 0, 4, 1, 'ink'], [3, 1, 2, 1, 'ink'], [5, 1, 4, 1, 'paper'],
    [9, 1, 2, 1, 'ink'], [2, 2, 1, 1, 'ink'], [3, 2, 8, 1, 'paper'],
    [11, 2, 1, 1, 'ink'], [1, 3, 1, 1, 'ink'], [2, 3, 10, 1, 'paper'],
    [12, 3, 1, 1, 'ink'], [1, 4, 1, 1, 'ink'], [2, 4, 10, 1, 'paper'],
    [12, 4, 1, 1, 'ink'], [0, 5, 1, 1, 'ink'], [1, 5, 12, 1, 'paper'],
    [13, 5, 1, 1, 'ink'], [0, 6, 1, 1, 'ink'], [1, 6, 12, 1, 'paper'],
    [13, 6, 1, 1, 'ink'], [0, 7, 1, 1, 'ink'], [1, 7, 12, 1, 'paper'],
    [13, 7, 1, 1, 'ink'], [0, 8, 1, 1, 'ink'], [1, 8, 2, 1, 'red'],
    [3, 8, 8, 1, 'paper'], [11, 8, 2, 1, 'red'], [13, 8, 1, 1, 'ink'],
    [0, 9, 1, 1, 'ink'], [1, 9, 12, 1, 'paper'], [13, 9, 1, 1, 'ink'],
    [0, 10, 1, 1, 'ink'], [1, 10, 12, 1, 'paper'], [13, 10, 1, 1, 'ink'],
    [0, 11, 1, 1, 'ink'], [1, 11, 12, 1, 'paper'], [13, 11, 1, 1, 'ink'],
    [0, 12, 1, 1, 'ink'], [1, 12, 1, 1, 'paper'], [2, 12, 2, 1, 'ink'],
    [4, 12, 2, 1, 'paper'], [6, 12, 2, 1, 'ink'], [8, 12, 2, 1, 'paper'],
    [10, 12, 2, 1, 'ink'], [12, 12, 1, 1, 'paper'], [13, 12, 1, 1, 'ink'],
    [0, 13, 2, 1, 'ink'], [4, 13, 2, 1, 'ink'], [8, 13, 2, 1, 'ink'],
    [12, 13, 2, 1, 'ink'],
  ];

  // FIVE FACES on one body. Eyes live in rows 4-6, mouths in rows 8-11,
  // and the cheeks belong to the body because they never change — a
  // ghost sitting on someone's icons is pleased with itself whatever
  // else its face is doing. Drawn on top of the body (DOM order is
  // paint order), so the silhouette is written once.
  const FACES = {
    plain: [
      [3, 5, 2, 2, 'ink'], [9, 5, 2, 2, 'ink'], [6, 8, 2, 1, 'ink'],
    ],
    oh: [
      [3, 5, 2, 2, 'ink'], [9, 5, 2, 2, 'ink'], [6, 8, 2, 2, 'ink'],
    ],
    sleepy: [
      [3, 5, 2, 1, 'ink'], [9, 5, 2, 1, 'ink'], [6, 9, 2, 1, 'ink'],
    ],
    // Her second drawing, on the shared body: ANGRY eyes — one cell high
    // at the outer corner, two low and inward, so each slopes down
    // toward the middle — over an OPEN MOUTH in the two pinks, darker
    // at the top. Unframed on purpose: an ink surround made it read as
    // a hatch rather than a mouth, and the shape carries it without.
    cross: [
      [3, 5, 1, 1, 'ink'], [3, 6, 2, 1, 'ink'],
      [10, 5, 1, 1, 'ink'], [9, 6, 2, 1, 'ink'],
      [6, 7, 2, 1, 'red'], [6, 8, 1, 1, 'pink'], [7, 8, 1, 1, 'red'],
      [6, 9, 2, 1, 'pink'],
    ],
  };

  // ONE OF THEM IS NOT A FACE BUT A WHOLE GHOST, drawn by hand rather
   // than assembled: the one in the bow. Its head is narrower, its mouth
  // is a flat bar and the ribbon sits above everything, so there was no
  // face to bolt onto the shared body — it is its own fourteen by
  // seventeen. ghostArt takes either kind by name.
  const WHOLE = {
    // Drawn in pixel-editor.html and exported; taken from the SVG
    // rather than from a picture of it, which is the only way art this
    // detailed survives the trip. Ears with two pinks in them, eyes
    // with the highlight on the same side in both, and a tail — which
    // is why every drawing is now centred in a box wide enough for it.
    cat: [
      [0, 0, 2, 1, 'ink'], [12, 0, 2, 1, 'ink'], [0, 1, 1, 1, 'ink'],
      [1, 1, 1, 1, 'pink'], [2, 1, 1, 1, 'ink'], [11, 1, 1, 1, 'ink'],
      [12, 1, 1, 1, 'pink'], [13, 1, 1, 1, 'ink'], [0, 2, 1, 1, 'ink'],
      [1, 2, 2, 1, 'pink'], [3, 2, 1, 1, 'ink'], [5, 2, 4, 1, 'ink'],
      [10, 2, 1, 1, 'ink'], [11, 2, 2, 1, 'pink'], [13, 2, 1, 1, 'ink'],
      [0, 3, 1, 1, 'ink'], [1, 3, 1, 1, 'pink'], [2, 3, 1, 1, 'red'],
      [3, 3, 2, 1, 'ink'], [5, 3, 4, 1, 'paper'], [9, 3, 2, 1, 'ink'],
      [11, 3, 1, 1, 'red'], [12, 3, 1, 1, 'pink'], [13, 3, 1, 1, 'ink'],
      [0, 4, 1, 1, 'ink'], [1, 4, 1, 1, 'pink'], [2, 4, 1, 1, 'ink'],
      [3, 4, 8, 1, 'paper'], [11, 4, 1, 1, 'ink'], [12, 4, 1, 1, 'pink'],
      [13, 4, 1, 1, 'ink'], [0, 5, 2, 1, 'ink'], [2, 5, 10, 1, 'paper'],
      [12, 5, 2, 1, 'ink'], [0, 6, 2, 1, 'ink'], [2, 6, 10, 1, 'paper'],
      [12, 6, 2, 1, 'ink'], [0, 7, 1, 1, 'ink'], [1, 7, 2, 1, 'paper'],
      [3, 7, 2, 1, 'ink'], [5, 7, 4, 1, 'paper'], [9, 7, 2, 1, 'ink'],
      [11, 7, 2, 1, 'paper'], [13, 7, 1, 1, 'ink'], [16, 7, 2, 1, 'ink'],
      [0, 8, 1, 1, 'ink'], [1, 8, 2, 1, 'paper'], [3, 8, 1, 1, 'ink'],
      [4, 8, 5, 1, 'paper'], [9, 8, 1, 1, 'ink'], [10, 8, 3, 1, 'paper'],
      [13, 8, 1, 1, 'ink'], [15, 8, 1, 1, 'ink'], [16, 8, 1, 1, 'paper'],
      [17, 8, 1, 1, 'ink'], [0, 9, 1, 1, 'ink'], [1, 9, 2, 1, 'paper'],
      [3, 9, 2, 1, 'ink'], [5, 9, 4, 1, 'paper'], [9, 9, 2, 1, 'ink'],
      [11, 9, 2, 1, 'paper'], [13, 9, 1, 1, 'ink'], [15, 9, 1, 1, 'ink'],
      [16, 9, 1, 1, 'paper'], [17, 9, 1, 1, 'ink'], [0, 10, 1, 1, 'ink'],
      [1, 10, 2, 1, 'pink'], [3, 10, 3, 1, 'paper'], [6, 10, 1, 1, 'ink'],
      [7, 10, 4, 1, 'paper'], [11, 10, 2, 1, 'pink'],
      [13, 10, 2, 1, 'ink'], [15, 10, 2, 1, 'paper'],
      [17, 10, 1, 1, 'ink'], [0, 11, 1, 1, 'ink'], [1, 11, 4, 1, 'paper'],
      [5, 11, 1, 1, 'ink'], [6, 11, 1, 1, 'paper'], [7, 11, 1, 1, 'ink'],
      [8, 11, 5, 1, 'paper'], [13, 11, 2, 1, 'ink'],
      [15, 11, 1, 1, 'paper'], [16, 11, 1, 1, 'ink'], [0, 12, 1, 1, 'ink'],
      [1, 12, 12, 1, 'paper'], [13, 12, 1, 1, 'ink'],
      [14, 12, 2, 1, 'paper'], [16, 12, 1, 1, 'ink'], [0, 13, 1, 1, 'ink'],
      [1, 13, 12, 1, 'paper'], [13, 13, 1, 1, 'ink'],
      [14, 13, 1, 1, 'paper'], [15, 13, 1, 1, 'ink'], [0, 14, 1, 1, 'ink'],
      [1, 14, 12, 1, 'paper'], [13, 14, 3, 1, 'ink'], [0, 15, 1, 1, 'ink'],
      [1, 15, 1, 1, 'paper'], [2, 15, 2, 1, 'ink'], [4, 15, 2, 1, 'paper'],
      [6, 15, 2, 1, 'ink'], [8, 15, 2, 1, 'paper'], [10, 15, 2, 1, 'ink'],
      [12, 15, 1, 1, 'paper'], [13, 15, 1, 1, 'ink'], [0, 16, 2, 1, 'ink'],
      [4, 16, 2, 1, 'ink'], [8, 16, 2, 1, 'ink'], [12, 16, 2, 1, 'ink'],
    ],
    bow: [
    [0, 0, 5, 1, 'ink'], [8, 0, 5, 1, 'ink'], [0, 1, 1, 1, 'ink'],
    [1, 1, 3, 1, 'red'], [4, 1, 5, 1, 'ink'], [9, 1, 3, 1, 'red'],
    [12, 1, 1, 1, 'ink'], [0, 2, 1, 1, 'ink'], [1, 2, 4, 1, 'red'],
    [5, 2, 1, 1, 'ink'], [6, 2, 1, 1, 'red'], [7, 2, 1, 1, 'ink'],
    [8, 2, 4, 1, 'red'], [12, 2, 1, 1, 'ink'], [0, 3, 1, 1, 'ink'],
    [1, 3, 3, 1, 'red'], [4, 3, 5, 1, 'ink'], [9, 3, 3, 1, 'red'],
    [12, 3, 1, 1, 'ink'], [0, 4, 5, 1, 'ink'], [5, 4, 3, 1, 'paper'],
    [8, 4, 5, 1, 'ink'], [1, 5, 1, 1, 'ink'], [2, 5, 10, 1, 'paper'],
    [12, 5, 1, 1, 'ink'], [1, 6, 1, 1, 'ink'], [2, 6, 10, 1, 'paper'],
    [12, 6, 1, 1, 'ink'], [0, 7, 1, 1, 'ink'], [1, 7, 2, 1, 'paper'],
    [3, 7, 1, 1, 'ink'], [4, 7, 6, 1, 'paper'], [10, 7, 1, 1, 'ink'],
    [11, 7, 2, 1, 'paper'], [13, 7, 1, 1, 'ink'], [0, 8, 1, 1, 'ink'],
    [1, 8, 3, 1, 'paper'], [4, 8, 1, 1, 'ink'], [5, 8, 4, 1, 'paper'],
    [9, 8, 1, 1, 'ink'], [10, 8, 3, 1, 'paper'], [13, 8, 1, 1, 'ink'],
    [0, 9, 1, 1, 'ink'], [1, 9, 2, 1, 'paper'], [3, 9, 1, 1, 'ink'],
    [4, 9, 6, 1, 'paper'], [10, 9, 1, 1, 'ink'], [11, 9, 2, 1, 'paper'],
    [13, 9, 1, 1, 'ink'], [0, 10, 1, 1, 'ink'], [1, 10, 2, 1, 'red'],
    [3, 10, 2, 1, 'paper'], [5, 10, 4, 1, 'ink'], [9, 10, 2, 1, 'paper'],
    [11, 10, 2, 1, 'red'], [13, 10, 1, 1, 'ink'], [0, 11, 1, 1, 'ink'],
    [1, 11, 12, 1, 'paper'], [13, 11, 1, 1, 'ink'], [0, 12, 1, 1, 'ink'],
    [1, 12, 12, 1, 'paper'], [13, 12, 1, 1, 'ink'], [0, 13, 1, 1, 'ink'],
    [1, 13, 12, 1, 'paper'], [13, 13, 1, 1, 'ink'], [0, 14, 1, 1, 'ink'],
    [1, 14, 12, 1, 'paper'], [13, 14, 1, 1, 'ink'], [0, 15, 1, 1, 'ink'],
    [1, 15, 1, 1, 'paper'], [2, 15, 2, 1, 'ink'], [4, 15, 2, 1, 'paper'],
    [6, 15, 2, 1, 'ink'], [8, 15, 2, 1, 'paper'], [10, 15, 2, 1, 'ink'],
    [12, 15, 1, 1, 'paper'], [13, 15, 1, 1, 'ink'], [0, 16, 2, 1, 'ink'],
    [4, 16, 2, 1, 'ink'], [8, 16, 2, 1, 'ink'], [12, 16, 2, 1, 'ink'],
    ],
  };

  // The crowd on the desk wears these in turn, so no two neighbours are
  // pulling the same face.
  const CROWD = ['plain', 'bow', 'cross', 'oh', 'sleepy'];

  // THE CAT IS RARE. It is not in the rotation: most times the desk is
  // taken there is no cat in the crowd at all, and about one locking in
  // six puts exactly one somewhere among the icons. A thing you might
  // not see is worth more than a thing you always see.
  const CAT_ODDS = 6;

  const CELL = 8;              // the grid unit, here as everywhere else
  const BOX_ROWS = 17;         // the icon's art box, in cells
  const BOX_COLS = 18;         // wide enough for the one with a tail

  // THEY ALL STAND ON THE SAME LINE. The drawings are not the same
  // height — the one in the bow is seventeen cells to the others'
  // fourteen — so each is dropped to the floor of the box rather than
  // hung from its ceiling. This is the desk's own rule for icons
  // (folder.js bottom-aligns art for exactly this reason): a row of
  // things standing is a row; a row of things hanging is a mess.
  const ghostArt = (face = 'plain') => {
    const cells = WHOLE[face] || [...BODY, ...(FACES[face] || FACES.plain)];
    const tall = Math.max(...cells.map(([, y, , h]) => y + h));
    const wide = Math.max(...cells.map(([x, , w]) => x + w));
    const floor = (BOX_ROWS - tall) * CELL;
    const inset = Math.floor((BOX_COLS - wide) / 2) * CELL;   // centred, whole cells
    return cells.map(([x, y, w, h, tone]) =>
      `<span class="lk-px lk-${tone}" style="left:${x * CELL + inset}px;` +
      `top:${y * CELL + floor}px;width:${w * CELL}px;height:${h * CELL}px"></span>`).join('');
  };

  const CSS = `
    /* THE PALETTE GOES RED. A swap, like dark mode — the same tokens,
       different values — so every window, icon and shadow on the desk
       turns without one of them knowing about this file. The values are
       the accent-pink family, which the guide already calls the
       system's red; nothing new enters the palette to say "alarm". */
    :root[data-locked] {
      --identity-primary: #db2777;
      --identity-primary-ink: #9d174d;
      --identity-tint-deep: #f9a8d4;
      --identity-tint-mid: #fbcfe8;
      --identity-tint-soft: #fce7f3;
      --identity-tint-shadow: #fdf2f8;
    }

    :root[data-theme="dark"][data-locked] {
      --identity-primary: #f472b6;
      --identity-primary-ink: #fbcfe8;
      --identity-tint-deep: #9d174d;
      --identity-tint-mid: #831843;
      --identity-tint-soft: #4c0519;
      --identity-tint-shadow: #2a0311;
    }

    /* A sealed icon keeps its label — you can still read what it was —
       and loses its drawing to whatever is sitting on it. */
    .lk-sealed .doc-px { visibility: hidden; }

    .lk-ghost {
      position: absolute;
      left: 50%;
      top: 0;
      width: 144px;       /* 18 cells: the one with a tail is wider than an icon */
      height: 136px;
      margin-left: -72px;
      pointer-events: none;
    }

    .lk-px { position: absolute; }

    /* Two frames, a cell apart, forever: alive rather than pasted on.
       Each one is offset a beat from the last (set where it is made) so
       the desk does not breathe in unison. */
    .lk-ghost { animation: lk-bob 800ms step-end infinite; }

    @keyframes lk-bob {
      0%, 50% { transform: translateY(0); }
      50.01%, 100% { transform: translateY(-8px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .lk-ghost { animation: none; }
    }

    .lk-ink { background: var(--identity-normal); }
    .lk-red { background: var(--identity-primary); }
    .lk-pink { background: var(--identity-tint-deep); }
    .lk-paper { background: var(--identity-paper); }

    /* A refused icon shrugs: whole cells, three frames, no easing. */
    .lk-refused { animation: lk-shrug 180ms step-end; }

    @keyframes lk-shrug {
      0%   { transform: translateX(0); }
      33%  { transform: translateX(8px); }
      66%  { transform: translateX(-8px); }
      100% { transform: translateX(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .lk-refused { animation: none; }
    }

    /* What the machine says before it loses the desk. A plain system
       dialog, the desk's own chrome, gone a moment later with every
       other window. */
    .error-window {
      width: min(360px, calc(100vw - 48px));
    }

    .error-window .er-head { margin: 0 0 16px; font-weight: 700; }

    .error-window p { margin: 0 0 16px; }

    .error-window .er-quiet { color: var(--identity-gray); }

    .error-window .er-actions {
      display: flex;
      justify-content: flex-end;
      margin: 0;
    }

    .error-window .er-btn {
      padding: 0 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      font-size: 16px;
      line-height: 24px;
      cursor: pointer;
    }

    .error-window .er-btn:hover { color: var(--identity-primary-ink); }

    .locker-window {
      width: min(640px, calc(100vw - 48px));
    }

    /* The ransom-note shape, which is the one thing worth borrowing from
       the real ones: the speaker on the left, the explanation on the
       right, the buttons along the bottom. */
    .locker-window .lk-panel {
      display: flex;
      gap: 24px;
      margin: 0 0 24px;
    }

    .locker-window .lk-left {
      flex: none;
      width: 168px;
      text-align: center;
    }

    .locker-window .lk-big {
      position: relative;
      display: block;
      width: 144px;
      height: 136px;
      margin: 0 auto 16px;
    }

    .locker-window .lk-right { min-width: 0; }

    .locker-window .lk-right p { margin: 0 0 16px; }

    .locker-window .lk-right p:last-child { margin: 0; }

    .locker-window .lk-head {
      font-weight: 700;
      color: var(--identity-primary);
    }

    .locker-window .lk-warn { color: var(--identity-primary); }

    .locker-window .lk-label {
      margin: 0;
      color: var(--identity-gray);
    }

    /* No close box: this window is the one thing on the desk you cannot
       dismiss. The countdown is its door. */
    .locker-window .mac-close { display: none; }

    .locker-window p { margin: 0 0 16px; }

    .locker-window .lk-count {
      font-size: 32px;
      line-height: 32px;
      font-weight: 700;
      color: var(--identity-primary);
    }

    .locker-window .lk-quiet { color: var(--identity-gray); min-height: 24px; }

    .locker-window .lk-actions { border-top: 4px solid var(--identity-normal); padding-top: 16px; }

    .locker-window .lk-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin: 0;
    }

    /* Ordinary buttons: none of these three is THE action — there is no
       action, that is the joke — so none of them wears the fill. */
    .locker-window .lk-btn {
      padding: 0 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      font-size: 16px;
      line-height: 24px;
      cursor: pointer;
    }

    .locker-window .lk-btn:hover { color: var(--identity-primary-ink); }

    .locker-window .lk-btn:focus-visible {
      outline: 2px solid var(--identity-normal);
      outline-offset: 2px;
    }
  `;

  // THE PRICE IS INACTION. The desk unlocks on its own, provided you do
  // NOT buy the author a coffee — so the countdown IS the payment and
  // doing nothing is the correct move. There is a button for buying one
  // anyway, because a rule with no way to break it is not a rule; it
  // costs fifteen seconds, once, and then only answers. No money is ever
  // taken and no payment path exists: the button is a joke about
  // itself.
  const ANSWERS = {
    what: { face: 'cross', line: 'they are what you threw out. all of it is still down there.' },
    sorry: { face: 'bow', line: 'accepted. noted. they are still sitting.' },
    coffee: { face: 'oh', line: 'that was the one thing you were asked not to do.' },
    again: { face: 'cross', line: 'it is still not helping.' },
  };

  const SEALS = '.pixel-icon, .trash-can, .trash-out';

  let cssIn = false;
  let win = null;
  let chrome = null;
  let errorWin = null;
  let errorChrome = null;
  let ticker = null;
  let endsAt = 0;
  let locked = false;
  let spreading = false;
  let bought = false;          // whether the forbidden button was pressed

  const clock = ms => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const pad = value => String(value).padStart(2, '0');
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  };

  let seated = 0;
  let catAt = -1;              // which icon gets the cat this time, if any

  const sealOne = icon => {
    if (icon.querySelector('.lk-ghost')) return;
    icon.classList.add('lk-sealed');
    const ghost = document.createElement('span');
    ghost.className = 'lk-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.animationDelay = `${(seated % 4) * 200}ms`;
    ghost.innerHTML = ghostArt(seated === catAt ? 'cat' : CROWD[seated % CROWD.length]);
    seated += 1;
    icon.appendChild(ghost);
  };

  const seal = () => document.querySelectorAll(SEALS).forEach(sealOne);

  const unseal = () => {
    document.querySelectorAll('.lk-sealed').forEach(icon => {
      icon.classList.remove('lk-sealed');
      icon.querySelector('.lk-ghost')?.remove();
    });
  };

  // Nothing on a sealed desk opens. The locker's own window is the one
  // thing the pointer can still reach.
  const refuse = event => {
    if (!locked) return;
    const el = event.target instanceof Element ? event.target : null;
    if (!el || el.closest('.locker-window, .error-window')) return;
    const icon = el.closest(SEALS);
    const window_ = el.closest('.mac-window');
    if (!icon && !window_) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (!icon) return;
    icon.classList.remove('lk-refused');
    void icon.offsetWidth;              // restart the shrug
    icon.classList.add('lk-refused');
  };

  const unlock = () => {
    errorChrome?.close();
    clearInterval(ticker);
    ticker = null;
    locked = false;
    spreading = false;
    delete document.documentElement.dataset.locked;
    unseal();
  };

  const giveUp = () => {
    unlock();
    win.querySelector('.lk-big').innerHTML = ghostArt('sleepy');
    win.querySelector('.lk-head').textContent = bought
      ? 'you bought the coffee anyway.'
      : 'nobody bought a coffee.';
    win.querySelector('.lk-body').textContent = (bought
      ? 'it cost fifteen seconds and nothing else. '
      : 'which was the whole price. ')
      + 'the ghosts have gone back down. they will be in the trash if you '
      + 'want them, and invoice.pdf.app will be there too.';
    win.querySelector('.lk-body-2').textContent = '';
    win.querySelector('.lk-warn').textContent = '';
    win.querySelector('.lk-quiet').textContent = '';
    win.querySelector('.lk-label').textContent = '';
    win.querySelector('.lk-back').textContent = '';
    win.querySelector('.lk-clock').textContent = '';
    win.querySelector('.lk-actions').innerHTML = '';
    setTimeout(() => chrome.close(), GIVE_UP_MS);
  };

  const buildError = VI => {
    errorWin = document.createElement('section');
    errorWin.className = 'mac-window error-window';
    errorWin.dataset.resize = 'none';
    errorWin.hidden = true;
    errorWin.innerHTML = `
      <div class="mac-content">
        <p class="er-head">a system error has been detected.</p>
        <p class="er-quiet">error 8</p>
        <p class="er-actions">
          <button class="er-btn" type="button" data-ok>ok</button>
        </p>
      </div>`;
    document.body.appendChild(errorWin);
    errorChrome = VI.attachWindowChrome(errorWin, {
      title: 'System Error',
      closeLabel: 'Close the error',
    });
    errorWin.querySelector('[data-ok]').addEventListener('click', () => errorChrome.close());
  };

  const build = VI => {
    win = document.createElement('section');
    win.className = 'mac-window locker-window';
    win.dataset.resize = 'none';
    win.hidden = true;
    win.innerHTML = `
      <div class="mac-content">
        <div class="lk-panel">
          <div class="lk-left">
            <span class="lk-big" aria-hidden="true"></span>
            <p class="lk-label">they get bored in</p>
            <p class="lk-clock"><span class="lk-count">01:00</span></p>
            <p class="lk-label lk-back"></p>
          </div>
          <div class="lk-right">
            <p class="lk-head">every icon on this desk has been sat on.</p>
            <p class="lk-body"></p>
            <p class="lk-body-2"></p>
            <p class="lk-warn"></p>
            <p class="lk-quiet"></p>
          </div>
        </div>
        <p class="lk-actions">
          <button class="lk-btn" type="button" data-say="what">show what they are</button>
          <button class="lk-btn" type="button" data-say="sorry">say sorry</button>
          <button class="lk-btn" type="button" data-coffee>buy the author a coffee</button>
        </p>
      </div>`;
    document.body.appendChild(win);
    chrome = VI.attachWindowChrome(win, {
      title: 'invoice.pdf.app',
      closeLabel: 'This window does not close',
      onEscape: () => true,          // Escape is not a way out either
    });
  };

  // The note, set fresh each time it runs — one place, so the copy and
  // the wiring can never drift apart.
  const demand = () => {
    bought = false;
    win.querySelector('.lk-big').innerHTML = ghostArt();
    win.querySelector('.lk-head').textContent =
      'every icon on this desk has been sealed.';
    win.querySelector('.lk-body').textContent =
      'you opened invoice.pdf.app. it was not an invoice — it was a '
      + 'program, it was behind two folders that both said not to, and you '
      + 'opened it anyway.';
    win.querySelector('.lk-body-2').textContent =
      'it let something out of the trash. there is a ghost on every icon '
      + 'now and each one is holding what it sits on: not the contacts, not '
      + 'the television, not the trash they came out of.';
    // EVERY NEGATION HERE RESOLVES, and the sentence is still true:
    // nothing done → unsealed; not buying is mandatory; buying costs.
    // It is written to be misread, because a ransom note nobody can
    // parse is how anyone ends up pressing the wrong button — which is
    // the whole joke, and it costs fifteen seconds rather than money.
    win.querySelector('.lk-warn').textContent =
      'the desk does not remain sealed unless nothing is done. not buying '
      + 'the author a coffee is not optional, and failure to not do so '
      + 'will not go uncharged.';
    win.querySelector('.lk-quiet').textContent = '';
    const answer = key => {
      win.querySelector('.lk-quiet').textContent = ANSWERS[key].line;
      win.querySelector('.lk-big').innerHTML = ghostArt(ANSWERS[key].face);
    };
    win.querySelectorAll('[data-say]').forEach(button => {
      button.addEventListener('click', () => answer(button.dataset.say));
    });
    win.querySelector('[data-coffee]').addEventListener('click', () => {
      if (bought) {
        answer('again');
        return;
      }
      bought = true;
      endsAt += COFFEE_MS;      // the one thing you were asked not to do
      answer('coffee');
    });
  };

  const run = () => {
    const VI = window.VisualIdentity;
    if (!VI || locked) return;
    if (document.documentElement.dataset.stopped === 'true') return;

    if (!cssIn) {
      cssIn = true;
      document.head.appendChild(Object.assign(document.createElement('style'),
        { textContent: CSS }));
    }
    if (!win) {
      build(VI);
      buildError(VI);
    }

    // The desk stops answering the moment the program runs — before a
    // single icon has been taken. That gap is the point: things refuse,
    // and only then do you see why.
    locked = true;
    spreading = true;
    seated = 0;
    const taking = document.querySelectorAll(SEALS).length;
    catAt = Math.floor(Math.random() * CAT_ODDS) === 0
      ? Math.floor(Math.random() * taking)
      : -1;

    // The machine notices before it falls: an ordinary system error
    // first, then every window goes — that one last, so the last thing
    // to leave the desk is the complaint about it.
    const steps = [{ wait: ERROR_UP_MS, act: () => errorChrome.open() }];
    let firstShut = true;
    document.querySelectorAll('.mac-window:not([hidden])').forEach(other => {
      if (other === win || other === errorWin) return;
      steps.push({ wait: firstShut ? ERROR_HOLD_MS : SHUT_MS, act: () => { other.hidden = true; } });
      firstShut = false;
    });
    steps.push({ wait: firstShut ? ERROR_HOLD_MS : SHUT_MS, act: () => errorChrome.close() });
    document.querySelectorAll(SEALS).forEach(icon => {
      steps.push({ wait: TAKE_MS, act: () => sealOne(icon) });
    });
    steps.push({ wait: FLIP_MS, act: () => { document.documentElement.dataset.locked = 'true'; } });
    steps.push({ wait: DEMAND_MS, act: () => {
      spreading = false;
      demand();
      chrome.open();
      count();
    } });

    // Someone who asked for less motion gets the end state, not the show.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      steps.forEach(step => step.act());
      return;
    }
    let at = 0;
    const next = () => {
      steps[at].act();
      at += 1;
      if (at < steps.length) setTimeout(next, steps[at].wait);
    };
    setTimeout(next, steps[0].wait);
  };

  const count = () => {
    endsAt = Date.now() + RANSOM_MS;
    const back = new Date(endsAt);
    const pad = value => String(value).padStart(2, '0');
    win.querySelector('.lk-back').textContent =
      `the desk comes back at ${pad(back.getHours())}:${pad(back.getMinutes())}`;
    const face = win.querySelector('.lk-clock');
    face.innerHTML = `<span class="lk-count">${clock(RANSOM_MS)}</span>`;
    ticker = setInterval(() => {
      const left = endsAt - Date.now();
      if (left <= 0) {
        giveUp();
        return;
      }
      face.innerHTML = `<span class="lk-count">${clock(left)}</span>`;
    }, TICK_MS);
  };

  // Icons that arrive while the desk is sealed (a stray dragged out of
  // the trash, say) get sealed too.
  const boot = () => {
    ['pointerdown', 'pointerup', 'click', 'dblclick'].forEach(type =>
      document.addEventListener(type, refuse, true));
    new MutationObserver(() => { if (locked && !spreading) seal(); })
      .observe(document.body, { childList: true, subtree: true });
    // Signing out resets the play layer, and a locked desk is part of it.
    document.addEventListener('identity-user-change', event => {
      if (event.detail.user) return;
      if (!locked) return;
      unlock();
      chrome?.close();
    });
  };

  window.SystemLocker = { run };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
