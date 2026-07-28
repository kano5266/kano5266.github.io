// crash.js — the panic screen: what System 8 shows when it has stopped.
//
// The desk keeps one thing it cannot run, an executable from a system
// with a different idea of what a window is (files.js owns the file,
// this owns the consequence). Opening it stops the machine, and NOTHING
// takes it back but a reload — which is exactly what a panic is. That
// is the joke and the price of the joke, so the screen says the way out
// in plain words rather than leaving anyone stranded looking for a
// close box.
//
// A MACHINE DOES NOT STOP INSTANTLY, and it does not stop quietly.
// Three acts, about 2.8 seconds:
//
//   1. IT HANGS. The desk is photographed where it stands
//      (VisualIdentity.drawPageSnapshot, the same picture the pixelate
//      exit takes) and held still long enough to feel wrong.
//   2. IT TEARS. The photograph comes apart in whole cells: bands slid
//      sideways, a band inverted, the picture coarsening 1 → 2 → 4 → 8
//      the way this site pixelates anything.
//   3. THE CONSOLE TAKES OVER — which is what actually happens when a
//      machine loses the screen it was drawing on. It stops drawing and
//      starts telling you: a kernel dump printed one line at a time
//      into the top-left of that same canvas, white on black, over
//      whatever the GUI left behind. Only then the blue.
//
// Every frame is discrete. Nothing fades, because nothing here fades.
//
// The blue is THE DESK'S OWN INDIGO, pinned literal rather than read
// from the token: a lit screen is theme-exempt (the TV's glass is the
// same), and the dark theme's lighter primary would not hold white
// text. It sits on the transition's rung (9999) because it is the last
// thing the screen shows — nothing navigates after it, so the two can
// never want the same pixel.
//
// The face is ONE LINE on purpose. Neither pixel face is monospaced
// (Enter Command runs 2–6px a glyph), so drawn ASCII art would come out
// ragged and no letter-spacing trick fixes a `___` that has gaps in it.
// One line has nothing to line up with.
//
// Feature-module pattern: this file owns its CSS, DOM and behavior.
// Cross-module door: window.SystemCrash.panic(module).
(() => {
  const CSS = `
    /* The picture of the desk, held and then broken up. */
    .sys-freeze {
      position: fixed;
      inset: 0;
      z-index: 9999;
      width: 100vw;
      height: 100vh;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .sys-panic {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;      /* the column is centred... */
      justify-content: center;
      gap: 24px;
      text-align: left;         /* ...the lines inside it are not */
      padding: 48px;
      background: #4f46e5;      /* the desk's indigo, literal: a lit screen */
      color: #fff;
      font-family: var(--font-display);
      font-size: 16px;
      line-height: 24px;
      overflow: auto;
      cursor: default;
      user-select: none;
    }

    /* 48px: a size the pixel faces bake crisp at, and big enough to be
       a face rather than punctuation. */
    .sys-panic .pn-face {
      width: 640px;
      max-width: 100%;
      font-size: 48px;
      line-height: 48px;
    }

    /* The system's name, stamped rather than printed: the screen's own
       indigo on white, so the one light thing on the panel is the name
       of the machine that stopped. The block hugs the name and the name
       keeps the column's left edge — a 640px bar would be a title bar,
       and a stopped machine has no chrome left to draw. */
    .sys-panic .pn-name {
      width: 640px;
      max-width: 100%;
      font-size: 32px;
      line-height: 32px;
      font-weight: 700;
    }

    .sys-panic .pn-name span {
      display: inline-block;
      padding: 0 8px;
      background: #fff;
      color: #4f46e5;      /* the screen's own indigo, literal like the field */
      letter-spacing: 8px;
    }

    /* No pre-line: the copy wraps to the column on its own, so where
       the source happens to break a line is not where the screen does. */
    .sys-panic p {
      margin: 0;
      width: 640px;
      max-width: 100%;
    }

    .sys-panic .pn-quiet { color: #c7d2fe; }

    .sys-panic .pn-way-out { font-weight: 700; }

    /* A cursor that blinks in whole frames — on, off, nothing between. */
    .sys-panic .pn-caret {
      display: inline-block;
      width: 8px;
      height: 16px;
      margin-left: 8px;
      vertical-align: -2px;
      background: #fff;
      animation: pn-blink 1s step-end infinite;
    }

    @keyframes pn-blink {
      0%, 50% { opacity: 1; }
      50.01%, 100% { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sys-panic .pn-caret { animation: none; }
    }

    /* The report waiting at next boot: a small window in the desk's own
       chrome. NO position of its own — placeWindow centres and cascades
       every window, and a CSS centring trick (left 50% + translateX)
       fights it, landing the box half a width off the screen. */
    .report-window {
      width: min(480px, calc(100vw - 48px));
    }

    .report-window .rp-head { margin: 0 0 16px; font-weight: 700; }

    .report-window p { margin: 0 0 16px; }

    .report-window .rp-quiet { color: var(--identity-gray); }

    .report-window .rp-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;            /* two buttons never touch: one 8px line reads as one control */
      margin: 0;
    }

    .report-window .rp-btn {
      padding: 0 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      font-size: 16px;
      line-height: 24px;
      cursor: pointer;
    }

    .report-window .rp-btn:hover { color: var(--identity-primary-ink); }

    .report-window .rp-btn:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .report-window .rp-again {
      border-color: var(--identity-normal);
      background: var(--identity-primary);
      color: var(--identity-paper);
    }

    .report-window .rp-again:hover { color: var(--identity-paper); }

    @media (max-width: 640px) {
      .sys-panic { padding: 24px; }
      .sys-panic .pn-name { font-size: 16px; line-height: 24px; }
      .sys-panic .pn-face { font-size: 32px; line-height: 32px; }
    }
  `;

  // How a machine comes apart: it hangs first (one long still frame),
  // then tears in whole cells while the picture coarsens through the
  // site's own block sizes. `tears` is how many bands slide, `flip`
  // inverts one, `block` is the pixelation.
  const BREAKING = [
    { block: 1, tears: 0, flip: false, ms: 280 },   // hung: nothing responds
    { block: 1, tears: 2, flip: false, ms: 70 },
    { block: 2, tears: 4, flip: true, ms: 70 },
    { block: 2, tears: 3, flip: false, ms: 70 },
    { block: 4, tears: 5, flip: true, ms: 70 },
    { block: 4, tears: 3, flip: false, ms: 70 },
    { block: 8, tears: 2, flip: true, ms: 140 },
  ];
  const CELL = 8;

  // The console that takes over when the desk dies. A dump is printed
  // in FIXED CHARACTER CELLS on the canvas rather than laid out as
  // text, because neither pixel face is monospaced (Enter Command runs
  // 2–6px a glyph) and a register dump whose hex columns do not line up
  // is not a register dump. One cell, one character, 8px apart — the
  // grid the whole desk is built on.
  const CHAR_W = 8;
  const ROW_H = 20;          // tight leading: a console sets its lines
                             // against each other, not a page's 24
  const DUMP_EDGE = 48;      // how far the block sits from the corner
  const DUMP_HOLD_MS = 1000;  // it sits there long enough to be read, then
                              // the machine gives up
  const DUMP_COLS = 74;      // what fits at 8px a character
  const BLANK_SHARE = 3;     // an empty line costs a third of a printed one

  // A panic names THE MACHINE IT DIED ON, and the browser knows all of
  // this about itself already — cores, screen, driver, locale. Reading
  // it back is the whole trick: the dump stops being decoration and
  // starts being about you. It is read at crash time, shown on your own
  // screen, and goes nowhere: nothing here is sent, stored or kept.
  const clip = (text, room) => (text.length > room ? text.slice(0, room - 1) + '~' : text);

  const machine = () => {
    const n = navigator;
    const brand = n.userAgentData?.brands
      ?.filter(b => !/Not.?A.?Brand/i.test(b.brand))
      ?.map(b => `${b.brand} ${b.version}`)
      ?.join(', ');
    const parsed = (n.userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/([\d.]+)/) || []);
    const engine = /Gecko\/|Firefox/.test(n.userAgent) ? 'Gecko'
      : /Chrome|Edg|OPR/.test(n.userAgent) ? 'Blink' : 'WebKit';
    let video = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      if (info) video = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    } catch { /* no context, no driver line */ }
    return {
      host: [
        n.userAgentData?.platform || n.platform || 'unknown',
        `${n.hardwareConcurrency || '?'} cores`,
        n.deviceMemory ? `${n.deviceMemory} GB` : null,
        n.maxTouchPoints > 0 ? `${n.maxTouchPoints} touch` : null,
      ].filter(Boolean).join(', '),
      display: `${screen.width}x${screen.height} @${devicePixelRatio}x,`
        + ` window ${innerWidth}x${innerHeight}`,
      video,
      agent: `${brand || (parsed[1] ? `${parsed[1]} ${parsed[2]}` : 'unknown')} (${engine})`,
      locale: `${n.language || '??'} / ${Intl.DateTimeFormat().resolvedOptions().timeZone || '??'}`,
      online: n.onLine ? 'up' : 'down',
    };
  };

  // A DUMP DOES NOT COME OUT EVENLY. An even cadence is a typewriter;
  // a machine writes in bursts, and the gaps between them are it doing
  // work. So the dump is BLOCKS, each with its own pace and its own
  // stall before it, and the split follows what the lines are:
  //
  //   the trap — registers and backtrace, everything the fault handler
  //   already had in hand — floods out almost at once (12ms a line);
  //   then the machine stalls half a second, which is the part that
  //   actually feels like a crash;
  //   then it ASKS ITSELF WHAT IT IS — process, host, driver, build —
  //   and those come slowly (60ms), because each one is a question.
  const dumpBlocks = module => {
    const it = machine();
    const trap = [
      'panic(cpu 0 caller 0xffffff800a7ce6fa): kernel trap at 0xffffff800a9135fa,',
      'type 14=page fault, registers:',
      'CR0: 0x0000000080010033  CR2: 0x00000000deadbeef',
      'RAX: 0x000000000000c0de  RBX: 0x00000000cafebabe',
      'RSP: 0xffffff8008000008  RBP: 0xffffff8008000010',
      'R08: 0x0000000000000000  R09: 0x0000000000000001',
      '',
      'backtrace (cpu 0), frame : return address',
      '0xffffff8008000008 : 0xffffff800a6dab52',
      '0xffffff8008000010 : 0xffffff800a7ce6fa',
      '0xffffff8008000018 : 0xffffff800a9135fa',
    ];
    const inventory = [
      '',
      `process name corresponding to current thread: ${module}`,
      `image path: /trash/${module}`,
      'loaded as: executable, foreign format (unsupported)',
      '',
      clip(`host: ${it.host}`, DUMP_COLS),
      clip(`display: ${it.display}`, DUMP_COLS),
      it.video ? clip(`video: ${it.video}`, DUMP_COLS) : null,
      clip(`agent: ${it.agent}`, DUMP_COLS),
      `locale: ${it.locale}`,
      `network: ${it.online}`,
      '',
      `system version: ${window.__SYSTEM_VERSION__ || '0.4 alpha'}`,
      'kernel version: desk 8.0.0 / pixels are whole, always',
      `system uptime in nanoseconds: ${Math.round(performance.now() * 1e6)}`,
    ].filter(line => line !== null);
    return [
      { lines: trap, ms: 12, pause: 0 },
      { lines: inventory, ms: 60, pause: 480 },
    ];
  };

  // A MACHINE REMEMBERS CRASHING. The record is written the instant the
  // panic starts — before any of the theatre, so a reload mid-crash
  // still counts — and it is handed back exactly once, on the next boot.
  // This is the only thing on this desk that survives a reload on
  // purpose, and it is the recovery card's job in the lore: everything
  // comes back, including the fact that something went wrong.
  const RECORD = 'identity-panic';

  const fileReport = record => {
    try { localStorage.setItem(RECORD, JSON.stringify(record)); } catch { /* private window */ }
  };

  const takeReport = () => {
    try {
      const raw = localStorage.getItem(RECORD);
      localStorage.removeItem(RECORD);
      const record = raw ? JSON.parse(raw) : null;
      return record && record.module && record.at ? record : null;
    } catch { return null; }
  };

  const whenFor = at => {
    const then = new Date(at);
    const pad = value => String(value).padStart(2, '0');
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${pad(then.getHours())}:${pad(then.getMinutes())} on `
      + `${pad(then.getDate())} ${MONTHS[then.getMonth()]}`;
  };

  const howLong = ms => {
    const seconds = Math.max(1, Math.round(ms / 1000));
    if (seconds < 90) return `${seconds} seconds`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 90) return `${minutes} minutes`;
    return `${Math.round(minutes / 60)} hours`;
  };

  let stopped = false;

  const cells = n => Math.floor(Math.random() * n) * CELL;

  const panic = (module = 'setup.exe') => {
    if (stopped) return;       // a machine stops once
    stopped = true;
    // One signal the rest of the desk can read: the machine is down.
    // Set before any of the theatre, because the crash takes ~2.8s and
    // for most of that there is no panel to look for yet.
    document.documentElement.dataset.stopped = 'true';
    fileReport({ module, at: Date.now(), up: Math.round(performance.now()) });

    document.head.appendChild(Object.assign(document.createElement('style'),
      { textContent: CSS }));

    // Nothing behind this is running any more. Keys are taken at the
    // capture phase and go no further — a reader would otherwise sit
    // there turning pages under the blue. The browser's own shortcuts
    // are untouched (no preventDefault), because RELOAD is the way out
    // and must keep working.
    const deafen = event => event.stopImmediatePropagation();
    ['keydown', 'keyup', 'keypress'].forEach(type =>
      document.addEventListener(type, deafen, true));

    const show = () => {
      const screen = document.createElement('section');
      screen.className = 'sys-panic';
      screen.setAttribute('role', 'alert');
      screen.tabIndex = -1;
      screen.innerHTML = [
        '<p class="pn-face" aria-hidden="true">(x_x)</p>',
        '<p class="pn-name"><span>SYSTEM 8</span></p>',
        '<p>the machine has stopped.</p>',
        `<p>${module} was written for another system, and System 8 opened it anyway.</p>`,
        `<p class="pn-quiet">stopped in ${module}</p>`,
        '<p>the keyboard is not listening, and nothing was lost — the disk recovery card keeps everything, the way it always does.</p>',
        '<p class="pn-way-out">reload the page to start it again.<span class="pn-caret"></span></p>',
      ].join('');
      document.querySelector('.sys-freeze')?.remove();
      document.body.appendChild(screen);
      screen.focus();
    };

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || typeof window.VisualIdentity?.drawPageSnapshot !== 'function') {
      show();
      return;
    }

    // Photograph the desk where it stands, then break the photograph.
    const width = innerWidth;
    const height = innerHeight;
    const canvas = document.createElement('canvas');
    const source = document.createElement('canvas');
    const small = document.createElement('canvas');
    canvas.className = 'sys-freeze';
    canvas.width = source.width = width;
    canvas.height = source.height = height;
    const ctx = canvas.getContext('2d');
    const smallCtx = small.getContext('2d');
    document.body.appendChild(canvas);
    window.VisualIdentity.drawPageSnapshot(source);

    let at = 0;
    const breakUp = () => {
      const frame = BREAKING[at];

      small.width = Math.max(1, Math.ceil(width / frame.block));
      small.height = Math.max(1, Math.ceil(height / frame.block));
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.clearRect(0, 0, small.width, small.height);
      smallCtx.drawImage(source, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(small, 0, 0, small.width, small.height,
        0, 0, small.width * frame.block, small.height * frame.block);

      // Bands slide sideways by whole cells, leaving behind the edge
      // they came from: a torn scanline, not a smear.
      for (let i = 0; i < frame.tears; i += 1) {
        const y = cells(Math.floor(height / CELL));
        const tall = CELL + cells(7);
        const shift = cells(9) - 4 * CELL;
        if (!shift) continue;
        ctx.putImageData(ctx.getImageData(0, y, width, tall), shift, y);
      }

      if (frame.flip) {
        const y = cells(Math.floor(height / CELL));
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, y, width, CELL + cells(5));
        ctx.restore();
      }

      at += 1;
      setTimeout(at < BREAKING.length ? breakUp : printDump, frame.ms);
    };

    // What a machine says when the screen it was drawing on is gone: it
    // stops drawing and starts TELLING you, in the corner, one line at a
    // time, over whatever the GUI left behind. White on black blocks
    // because that has to be legible over anything underneath.
    const printDump = () => {
      const blocks = dumpBlocks(module);
      const left = DUMP_EDGE;   // top LEFT, where a console starts printing
      ctx.font = `16px ${getComputedStyle(document.documentElement)
        .getPropertyValue('--font-display').trim() || 'monospace'}`;
      ctx.textBaseline = 'top';

      let row = 0;               // rows run on across the blocks
      const write = line => {
        const top = DUMP_EDGE + row * ROW_H;
        if (line) {
          ctx.fillStyle = '#000';
          ctx.fillRect(left - 4, top, line.length * CHAR_W + 8, ROW_H);
          ctx.fillStyle = '#fff';
          for (let i = 0; i < line.length; i += 1) {
            ctx.fillText(line[i], left + i * CHAR_W, top + 4);
          }
        }
        row += 1;
      };

      let block = 0;
      const runBlock = () => {
        const { lines, ms } = blocks[block];
        let i = 0;
        const step = () => {
          const blank = !lines[i];
          write(lines[i]);
          i += 1;
          if (i < lines.length) {
            setTimeout(step, blank ? Math.max(8, Math.round(ms / BLANK_SHARE)) : ms);
            return;
          }
          block += 1;
          if (block < blocks.length) setTimeout(runBlock, blocks[block].pause);
          else setTimeout(show, DUMP_HOLD_MS);
        };
        step();
      };
      setTimeout(runBlock, blocks[0].pause);
    };

    breakUp();
  };

  // Next boot: the desk says what happened, once, the way a system that
  // has just come back up does — and offers to do it again, which is
  // the whole joke and the reason anyone reads this window twice.
  // After the desk's welcome, not during it: the page stages its opening
  // windows at 960ms and 1760ms, and a report that lands between them is
  // a report with a TV set on top of it. A system telling you what went
  // wrong once it has finished coming up is also the honest order.
  const REPORT_DELAY_MS = 2400;

  const boot = () => {
    const VI = window.VisualIdentity;
    if (!VI) return;
    const record = takeReport();
    if (!record) return;

    document.head.appendChild(Object.assign(document.createElement('style'),
      { textContent: CSS }));

    const win = document.createElement('section');
    win.className = 'mac-window report-window';
    win.dataset.resize = 'none';
    win.hidden = true;
    win.innerHTML = `
      <div class="mac-content">
        <p class="rp-head">System 8 restarted because of a problem.</p>
        <p>${record.module} stopped the machine at ${whenFor(record.at)},
          ${howLong(record.up)} into the session.</p>
        <p class="rp-quiet">the disk recovery card put everything back.</p>
        <p class="rp-actions">
          <button class="rp-btn" type="button" data-ignore>ignore</button>
          <button class="rp-btn rp-again" type="button" data-again>open it again</button>
        </p>
      </div>`;
    document.body.appendChild(win);
    const chrome = VI.attachWindowChrome(win, {
      title: 'Report',
      closeLabel: 'Close the report',
    });

    win.querySelector('[data-ignore]').addEventListener('click', () => chrome.close());
    win.querySelector('[data-again]').addEventListener('click', () => {
      chrome.close();
      panic(record.module);
    });

    setTimeout(() => chrome.open(), REPORT_DELAY_MS);
  };

  window.SystemCrash = { panic };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
