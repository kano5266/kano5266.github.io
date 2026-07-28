// tv.js — the TV: everything specific to the TV window lives in this
// file, following the wallet.js feature-module pattern (the page supplies
// .mac-window chrome + VisualIdentity helpers).
//
// Concept: a little CRT set with CHANNELS, not a news reader — programs
// live on channels so more can move in later. Today's lineup: CH 1 is
// the news program (the latest item held on screen under a LIVE bug,
// older items crawling the ticker), CH 2 is the endroll (the whole
// timeline from news.md.js rolling up like end credits), CH 3 is the
// games department — a "coming soon" card, until the game console from
// the trash plugs its soft cable into the set's antenna jack (signed
// in, both windows open): then CH 3 plays BLOCKADE. CH 4 is the
// color-bars sign-off. Zapping shows a beat of pixel static (stepped
// frames, never smooth).
(() => {
  const STATIC_MS = 180;
  const AUTO_MS = 8000;
  const ROLL_TICK_MS = 120;   // one 8px step of the endroll

  // The news timeline, parsed from markdown (news.md.js): "## date"
  // blocks, newest first. Published as window.NEWS_ITEMS — Messages
  // replays the same timeline as chat history.
  const parseNews = md => md.split(/^## /m).slice(1).map(block => {
    const lines = block.trim().split('\n');
    return { date: lines[0].trim(), text: lines.slice(1).join(' ').trim() };
  }).filter(item => item.text);
  window.NEWS_ITEMS = parseNews(window.NEWS_MD || '');

  const CSS = `
    /* The cabinet sits ABOVE the feed cable's layer: a cord that would
       cross the picture runs behind the set instead, and only the
       stretch beside the cabinet — where the socket is — shows. */
    .tv-window .tv-set {
      position: relative;
      z-index: 1;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      padding: 16px;
      display: flex;
      gap: 16px;
    }

    /* The antenna input, low on the set's LEFT flank — a side-mounted
       DE-15 socket transcribed from a drawn mockup (4x15 cells on the
       4px grid): a shell whose flange runs the connector's full height
       with a SCREW EAR stepping out top and bottom, and a comb of pins
       (a spine with four tips on alternate rows) in its mouth. The
       flange faces the set (right); the mouth faces out (left), toward
       the plug crossing the desk. Built from cells so the pattern is
       exact. It stays HIDDEN so the set reads clean, and reveals itself
       only while the cable's plug is in hand (TVApp.jackShow) — a port
       shows up when there's something to plug into it; then the pins
       light as the plug hovers (jackWilling). visibility, not display,
       so its position is always known for seating the plug. */
    .tv-window .tv-jack {
      position: absolute;
      left: -20px;
      bottom: 30px;
      width: 16px;
      height: 60px;
      visibility: hidden;
    }

    .tv-window .tv-jack.armed { visibility: visible; }

    .tv-window .tv-jack span { position: absolute; }
    .tv-window .tv-jack .tj-k { background: var(--identity-normal); }
    .tv-window .tv-jack .tj-p { background: var(--identity-tint-mid); }
    .tv-window .tv-jack.willing .tj-p { background: var(--identity-primary); }

    /* The feed cable's stretch INSIDE this window — the console module
       draws into it (TVApp.feedLayer), so the cord visibly climbs from
       the window's edge to the set's antenna jack, above the bezel
       paper but inside this window's own stacking. */
    .tv-window .tv-feed-cable {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }


    @media (max-width: 640px) {
      .tv-window .tv-jack,
      .tv-window .tv-feed-cable { display: none; }
    }

    /* 4:3 glass, 384x288 — the era's aspect at the original width. The
       picture is a child layer so the glass furniture (scanlines, rounded
       corners, power overlay, static) survives every render. */
    .tv-window .tv-screen {
      position: relative;
      width: 384px;
      height: 288px;
      background: #312e81;
      overflow: hidden;
    }

    .tv-window .tv-picture {
      position: absolute;
      inset: 0;
      padding: 24px;
    }


    /* CRT curvature: the glass corners step in — [2,1] cells at the 8px
       scale, covered with the set's bezel paper. Above everything on the
       glass (z 4): the corners are outside the tube even during static. */
    .tv-window .tv-corner {
      position: absolute;
      z-index: 4;
      width: 16px;
      height: 8px;
      background: var(--identity-paper);
    }

    .tv-window .tv-corner::before {
      content: '';
      position: absolute;
      width: 8px;
      height: 16px;
      background: var(--identity-paper);
    }

    .tv-window .tv-corner.tl { top: 0; left: 0; }
    .tv-window .tv-corner.tl::before { top: 0; left: 0; }
    .tv-window .tv-corner.tr { top: 0; right: 0; }
    .tv-window .tv-corner.tr::before { top: 0; right: 0; }
    .tv-window .tv-corner.bl { bottom: 0; left: 0; }
    .tv-window .tv-corner.bl::before { bottom: 0; left: 0; }
    .tv-window .tv-corner.br { bottom: 0; right: 0; }
    .tv-window .tv-corner.br::before { bottom: 0; right: 0; }

    /* Power overlay (::before; the static zap owns ::after). While the
       set is off the glass is dead; switching plays the analog collapse —
       picture -> bright band -> line -> dot -> dark — in hard steps, and
       the warm-up runs it backwards. Stops sit on 8px lines of the 240px
       glass. */
    .tv-window .tv-screen::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background: transparent;
    }

    .tv-window .tv-set.off .tv-screen::before { background: #374151; }

    .tv-window .tv-screen.pwr-off::before {
      animation: tv-poweroff 400ms step-end;
    }

    .tv-window .tv-screen.pwr-on::before {
      animation: tv-poweron 500ms step-end;
    }

    @keyframes tv-poweroff {
      0% { background: linear-gradient(#374151 0 96px, #ffffff 96px 192px, #374151 192px); }
      33% { background: linear-gradient(#374151 0 136px, #ffffff 136px 152px, #374151 152px); }
      66% { background: linear-gradient(#ffffff, #ffffff) center / 24px 16px no-repeat #374151; }
      100% { background: #374151; }
    }

    @keyframes tv-poweron {
      0% { background: #374151; }
      25% { background: linear-gradient(#ffffff, #ffffff) center / 24px 16px no-repeat #374151; }
      50% { background: linear-gradient(#374151 0 136px, #ffffff 136px 152px, #374151 152px); }
      75% { background: linear-gradient(#374151 0 96px, #ffffff 96px 192px, #374151 192px); }
      100% { background: transparent; }
    }

    .tv-window .tv-date {
      color: #a5b4fc;
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 24px;
    }

    /* Headline at 32px (2px glyph pixels, on-grid) — it's a TV, it
       should read from the couch. */
    .tv-window .tv-text {
      color: #fff;
      font-weight: 700;
      margin: 0;
      font-size: 32px;
      line-height: 32px;
    }

    /* CH 1 — the news program: station bug + LIVE tag up top, the latest
       item held as the headline, and a lower third — date strap over a
       ticker crawling the older items in 8px steps. Glass colors are
       literal (a lit screen is exempt from the theme). */
    .tv-window .tv-news-top {
      position: absolute;
      top: 16px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tv-window .tv-news-bug {
      margin: 0;
      padding: 0 8px;
      background: #4f46e5;
      color: #fff;
      font-family: "Silkscreen", var(--font-display);
      font-size: 16px;
      line-height: 24px;
    }

    .tv-window .tv-news-live {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #fff;
      font-family: "Silkscreen", var(--font-display);
      font-size: 16px;
      line-height: 24px;
    }

    /* The clock a live broadcast carries in the corner. The only clock
       this set can honestly carry is the one in the room it stands in —
       the VIEWER'S, read off their machine. Latin whatever their locale
       is: chrome never takes CJK, and the shipped subset has no kanji
       for a weekday anyway. */
    .tv-window .tv-news-clock {
      position: absolute;
      top: 8px;                 /* the channel bug's own corner: it leaves,
                                   and the clock is what the corner becomes */
      right: 16px;
      margin: 0;
      color: #fff;
      font-family: "Silkscreen", var(--font-display);
      font-size: 16px;
      line-height: 24px;
      text-align: right;
    }

    .tv-window .tv-news-live .dot {
      width: 8px;
      height: 8px;
      background: var(--identity-accent-pink);
      animation: tv-blink 1s step-end infinite;
    }

    @keyframes tv-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .tv-window .tv-news-head {
      position: absolute;
      top: 80px;
      left: 24px;
      right: 24px;
      margin: 0;
      color: #fff;
      font-weight: 700;
      font-size: 32px;
      line-height: 32px;
    }

    .tv-window .tv-news-date {
      position: absolute;
      bottom: 32px;
      left: 0;
      right: 0;
      margin: 0;
      padding: 4px 24px;
      background: #4f46e5;
      color: #fff;
      font-size: 24px;
      line-height: 24px;
    }

    .tv-window .tv-news-ticker {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 32px;
      overflow: hidden;
      background: #1e1b4b;
    }

    .tv-window .tv-ticker-inner {
      position: absolute;
      top: 4px;
      white-space: nowrap;
      color: #a5b4fc;
      font-size: 24px;
      line-height: 24px;
    }

    /* CH 2 — the endroll: the timeline as rolling credits. The block
       starts below the glass and climbs in hard 8px steps (a JS interval
       — stepped by construction), looping once it clears the top. */
    .tv-window .tv-roll {
      position: absolute;
      left: 24px;
      right: 24px;
      top: 0;
      text-align: center;
    }

    .tv-window .tv-roll-title {
      margin: 0 0 32px;
      color: #fff;
      font-weight: 700;
      font-size: 32px;
      line-height: 32px;
    }

    .tv-window .tv-roll-date {
      margin: 24px 0 8px;
      color: #a5b4fc;
      font-size: 24px;
      line-height: 24px;
    }

    .tv-window .tv-roll-text {
      margin: 0;
      color: #fff;
      font-size: 24px;
      line-height: 24px;
    }

    .tv-window .tv-roll-fin {
      margin: 40px 0 0;
      color: #a5b4fc;
      font-size: 24px;
      line-height: 24px;
    }

    /* The channel number is the SET'S, not the program's: an on-screen
       display the TV puts up when you turn the dial and takes away
       again. Its leaving is what says whose it is — it needs no block
       of its own, and a black one belongs to no palette here. */
    .tv-window .tv-ch {
      z-index: 1;
      position: absolute;
      top: 8px;
      right: 16px;
      color: #fff;
      font-family: "Silkscreen", var(--font-display);
      font-size: 16px;
      line-height: 24px;
    }

    /* Channel zap: a beat of pixel static — TRUE random noise (three
       frames generated per page load, 8px cells), stepped through with
       no interpolation; the keyframes are injected at boot because they
       carry the generated frames. The overlay is opaque (it covers the
       picture, no text-hiding needed) and its visibility lives INSIDE
       the animation, so it can never linger: when the animation ends the
       overlay is transparent again even if script timers are throttled. */
    .tv-window .tv-screen::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 3;
      background-size: 384px 288px;
      background-repeat: repeat;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      opacity: 0;
      pointer-events: none;
    }

    .tv-window .tv-screen.zap::after {
      animation: tv-static ${STATIC_MS}ms step-end;
    }

    /* Test card: accent color bars, the classic sign-off. */
    .tv-window .tv-bars {
      position: absolute;
      inset: 0;
      display: flex;
    }

    .tv-window .tv-bars span { flex: 1; }

    .tv-window .tv-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      justify-content: center;
    }

    .tv-window .tv-knob {
      width: 64px;
      height: 48px;
      padding: 0;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      font: inherit;
      font-size: 24px;
      line-height: 24px;
      cursor: pointer;
    }

    .tv-window .tv-knob:hover,
    .tv-window .tv-knob:focus-visible { background: var(--identity-tint-mid); }

    .tv-window .tv-knob:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .tv-window .tv-knob:active { translate: 4px 4px; }

    /* Power switch: a mini rocker, like the wall light switch — the
       rocker drops when the set is off. */
    .tv-window .tv-switch {
      position: relative;
      width: 32px;
      height: 48px;
      margin: 0 auto;
      padding: 0;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      cursor: pointer;
    }

    .tv-window .tv-switch-rocker {
      position: absolute;
      left: 8px;
      top: 8px;
      width: 16px;
      height: 16px;
      background: var(--identity-tint-mid);
    }

    .tv-window .tv-set.off .tv-switch-rocker { top: 24px; }

    .tv-window .tv-switch:hover .tv-switch-rocker {
      background: var(--identity-primary);
    }

    .tv-window .tv-switch:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* The power light: lit accent-pink (the palette's red, same as the
       Messages unread badge), grey when the set is off. */
    .tv-window .tv-dot {
      width: 8px;
      height: 8px;
      margin: 8px auto 0;
      background: var(--identity-accent-pink);
    }

    .tv-window .tv-set.off .tv-dot { background: var(--identity-gray); }

    /* Speaker grille: tint slits under the controls, like every set of
       the era. */
    .tv-window .tv-grille {
      width: 64px;
      height: 24px;
      margin-top: 8px;
      background: repeating-linear-gradient(
        to bottom,
        var(--identity-tint-mid) 0 4px,
        transparent 4px 8px
      );
    }

    .tv-window .tv-set.off .tv-knob {
      color: var(--identity-gray);
      cursor: default;
    }

    /* CH 3 with the console connected: BLOCKADE. The playfield is the
       glass at its own 8px cells; trails are appended spans — a trail
       only ever grows, the DOM-friendliest game of 1976. Literal
       colors: lit screen. The note lines sit on the glass background
       so they read over a busy field. */
    .tv-window .tv-game {
      position: absolute;
      inset: 0;
    }

    .tv-window .tv-game-field {
      position: absolute;
      inset: 0;
    }

    .tv-window .tv-game-field span {
      position: absolute;
      width: 8px;
      height: 8px;
    }

    .tv-window .tv-game-score {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      margin: 0;
      text-align: center;
      color: #fff;
      font-size: 16px;
      line-height: 24px;
    }

    .tv-window .tv-game-note {
      position: absolute;
      left: 0;
      right: 0;
      top: 96px;
      text-align: center;
    }

    .tv-window .tv-game-big {
      width: fit-content;
      margin: 0 auto;
      padding: 0 8px;
      background: #312e81;
      color: #fff;
      font-weight: 700;
      font-size: 32px;
      line-height: 32px;
    }

    .tv-window .tv-game-small {
      width: fit-content;
      margin: 0 auto;
      padding: 0 8px;
      background: #312e81;
      color: #a5b4fc;
      font-size: 16px;
      line-height: 24px;
    }

    .tv-window .tv-game-hint {
      margin: 8px 0 0;
      color: #a5b4fc;
      font-size: 16px;
      line-height: 24px;
    }

    @media (prefers-reduced-motion: reduce) {
      .tv-window .tv-screen.zap::after { animation: none; }
      .tv-window .tv-news-live .dot { animation: none; }
      .tv-window .tv-screen.pwr-off::before,
      .tv-window .tv-screen.pwr-on::before { animation: none; }
    }
    /* ---- phone ------------------------------------------------------- *
     * Last on purpose: these rules share specificity with the base ones
     * above, so they win on source order alone. Putting this block near the
     * top is exactly why the control panel stayed a column on the first try.
     *
     * The set stands upright — glass on top, controls beneath — because
     * 384px of glass beside a control column never fits a phone. The glass
     * keeps its 4:3 and takes the width it is given instead of being
     * crushed by the flex row, which is what broke the headline into one
     * word per line. (Breakpoint mirrors VisualIdentity.isPhone.)
     * ------------------------------------------------------------------ */
    @media (max-width: 640px) {
      .tv-window .tv-set {
        flex-direction: column;
        align-items: center;
        padding: 8px;
      }
      .tv-window .tv-screen {
        width: 100%;
        max-width: 384px;
        height: auto;
        aspect-ratio: 4 / 3;
      }
      /* Sized for a 384px tube; give it back some room. */
      .tv-window .tv-news-head { font-size: 24px; line-height: 24px; top: 64px; }
      /* Beside the glass these were a column; beneath it they read as the
         set's front bezel, so they run across rather than stacking into a
         totem that eats the display. */
      .tv-window .tv-panel {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding-top: 8px;
      }
    }

    /* ---- desktop: the set is a fixed object --------------------------- *
     * A TV is furniture, not a document. It has one true size, nothing to
     * scroll to, and no reason to be dragged bigger — so on the desktop it
     * opts out of the shared .mac-content height cap and of its scrollbar
     * gutter, and out of the grow box entirely (see data-resize in boot).
     * The window then sizes itself to the set exactly:
     *   384 glass + 16 gap + 64 knob + 32 set padding + 8 set border
     *   + 48 content padding + 8 window border = 560.
     * No gutter in that sum: with overflow hidden there is no groove to pay
     * for. While the shared overflow-y: scroll still applied here, the tube
     * paid those 24px out of its own width and came out 360 instead of 384.
     * The floor is a guard, not a request — the glass is a flex child, so it
     * WILL squeeze if anything narrows the window, and a squeezed tube breaks
     * the headline into one word per line, the same failure phones had.
     * All of this is kept off the phone, where the window is 100vw, the box
     * is the display, and the content must still scroll to be reachable.
     * ------------------------------------------------------------------ */
    @media (min-width: 641px) {
      .tv-window { min-width: 560px; }
      .tv-window .mac-content { max-height: none; overflow: hidden; }
    }
  `;

  const boot = () => {
    const icon = document.querySelector('.tv-icon');
    const VI = window.VisualIdentity;
    const items = window.NEWS_ITEMS || [];
    if (!icon || !VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    // Pixel static, generated: each frame is a 48x26 canvas of randomly
    // colored cells scaled to 8px pixels. Random per load, uniform never —
    // a checker pattern reads as wallpaper, not noise. The palette is the
    // SOFT primary tint ramp: hard blacks made the burst grab attention;
    // low-contrast lavenders read as a gentle shimmer, with only sparse
    // navy specks for texture.
    const noiseFrame = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 36;
      const ctx = canvas.getContext('2d');
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const r = Math.random();
          ctx.fillStyle = r < 0.30 ? '#a5b4fc' : r < 0.58 ? '#c7d2fe'
            : r < 0.83 ? '#dbe2ff' : r < 0.94 ? '#ffffff' : '#312e81';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      return `url(${canvas.toDataURL()})`;
    };
    const noise = [noiseFrame(), noiseFrame(), noiseFrame()];
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `
      @keyframes tv-static {
        0% { opacity: 1; background-image: ${noise[0]}; }
        33% { background-image: ${noise[1]}; }
        66% { opacity: 1; background-image: ${noise[2]}; }
        100% { opacity: 0; }
      }
    ` }));

    // The channel lineup. News is a PROGRAM, not the whole set — future
    // programs (games…) get channels of their own.
    const channels = [
      { news: true },       // CH 1 — the news program (latest item, fixed)
      { roll: true },       // CH 2 — the timeline endroll
      { soon: true },       // CH 3 — games dept., coming soon
      { testcard: true }    // CH 4 — sign-off
    ];
    const BAR_COLORS = ['#ffffff', '#fde68a', '#a5f3fc', '#a7f3d0', '#fbcfe8', '#4f46e5', '#312e81'];

    const win = document.createElement('section');
    win.className = 'mac-window tv-window';
    // A TV set has one true size. Not resizable on any axis, so the page
    // gives this window no grow box at all.
    win.dataset.resize = 'none';
    win.hidden = true;
    // Titlebar, dialog role and door wiring come from attachWindowChrome
    // below; this template is only what is the TV's own.
    win.innerHTML = `
      <div class="mac-content">
        <div class="tv-set">
          <div class="tv-screen">
            <div class="tv-picture" aria-live="polite"></div>
            <span class="tv-corner tl"></span><span class="tv-corner tr"></span>
            <span class="tv-corner bl"></span><span class="tv-corner br"></span>
          </div>
          <div class="tv-panel">
            <button class="tv-knob" type="button" data-step="1" aria-label="Next channel">ch+</button>
            <button class="tv-knob" type="button" data-step="-1" aria-label="Previous channel">ch-</button>
            <button class="tv-switch" type="button" aria-label="Power" aria-pressed="true">
              <span class="tv-switch-rocker"></span>
            </button>
            <span class="tv-dot"></span>
            <span class="tv-grille"></span>
          </div>
          <span class="tv-jack" aria-hidden="true">
            <span class="tj-k" style="left:12px;top:0;width:4px;height:60px"></span>
            <span class="tj-k" style="left:4px;top:4px;width:8px;height:4px"></span>
            <span class="tj-k" style="left:4px;top:52px;width:8px;height:4px"></span>
            <span class="tj-k" style="left:0;top:12px;width:4px;height:36px"></span>
            <span class="tj-k" style="left:0;top:12px;width:12px;height:4px"></span>
            <span class="tj-k" style="left:0;top:44px;width:12px;height:4px"></span>
            <span class="tj-k" style="left:8px;top:20px;width:4px;height:4px"></span>
            <span class="tj-k" style="left:8px;top:28px;width:4px;height:4px"></span>
            <span class="tj-k" style="left:8px;top:36px;width:4px;height:4px"></span>
            <span class="tj-p" style="left:4px;top:16px;width:4px;height:28px"></span>
            <span class="tj-p" style="left:8px;top:16px;width:4px;height:4px"></span>
            <span class="tj-p" style="left:8px;top:24px;width:4px;height:4px"></span>
            <span class="tj-p" style="left:8px;top:32px;width:4px;height:4px"></span>
            <span class="tj-p" style="left:8px;top:40px;width:4px;height:4px"></span>
          </span>
        </div>
      </div>`;
    document.body.appendChild(win);

    const screen = win.querySelector('.tv-screen');
    const picture = win.querySelector('.tv-picture');
    const tvSet = win.querySelector('.tv-set');
    const powerSwitch = win.querySelector('.tv-switch');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let channel = 0;
    let autoTimer = null;
    let powered = true;
    let motionTimer = null;
    let clockTimer = null;
    let badgeTimer = null;

    // The motion engine — one timer, 8px per tick, stepped by
    // construction. The endroll climbs and wraps below the glass; the
    // ticker crawls left and wraps past the right edge. Under reduced
    // motion both park at a readable position instead.
    const stopMotion = () => {
      clearInterval(motionTimer);
      motionTimer = null;
    };

    // CH 1 says LIVE, so it had better be. The set carries a station
    // clock in the corner reading the VIEWER'S own time and date — its
    // own timer, because the ticker already holds the motion one, and it
    // stops itself the moment its element leaves the glass (a channel
    // change, the set going off, the window closing).
    const stopClock = () => {
      clearInterval(clockTimer);
      clockTimer = null;
    };

    // The dial's own readout: up when the channel changes, gone a few
    // seconds later, like every set that ever had one.
    const BADGE_MS = 3000;

    const stopBadge = () => {
      clearTimeout(badgeTimer);
      badgeTimer = null;
    };

    const flashBadge = () => {
      stopBadge();
      const badge = picture.querySelector('.tv-ch');
      const clock = picture.querySelector('.tv-news-clock');
      if (clock) clock.hidden = true;      // the corner is the dial's first
      if (!badge) {
        if (clock) clock.hidden = false;
        return;
      }
      badge.hidden = false;
      badgeTimer = setTimeout(() => {
        if (!badge.isConnected) return;
        badge.hidden = true;
        if (clock && clock.isConnected) clock.hidden = false;
      }, BADGE_MS);
    };

    const startClock = () => {
      stopClock();
      const face = picture.querySelector('.tv-news-clock');
      if (!face) return;
      let shown = null;
      const paint = () => {
        if (!face.isConnected) {
          stopClock();
          return;
        }
        const now = new Date();
        const pad = value => String(value).padStart(2, '0');
        const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        if (time === shown) return;   // only the minute is news
        shown = time;
        // The hour alone. A second blinking thing beside the LIVE dot is
        // just noise, and a broadcast clock is read at a glance anyway.
        face.textContent = time;
      };
      paint();
      clockTimer = setInterval(paint, 1000);
    };

    const startRoll = () => {
      const roll = picture.querySelector('.tv-roll');
      if (!roll) return;
      stopMotion();
      if (reducedMotion.matches) {
        roll.style.transform = 'translateY(24px)';
        return;
      }
      let y = 288;
      roll.style.transform = `translateY(${y}px)`;
      motionTimer = setInterval(() => {
        y -= 8;
        if (y < -roll.offsetHeight) y = 288;
        roll.style.transform = `translateY(${y}px)`;
      }, ROLL_TICK_MS);
    };

    const startTicker = () => {
      const inner = picture.querySelector('.tv-ticker-inner');
      if (!inner) return;
      stopMotion();
      if (reducedMotion.matches) {
        inner.style.transform = 'translateX(24px)';
        return;
      }
      let x = 384;
      inner.style.transform = `translateX(${x}px)`;
      motionTimer = setInterval(() => {
        x -= 8;
        if (x < -inner.offsetWidth) x = 384;
        inner.style.transform = `translateX(${x}px)`;
      }, ROLL_TICK_MS);
    };

    const render = () => {
      stopMotion();
      stopClock();
      stopBadge();
      const item = channels[channel];
      const badge = `<span class="tv-ch">CH ${channel + 1}</span>`;
      if (item.news) {
        const latest = items[0];
        const crawl = items.slice(1).map(entry =>
          `${entry.date} — ${entry.text}`).join('  +++  ');
        picture.innerHTML = latest
          ? `<div class="tv-news-top">
               <p class="tv-news-bug">NEWS</p>
               <p class="tv-news-live"><span class="dot"></span>LIVE</p>
             </div>
             <p class="tv-news-head">${latest.text}</p>
             <p class="tv-news-date">${latest.date}</p>
             <p class="tv-news-clock"></p>
             <div class="tv-news-ticker"><span class="tv-ticker-inner">${crawl}</span></div>${badge}`
          : `<p class="tv-text">no news is good news</p>${badge}`;
        startTicker();
        startClock();
      } else if (item.roll) {
        // oldest first, so the credits end on the newest — like a fin
        const credits = [...items].reverse().map(entry =>
          `<p class="tv-roll-date">${entry.date}</p><p class="tv-roll-text">${entry.text}</p>`).join('');
        picture.innerHTML =
          `<div class="tv-roll"><p class="tv-roll-title">SYSTEM 8 · NEWS</p>${credits}
             <p class="tv-roll-fin">— fin —</p></div>${badge}`;
        startRoll();
      } else if (item.soon) {
        // The games department: a promise, until the trash's console is
        // connected — then the channel is the console's (desk only; the
        // play layer never follows to the phone).
        if (feedConnected && !phoneGlass.matches) {
          renderGames(badge);
        } else {
          picture.innerHTML =
            `<p class="tv-date">games dept.</p><p class="tv-text">COMING SOON</p>${badge}`;
        }
      } else {
        picture.innerHTML =
          `<span class="tv-bars" aria-hidden="true">${BAR_COLORS.map(color =>
            `<span style="background:${color}"></span>`).join('')}</span>${badge}`;
      }
      flashBadge();   // every channel: the set says which, then stops saying it
    };

    const tune = step => {
      if (!powered) return;   // a dead set ignores its knobs
      channel = (channel + step + channels.length) % channels.length;
      if (!reducedMotion.matches) {
        // Retrigger the static burst; the animation hides itself when done.
        screen.classList.remove('zap');
        void screen.offsetWidth;
        screen.classList.add('zap');
      }
      render();
    };

    // The power switch: flipping it plays the analog collapse (or the
    // warm-up, backwards); the light greys out and the knobs go dead.
    // State survives while the page lives — a TV remembers being off.
    const setPower = on => {
      powered = on;
      tvSet.classList.toggle('off', !on);
      powerSwitch.setAttribute('aria-pressed', String(on));
      screen.classList.remove('pwr-on', 'pwr-off', 'zap');
      void screen.offsetWidth;
      screen.classList.add(on ? 'pwr-on' : 'pwr-off');
      if (on) {
        render();
        restartAuto();
      } else {
        clearTimeout(autoTimer);
        stopMotion();
      }
    };
    powerSwitch.addEventListener('click', () => setPower(!powered));

    // Ambient zapping: the set wanders to the next channel on its own;
    // touching a knob restarts the dwell. The endroll channel dwells for
    // one full pass of the credits. Off under reduced motion.
    const restartAuto = () => {
      clearTimeout(autoTimer);
      if (reducedMotion.matches || !powered) return;
      // The set never wanders off a LOADED game — CH 3 is somebody's
      // turn. A plugged console with an empty slot is only an
      // informational card; the set keeps wandering past it.
      if (feedConnected && feedLoaded && channel === 2 && !phoneGlass.matches) return;
      const roll = picture.querySelector('.tv-roll');
      const dwell = roll
        ? ((roll.offsetHeight + 288) / 8) * ROLL_TICK_MS + 1000
        : AUTO_MS;
      autoTimer = setTimeout(() => {
        tune(1);
        restartAuto();
      }, dwell);
    };

    win.querySelectorAll('.tv-knob').forEach(knob =>
      knob.addEventListener('click', () => {
        tune(Number(knob.dataset.step));
        restartAuto();
      }));

    // ---- CH 3: the games department ------------------------------------
    // The trash's game console FEEDS the set through the antenna jack:
    // the Trash owns the machine (its window, its slot, its soft cable)
    // and tells the set what is on the line (TVApp.setFeed). With the
    // console plugged and the BLOCKADE disk in its slot, channel 3
    // stops promising and plays the 1976 duel: two trails that only
    // grow, arrows against the house, the point to the survivor, first
    // to six. The glass draws it the era's way — appended 8px cells,
    // one stepped interval, no easing.
    const tvJack = win.querySelector('.tv-jack');
    const feedOverlay = document.createElement('div');
    feedOverlay.className = 'tv-feed-cable';
    feedOverlay.setAttribute('aria-hidden', 'true');
    win.appendChild(feedOverlay);
    const phoneGlass = matchMedia('(max-width: 640px)');
    let feedConnected = false;
    let feedLoaded = false;

    // The match lives OUTSIDE the DOM: render() wipes the picture on
    // every channel pass, so the glass redraws from this state and a
    // game in flight comes back as PAUSED, score intact.
    const WALL = 3;      // the ring's top row — the score line sits above
    const WIN_AT = 6;    // the 1976 rule: a point per crash, first to six
    const HUES = { wall: '#4f46e5', you: '#ffffff', house: '#a5b4fc', crash: '#fbcfe8' };
    const game = {
      mode: 'title',     // title | playing | paused | point | over
      you: 0, house: 0, last: null,
      occupied: new Set(), cells: [], p: null, q: null,
      field: null, score: null, note: null,
    };

    const cellKey = (x, y) => `${x},${y}`;

    const paintCell = (x, y, color) => {
      game.cells.push({ x, y, color });
      game.field?.insertAdjacentHTML('beforeend',
        `<span style="left:${x * 8}px;top:${y * 8}px;background:${color}"></span>`);
    };

    const drawField = () => {
      if (!game.field) return;
      game.field.innerHTML =
        `<span style="left:0;top:${WALL * 8}px;width:384px;background:${HUES.wall}"></span>
         <span style="left:0;top:280px;width:384px;background:${HUES.wall}"></span>
         <span style="left:0;top:${WALL * 8}px;height:${288 - WALL * 8}px;background:${HUES.wall}"></span>
         <span style="left:376px;top:${WALL * 8}px;height:${288 - WALL * 8}px;background:${HUES.wall}"></span>`
        + game.cells.map(cell =>
          `<span style="left:${cell.x * 8}px;top:${cell.y * 8}px;background:${cell.color}"></span>`).join('');
    };

    const newRound = () => {
      game.occupied = new Set();
      game.cells = [];
      for (let x = 0; x < 48; x += 1) {
        game.occupied.add(cellKey(x, WALL));
        game.occupied.add(cellKey(x, 35));
      }
      for (let y = WALL; y <= 35; y += 1) {
        game.occupied.add(cellKey(0, y));
        game.occupied.add(cellKey(47, y));
      }
      game.p = { x: 12, y: 25, dx: 1, dy: 0, wentDx: 1, wentDy: 0, color: HUES.you };
      game.q = { x: 35, y: 13, dx: -1, dy: 0, color: HUES.house };
      [game.p, game.q].forEach(actor => {
        game.occupied.add(cellKey(actor.x, actor.y));
        game.cells.push({ x: actor.x, y: actor.y, color: actor.color });
      });
    };

    const updateScore = () => {
      if (game.score) game.score.textContent = `YOU ${game.you} — TV ${game.house}`;
    };

    const showNote = () => {
      if (!game.note) return;
      let lines = null;
      if (game.mode === 'title') lines = ['BLOCKADE', 'press an arrow key — first to six'];
      else if (game.mode === 'paused') lines = ['PAUSED', 'press an arrow key'];
      else if (game.mode === 'point') {
        lines = [game.last === 'both' ? 'CRASH'
          : game.last === 'you' ? 'POINT — YOU' : 'POINT — TV', ''];
      } else if (game.mode === 'over') {
        lines = [game.you > game.house ? 'YOU WIN' : 'THE TV WINS', 'press an arrow key'];
      }
      game.note.innerHTML = lines
        ? `<p class="tv-game-big">${lines[0]}</p>${lines[1]
          ? `<p class="tv-game-small">${lines[1]}</p>` : ''}`
        : '';
    };

    const startLoop = () => {
      stopMotion();
      motionTimer = setInterval(tick, ROLL_TICK_MS);
    };

    const continueMatch = () => {
      if (game.mode !== 'point') return;
      game.mode = 'playing';
      newRound();
      drawField();
      showNote();
      startLoop();
    };

    // How far a straight line stays alive — the house's whole mind:
    // keep going while it's safe, turn for the roomier side when it
    // isn't, wander once in a while so the line has a hand on it.
    // Beatable on purpose.
    const roomToward = (x, y, dx, dy) => {
      let room = 0;
      while (room < 14) {
        x += dx;
        y += dy;
        if (game.occupied.has(cellKey(x, y))) break;
        room += 1;
      }
      return room;
    };

    const steerHouse = () => {
      const { q } = game;
      const options = [
        { dx: q.dx, dy: q.dy },
        { dx: q.dy, dy: -q.dx },
        { dx: -q.dy, dy: q.dx },
      ].map(option => ({ ...option, room: roomToward(q.x, q.y, option.dx, option.dy) }));
      const ahead = options[0];
      const best = [...options].sort((a, b) => b.room - a.room)[0];
      const wander = Math.random() < 0.0625 && best.room > 4;
      const pick = (ahead.room >= 3 && !wander) ? ahead : best;
      q.dx = pick.dx;
      q.dy = pick.dy;
    };

    const endRound = (pDead, qDead, pn, qn) => {
      stopMotion();
      if (pDead) paintCell(pn.x, pn.y, HUES.crash);
      if (qDead) paintCell(qn.x, qn.y, HUES.crash);
      if (pDead && !qDead) game.house += 1;
      if (qDead && !pDead) game.you += 1;
      game.last = pDead && qDead ? 'both' : pDead ? 'house' : 'you';
      updateScore();
      if (game.you >= WIN_AT || game.house >= WIN_AT) {
        game.mode = 'over';
        showNote();
        return;
      }
      game.mode = 'point';
      showNote();
      motionTimer = setTimeout(continueMatch, 1200);
    };

    const tick = () => {
      steerHouse();
      const { p, q } = game;
      const pn = { x: p.x + p.dx, y: p.y + p.dy };
      const qn = { x: q.x + q.dx, y: q.y + q.dy };
      const headOn = (pn.x === qn.x && pn.y === qn.y) ||
        (pn.x === q.x && pn.y === q.y && qn.x === p.x && qn.y === p.y);
      const pDead = headOn || game.occupied.has(cellKey(pn.x, pn.y));
      const qDead = headOn || game.occupied.has(cellKey(qn.x, qn.y));
      if (pDead || qDead) {
        endRound(pDead, qDead, pn, qn);
        return;
      }
      [[p, pn], [q, qn]].forEach(([actor, next]) => {
        actor.x = next.x;
        actor.y = next.y;
        // the direction actually walked — the reversal guard compares
        // against this, not the pending one, so two quick taps inside
        // one tick can never fold the line onto itself
        actor.wentDx = actor.dx;
        actor.wentDy = actor.dy;
        game.occupied.add(cellKey(actor.x, actor.y));
        paintCell(actor.x, actor.y, actor.color);
      });
    };

    const renderGames = badge => {
      if (!feedLoaded) {
        picture.innerHTML =
          `<p class="tv-date">games dept.</p><p class="tv-text">NO DISK</p>
           <p class="tv-game-hint">the console's slot is empty.</p>${badge}`;
        return;
      }
      if (game.mode === 'playing') game.mode = 'paused';
      picture.innerHTML = `<div class="tv-game">
          <p class="tv-game-score"></p>
          <div class="tv-game-field"></div>
          <div class="tv-game-note"></div>
        </div>${badge}`;
      game.field = picture.querySelector('.tv-game-field');
      game.score = picture.querySelector('.tv-game-score');
      game.note = picture.querySelector('.tv-game-note');
      drawField();
      updateScore();
      showNote();
      if (game.mode === 'point') motionTimer = setTimeout(continueMatch, 1200);
    };

    // Arrows steer; any of them wakes the title, the pause and the
    // game-over screen. The listener is document-level (a game takes
    // the room's keyboard), so it bails hard: only while the set is
    // open, on, tuned to CH 3, wearing a loaded console — and never
    // out of a form field.
    const GAME_KEYS = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    document.addEventListener('keydown', event => {
      if (win.hidden || !powered || channel !== 2 || !feedConnected || !feedLoaded) return;
      if (phoneGlass.matches) return;
      if (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const dir = GAME_KEYS[event.key];
      if (!dir) return;
      event.preventDefault();
      if (game.mode === 'playing') {
        if (dir[0] !== -game.p.wentDx || dir[1] !== -game.p.wentDy) {
          game.p.dx = dir[0];
          game.p.dy = dir[1];
        }
        return;
      }
      if (game.mode === 'title' || game.mode === 'over' || game.mode === 'paused') {
        if (game.mode !== 'paused') {
          game.you = 0;
          game.house = 0;
          newRound();
          drawField();
        }
        game.mode = 'playing';
        updateScore();
        showNote();
        startLoop();
      }
    });

    // The cross-module doors, the Trash's side of the cable. setFeed is
    // the whole protocol: the Trash says what is on the antenna line
    // (plugged? loaded?), the set draws its own conclusions on CH 3.
    // Unplugging kills the match — a dead line forgets the score.
    const setFeed = ({ connected = false, loaded = false } = {}) => {
      const hadFeed = feedConnected;
      feedConnected = Boolean(connected);
      feedLoaded = Boolean(loaded);
      if (hadFeed && !feedConnected) {
        game.mode = 'title';
        game.you = 0;
        game.house = 0;
        game.p = null;
        game.q = null;
        game.cells = [];
        game.occupied = new Set();
      }
      if (!win.hidden && powered && channel === 2) render();
      if (!win.hidden) restartAuto();
    };

    // The antenna jack, offered to the Trash's plug: its patch of
    // bezel (for the drop and the hover glow), honest about phones and
    // a closed window.
    const jack = () => {
      if (win.hidden || phoneGlass.matches) return null;
      const rect = tvJack.getBoundingClientRect();
      // The centre is for hit-testing the hovering plug; the rect is
      // the socket's own footprint, which the console module mates its
      // plug onto (the plug's measurements are the plug's business).
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
    };

    const jackWilling = on => tvJack.classList.toggle('willing', Boolean(on));

    // The socket shows only while there is a plug in hand to receive —
    // the Trash arms it on grab, disarms it on release (a plugged cord
    // hides the port behind its own head, as a real one does).
    const jackShow = on => tvJack.classList.toggle('armed', Boolean(on));

    // The cord's landing strip inside this window: the console module
    // deals the cable's cells onto it, so the strand from the window's
    // edge to the jack rides THIS window's stacking (and vanishes with
    // it).
    const feedLayer = () => {
      if (win.hidden || phoneGlass.matches) return null;
      return feedOverlay;
    };

    // ---- window plumbing: shared chrome; only the set's rituals are ours --
    const { open: openTV } = VI.attachWindowChrome(win, {
      title: 'TV',
      closeLabel: 'Close TV window',
      icon,
      onOpen: () => {
        channel = 0;
        render();
        restartAuto();
      },
      onClose: () => {
        clearTimeout(autoTimer);
        stopMotion();
        feedOverlay.innerHTML = '';
      },
    });

    // Public doors: the page switches the TV on when the reader arrives
    // (see the welcome script at the foot of index.html) —
    // opening always lands on CH 1 and starts the news roll. The rest
    // are the Trash's: the antenna jack (point, glow) and the feed.
    window.TVApp = { open: openTV, jack, jackShow, jackWilling, setFeed, feedLayer };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
