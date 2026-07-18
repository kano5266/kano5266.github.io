// tv.js — the TV: everything specific to the TV window lives in this
// file, following the wallet.js feature-module pattern (the page supplies
// .mac-window chrome + VisualIdentity helpers).
//
// Concept: a little CRT set with CHANNELS, not a news reader — programs
// live on channels so more can move in later (games, one day). Today's
// lineup: CH 1 is the news program (the latest item held on screen under
// a LIVE bug, older items crawling the ticker), CH 2 is the endroll (the
// whole timeline from news.md.js rolling up like end credits), CH 3 is
// the games department's "coming soon" card, CH 4 is the color-bars
// sign-off. Zapping shows a beat of pixel static (stepped frames, never
// smooth).
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
    .tv-window .tv-set {
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      padding: 16px;
      display: flex;
      gap: 16px;
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
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'tv-title');
    win.tabIndex = -1;
    win.hidden = true;
    win.innerHTML = `
      <header class="mac-titlebar">
        <button class="mac-close" type="button" aria-label="Close TV window"></button>
        <h2 class="mac-title" id="tv-title">TV</h2>
      </header>
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

    // The motion engine — one timer, 8px per tick, stepped by
    // construction. The endroll climbs and wraps below the glass; the
    // ticker crawls left and wraps past the right edge. Under reduced
    // motion both park at a readable position instead.
    const stopMotion = () => {
      clearInterval(motionTimer);
      motionTimer = null;
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
             <div class="tv-news-ticker"><span class="tv-ticker-inner">${crawl}</span></div>${badge}`
          : `<p class="tv-text">no news is good news</p>${badge}`;
        startTicker();
      } else if (item.roll) {
        // oldest first, so the credits end on the newest — like a fin
        const credits = [...items].reverse().map(entry =>
          `<p class="tv-roll-date">${entry.date}</p><p class="tv-roll-text">${entry.text}</p>`).join('');
        picture.innerHTML =
          `<div class="tv-roll"><p class="tv-roll-title">SYSTEM 8 · NEWS</p>${credits}
             <p class="tv-roll-fin">— fin —</p></div>${badge}`;
        startRoll();
      } else if (item.soon) {
        picture.innerHTML =
          `<p class="tv-date">games dept.</p><p class="tv-text">COMING SOON</p>${badge}`;
      } else {
        picture.innerHTML =
          `<span class="tv-bars" aria-hidden="true">${BAR_COLORS.map(color =>
            `<span style="background:${color}"></span>`).join('')}</span>${badge}`;
      }
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

    const placeWindow = () => VI.placeWindow(win);

    const openTV = () => {
      win.hidden = false;
      VI.raiseWindow(win);
      channel = 0;
      render();
      placeWindow();
      win.focus({ preventScroll: true });
      restartAuto();
    };

    const closeTV = () => {
      win.hidden = true;
      clearTimeout(autoTimer);
      stopMotion();
      icon.focus({ preventScroll: true });
    };

    // Public door: the page switches the TV on when the reader arrives (see the
    // welcome script at the foot of index.html). Opening always
    // lands on CH 1 and starts the news roll.
    window.TVApp = { open: openTV };

    // Click-vs-drag guard (same contract as the wallet icon).
    let pressX = 0;
    let pressY = 0;
    icon.addEventListener('pointerdown', event => {
      pressX = event.clientX;
      pressY = event.clientY;
    });
    icon.addEventListener('click', event => {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 4) return;
      if (win.hidden) {
        openTV();
      } else {
        closeTV();
      }
    });

    win.querySelector('.mac-close').addEventListener('click', closeTV);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !win.hidden) closeTV();
    });
    addEventListener('resize', placeWindow);

    // Title-bar drag, grid-snapped (same implementation as the wallet).
    const titlebar = win.querySelector('.mac-titlebar');
    let dragPointer = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let dragMoved = false;

    titlebar.addEventListener('pointerdown', event => {
      if (event.target.closest('.mac-close')) return;
      if (win.dataset.maximized) return;   // it IS the desk; nowhere to drag it to
      dragPointer = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      const rect = win.getBoundingClientRect();
      dragOriginX = rect.left;
      dragOriginY = rect.top;
      dragMoved = false;
      titlebar.setPointerCapture(event.pointerId);
    });

    titlebar.addEventListener('pointermove', event => {
      if (event.pointerId !== dragPointer) return;
      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (!dragMoved && Math.abs(deltaX) + Math.abs(deltaY) <= 4) return;
      dragMoved = true;
      win.dataset.userMoved = 'true';
      win.classList.add('dragging');
      win.style.left = `${VI.snap(dragOriginX) + VI.snapDelta(deltaX)}px`;
      win.style.top = `${VI.snap(dragOriginY) + VI.snapDelta(deltaY)}px`;
    });

    const endDrag = event => {
      if (event.pointerId !== dragPointer) return;
      dragPointer = null;
      win.classList.remove('dragging');
    };
    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
