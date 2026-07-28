// control-panel.js — the Control Panel: a classic-Mac settings window with
// an icon sidebar and panes, following the wallet/news feature-module
// pattern (the page supplies .mac-window chrome + VisualIdentity helpers).
//
// Panes: System (about — version, copyright, colophon), User (the guest
// session; owner routed to Contacts), Looks (dark mode, synced with the wall
// light switch via VisualIdentity.setTheme + the identity-theme-change
// event; CRT scanlines). Choices persist in localStorage:
// identity-theme / identity-crt.
(() => {
  // Build version, stamped into version.js from git (see stamp-version.sh):
  // 0.1.<commit-count>+<short-hash> alpha. Falls back to a dev label if the
  // page is opened without a stamp.
  const SYSTEM_VERSION = window.__SYSTEM_VERSION__ || '0.1.dev alpha';

  const PANES = [
    { id: 'system', label: 'System', icon: 'icons/monitor.svg' },
    { id: 'user', label: 'Users', icon: 'icons/user.svg' },
    { id: 'appearance', label: 'Looks', icon: 'icons/contrast.svg' }
  ];

  const CSS = `
    .panel-window .cp {
      display: flex;
      min-height: 320px;
    }

    /* Folded — on a wide desk the sidebar tucks away and the pane takes the
       room; on a phone this is level two of the menu (the pane), the sidebar
       being level one. The fold control + chevron are shared window chrome
       (see .mac-fold in the page); this supplies only what folding hides. */
    .panel-window .cp.folded .cp-side { display: none; }

    /* Sidebar: the classic icon list. */
    .panel-window .cp-side {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 16px;
      border-right: 4px solid var(--identity-normal);
    }

    .panel-window .cp-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 96px;
      padding: 8px 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--identity-normal);
      cursor: pointer;
    }

    .panel-window .cp-tab img {
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    /* The 16px icon set bakes light-mode ink; on dark paper the sidebar
       glyphs invert to read as light ink. Screen-content colors inside
       the panes are unaffected. */
    html[data-theme="dark"] .panel-window .cp-tab img { filter: invert(1); }

    .panel-window .cp-tab[aria-selected="true"] { background: var(--identity-tint-soft); }

    .panel-window .cp-tab:hover { color: var(--identity-primary-ink); }

    .panel-window .cp-tab:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .panel-window .cp-pane {
      flex: 1;
      padding-left: 24px;
      min-width: 336px;
    }

    /* Narrow — the sidebar plus a 336px pane wants ~460px, which no phone has,
       so this becomes the same two-level menu as Contacts: the sidebar is level
       one, a full-width list of sections; picking one folds to that pane, level
       two; the fold control is the way back. One pane fills the window at a
       time. The tabs become full-width rows (icon beside label) — a menu, not a
       rail. The sidebar stays a column (its base direction); only its desk-side
       border and floor come off. */
    @media (max-width: 640px) {
      .panel-window .cp-side { padding-right: 0; border-right: 0; flex: 1; }
      .panel-window .cp-tab {
        flex-direction: row;
        justify-content: flex-start;
        gap: 16px;
        width: auto;
        padding: 8px;
      }
      .panel-window .cp-pane { min-width: 0; padding-left: 0; }
      .panel-window .cp:not(.folded) .cp-pane { display: none; }
    }

    .panel-window .cp-pane h3 {
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 24px;
      font-weight: 700;
    }

    .panel-window .cp-row {
      margin: 0 0 8px;
      color: var(--identity-gray);
    }

    .panel-window .cp-row b {
      color: var(--identity-normal);
      font-weight: 400;
    }

    /* A quiet section label above a block of rows (chrome size, 16px). */
    .panel-window .cp-kicker {
      margin: 0 0 8px;
      color: var(--identity-gray);
      font-size: 16px;
      line-height: 24px;
    }

    .panel-window .cp-note {
      margin: 24px 0 0;
      color: var(--identity-gray);
    }

    /* Identity panes (System, User) lead with a hero: a pixel glyph beside
       the title and a quiet subline. The glyph is monochrome ink, so on dark
       paper it inverts like the sidebar icons. */
    .panel-window .cp-hero {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 0 0 24px;
    }

    .panel-window .cp-hero img {
      width: 64px;
      height: 64px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    html[data-theme="dark"] .panel-window .cp-hero img { filter: invert(1); }

    .panel-window .cp-hero h3 { margin: 0; }
    .panel-window .cp-hero p { margin: 0; color: var(--identity-gray); }

    /* The hero carries the account action (sign in… / sign out), pushed
       to the far side of the profile it acts on. */
    .panel-window .cp-hero .cp-btn { margin-left: auto; }

    /* Colour avatars are pixel art on fixed grids — integer scale only,
       and never inverted with the monochrome glyphs in dark mode. sana's
       portrait is a 24 grid (72 = 3x); jiali's round avatar is a 64 grid
       (64 = 1x), padded right so both rows' text starts on one line. */
    .panel-window .cp-hero img.cp-portrait { width: 72px; height: 72px; }
    html[data-theme="dark"] .panel-window .cp-hero img.cp-portrait,
    html[data-theme="dark"] .panel-window .cp-avatar.cp-portrait { filter: none; }

    /* Account rows: an avatar beside a name and a quiet status line. On
       the sign-in screen the rows are buttons — a pick-a-user list; the
       picked one (sana, the only account this desk may ask a password
       for) wears the selected fill. */
    .panel-window .cp-account {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 0 0 8px;
    }

    .panel-window button.cp-account {
      width: 100%;
      padding: 8px;
      border: 0;
      background: transparent;
      font: inherit;
      text-align: left;
      color: var(--identity-normal);
      cursor: pointer;
    }

    .panel-window button.cp-account[aria-pressed="true"] { background: var(--identity-tint-soft); }

    .panel-window button.cp-account:hover { color: var(--identity-primary-ink); }

    .panel-window button.cp-account:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .panel-window .cp-avatar {
      width: 72px;
      height: 72px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .panel-window .cp-avatar.cp-avatar-64 {
      width: 64px;
      height: 64px;
      margin-right: 8px;
    }

    .panel-window .cp-account p { margin: 0; }
    .panel-window .cp-account .cp-sub { color: var(--identity-gray); }

    /* Her icon is a button — the wardrobe door. */
    .panel-window .cp-icon-toggle {
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .panel-window .cp-icon-toggle:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* sana's icon wardrobe, unfolded beneath the hero by clicking her
       icon: a wrapping row of 48px chips (24-grid at 2x). The worn one
       carries the same accent ring the swatches use; the gap leaves the
       ring its 6px of air. */
    .panel-window .cp-icons {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 0 0 16px;
    }

    .panel-window .cp-icon-chip {
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    .panel-window .cp-icon-chip img {
      display: block;
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .panel-window .cp-icon-chip[aria-pressed="true"] img {
      box-shadow: 0 0 0 2px var(--identity-paper), 0 0 0 6px var(--identity-primary);
    }

    .panel-window .cp-icon-chip:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* The login row: a pixel password field and a pixel button. The field
       is a plain text input masked by CSS, NOT type=password — a joke
       riddle must never smell like a credential to a password manager.
       (Engines without -webkit-text-security show the digits; for a
       password that is a riddle about being guessable, acceptable.) */
    .panel-window .cp-login {
      display: flex;
      gap: 16px;
      margin: 0 0 8px;
    }

    .panel-window .cp-input {
      flex: 1;
      min-width: 0;
      padding: 4px 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      -webkit-text-security: disc;
    }

    .panel-window .cp-input:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .panel-window .cp-btn {
      padding: 4px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      cursor: pointer;
    }

    .panel-window .cp-btn:hover { color: var(--identity-primary-ink); }
    .panel-window .cp-btn:active { translate: 4px 4px; }

    .panel-window .cp-btn:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* Dead controls (the admin's): present, honest, unanswerable — text,
       placeholder and border all step down to gray so they read as
       unavailable at a glance. Placed after the hover rules so the gray
       wins on a disabled hover. */
    .panel-window .cp-btn:disabled,
    .panel-window .cp-input:disabled {
      color: var(--identity-gray);
      border-color: var(--identity-gray);
      cursor: not-allowed;
    }

    .panel-window .cp-input:disabled::placeholder { color: var(--identity-gray); }

    /* The passkey control fills the row an input would have taken. */
    .panel-window .cp-passkey { flex: 1; }

    /* Wrong password: the classic login shake, in whole cells. */
    .panel-window .cp-login.shake { animation: cp-shake 200ms linear; }

    @keyframes cp-shake {
      0%, 100% { translate: 0 0; }
      25% { translate: -8px 0; }
      75% { translate: 8px 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel-window .cp-login.shake { animation: none; }
    }

    .panel-window .cp-lede { margin: 0 0 24px; color: var(--identity-normal); }

    /* A quiet pixel-dashed divider: 4px on, 4px off — locked to the grid. */
    .panel-window .cp-rule {
      height: 4px;
      margin: 24px 0;
      background: repeating-linear-gradient(to right,
        var(--identity-tint-shadow) 0 4px, transparent 4px 8px);
    }

    .panel-window .cp-legal {
      margin: 0 0 8px;
      color: var(--identity-gray);
    }

    .panel-window .cp-legal b {
      color: var(--identity-normal);
      font-weight: 400;
    }

    .panel-window .cp-pane a { color: var(--identity-normal); }
    .panel-window .cp-pane a:hover { color: var(--identity-primary-ink); }

    /* Pixel checkbox: ink box, primary block when on. */
    .panel-window .cp-check {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 0 0 16px;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--identity-normal);
      cursor: pointer;
    }

    .panel-window .cp-check::before {
      content: '';
      width: 24px;
      height: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .panel-window .cp-check[aria-pressed="true"]::before {
      background: var(--identity-primary);
      box-shadow: inset 0 0 0 4px var(--identity-paper);
    }

    .panel-window .cp-check:hover { color: var(--identity-primary-ink); }

    .panel-window .cp-check:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    /* Accent picker: a row of colour chips; the chosen one wears a primary
       ring. Chips carry their own colour via --sw so they read the same in
       either theme. */
    .panel-window .cp-accents {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
      margin: 0 0 16px;
    }

    .panel-window .cp-swatch {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--identity-gray);
      cursor: pointer;
    }

    .panel-window .cp-swatch::before {
      content: '';
      width: 24px;
      height: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--sw);
    }

    .panel-window .cp-swatch[aria-pressed="true"] { color: var(--identity-normal); }

    .panel-window .cp-swatch[aria-pressed="true"]::before {
      box-shadow: 0 0 0 2px var(--identity-paper), 0 0 0 6px var(--identity-primary);
    }

    .panel-window .cp-swatch:hover { color: var(--identity-primary-ink); }

    .panel-window .cp-swatch:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    /* CRT scanlines: the emulation made visible — an overlay above the
       windows, below the transition. Lines derive from ink, so they read
       as shadow rows in light mode and lit phosphor rows in dark. */
    .crt-overlay {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      display: none;
      background: repeating-linear-gradient(
        to bottom,
        color-mix(in srgb, var(--identity-normal) 10%, transparent) 0 2px,
        transparent 2px 4px
      );
    }

    html[data-crt="on"] .crt-overlay { display: block; }
  `;

  const boot = () => {
    const icon = document.querySelector('.controls-icon');
    const VI = window.VisualIdentity;
    if (!icon || !VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    // ---- persisted state, applied at load ----
    const applyCrt = on => {
      if (on) {
        document.documentElement.dataset.crt = 'on';
      } else {
        delete document.documentElement.dataset.crt;
      }
      localStorage.setItem('identity-crt', on ? 'on' : 'off');
    };
    applyCrt(localStorage.getItem('identity-crt') === 'on');

    document.body.appendChild(Object.assign(document.createElement('div'), { className: 'crt-overlay' }));

    // ---- the window ----
    const win = document.createElement('section');
    win.className = 'mac-window panel-window';
    win.hidden = true;
    // Titlebar, dialog role and door wiring come from attachWindowChrome
    // below; this template is only what is the Control Panel's own.
    win.innerHTML = `
      <div class="mac-content">
        <div class="mac-foldbar">
          <button class="mac-fold" type="button" aria-label="Hide sections"
            aria-expanded="true" aria-controls="cp-side" title="Sections">
            <span class="mac-chev" aria-hidden="true"></span>
            <span>Menu</span>
          </button>
        </div>
        <div class="cp">
          <nav class="cp-side" id="cp-side" aria-label="Control panel sections">
            ${PANES.map(pane => `
              <button class="cp-tab" type="button" data-pane="${pane.id}"
                aria-selected="${pane.id === 'system'}">
                <img src="${pane.icon}" alt="" draggable="false" />
                <span>${pane.label}</span>
              </button>`).join('')}
          </nav>
          <div class="cp-pane"></div>
        </div>
      </div>`;
    document.body.appendChild(win);

    const paneHost = win.querySelector('.cp-pane');
    const tabs = [...win.querySelectorAll('.cp-tab')];

    // The foldable sidebar — same drawer/two-level control as Contacts. Unlike
    // Contacts (a card with an optional list), the sections ARE the navigation,
    // so it opens UNFOLDED: sidebar beside the pane on a desk, the section menu
    // on a phone. The fold button collapses it on a desk and, on a phone, is
    // the way back up a level.
    const cp = win.querySelector('.cp');
    const setFolded = VI.makeFoldable(win.querySelector('.mac-fold'), cp,
      { show: 'Show sections', hide: 'Hide sections' });

    // A few no-permission facts about the machine opening the page, read
    // fresh each time the pane shows. Everything here is displayed and never
    // sent; Chromium-only fields (deviceMemory, connection) fold in only when
    // present — memory drops its row entirely when absent. OS/browser come from
    // the UA string — the cross-browser common denominator — so they are
    // best-effort, not exact.
    const machineRows = () => {
      const s = screen;
      const nav = navigator;
      const ua = nav.userAgent || '';
      const mq = q => matchMedia(q).matches;
      const dpr = Math.round((devicePixelRatio || 1) * 100) / 100;

      const os =
        /Windows NT/.test(ua) ? 'Windows' :
        /iP(hone|ad|od)/.test(ua) ? 'iOS' :
        /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
        /Android/.test(ua) ? 'Android' :
        /CrOS/.test(ua) ? 'ChromeOS' :
        /Linux/.test(ua) ? 'Linux' : '—';

      const browser = (() => {
        let m;
        if ((m = ua.match(/Edg\/(\d+)/))) return `Edge ${m[1]}`;
        if ((m = ua.match(/OPR\/(\d+)/))) return `Opera ${m[1]}`;
        if ((m = ua.match(/FxiOS\/(\d+)/)) || (m = ua.match(/Firefox\/(\d+)/))) return `Firefox ${m[1]}`;
        if ((m = ua.match(/CriOS\/(\d+)/)) || (m = ua.match(/Chrome\/(\d+)/))) return `Chrome ${m[1]}`;
        if (/Safari/.test(ua)) { m = ua.match(/Version\/(\d+)/); return m ? `Safari ${m[1]}` : 'Safari'; }
        return '—';
      })();

      const region = [Intl.DateTimeFormat().resolvedOptions().timeZone, nav.language]
        .filter(Boolean).join(' · ');
      const cpu = nav.hardwareConcurrency ? `${nav.hardwareConcurrency} cores` : '—';
      const memory = nav.deviceMemory ? `${nav.deviceMemory} GB` : '';
      const network = [nav.onLine ? 'online' : 'offline',
        nav.connection && nav.connection.effectiveType].filter(Boolean).join(' · ');

      // Straight rows — the readout carries itself; the one wink ("do the specs
      // look familiar?") is left to close the block in renderSystem. The system
      // row is the gag: System 8 declines to admit you are anywhere else.
      return [
        ['display', `${s.width} × ${s.height} · ${dpr}×`],
        ['system', os === '—' ? 'unrecognised, frankly' : `definitely not ${os}`],
        ['browser', browser],
        ['region', region],
        ['cpu', cpu],
        memory && ['memory', memory],
        ['input', mq('(pointer: coarse)') ? 'touch' : 'mouse / trackpad'],
        ['network', network],
      ].filter(Boolean)
        .map(([k, v]) => `<p class="cp-row">${k}: <b>${v}</b></p>`).join('');
    };

    // ---- panes ----
    // System: the "about this computer" front, in two readouts — "this desk"
    // (the OS you are actually in, and whose work it houses) and "this machine"
    // (the visitor's own hardware, read live). The pair is the joke: the desk
    // runs System 8; your machine is definitely not what it says it is.
    // No lede under the hero for now — nothing worth saying there yet. The
    // .cp-lede rule is left in the sheet for whenever a good line turns up.
    const renderSystem = () => {
      paneHost.innerHTML = `
        <div class="cp-hero">
          <img src="icons/monitor.svg" alt="" draggable="false" />
          <div><h3>System 8</h3><p>${SYSTEM_VERSION}</p></div>
        </div>
        <div class="cp-rule"></div>
        <p class="cp-kicker">this desk</p>
        <p class="cp-row">system: <b>System 8</b></p>
        <p class="cp-row">owner: <b>Jiali Ma · see Contacts</b></p>
        <p class="cp-row">pci slot 1: <b>disk recovery card</b></p>
        <div class="cp-rule"></div>
        <p class="cp-kicker">this machine</p>
        ${machineRows()}
        <p class="cp-note">do the specs look familiar?</p>
        <div class="cp-rule"></div>
        <p class="cp-legal">(c) 2026 <b>Jiali Ma</b> · all rights reserved</p>`;
    };

    // Users: the desk has two accounts and neither is the visitor's own.
    // jiali (admin) is permanently logged in elsewhere — this desk is
    // explored in third person, never as the owner. sana is the resident:
    // signing in as her (VisualIdentity.setUser) is the door to the play
    // layer — the trash can today, more later. Her password is a riddle,
    // not a credential: 123456, the world's favourite password, which she
    // refuses to change. Nothing typed here goes anywhere — the check is
    // local, misses aren't stored, and after two of them a hint appears.
    //
    // The pane is a two-screen flow: the hero (the profile block) carries
    // the account action — sign in… as a guest, sign out as sana — and
    // the sign-in screen is the classic pick-a-user shape: the accounts
    // list to choose from (sana comes pre-picked; the admin only explains
    // herself), the password prompt below, cancel the way back. Entering
    // the pane always lands on the profile; misses keep their count
    // across cancels, so a hint once earned stays earned. Counts are read
    // fresh each time the pane shows.
    const RESIDENT = 'sana';
    const RESIDENT_PASSWORD = '123456';

    // sana's wardrobe: every icon she can wear — 24-grid variants of the
    // same portrait (avatars/generate.py drew them), expressions first,
    // then accessories, then the little scenes. The choice outlives the
    // session (it is her icon, not the visitor's), lives beside the other
    // identity keys, and is worn everywhere her account shows.
    const SANA_ICONS = ['sana', 'happy', 'laughing', 'wink', 'shy', 'pout',
      'surprised', 'teary', 'thinking', 'sleepy', 'starry', 'heart',
      'glasses', 'beret', 'grad', 'coffee', 'phones', 'sakura', 'night',
      'snow', 'window'];
    const sanaIcon = () => {
      const stored = localStorage.getItem('identity-sana-icon');
      return SANA_ICONS.includes(stored) ? stored : 'sana';
    };
    const sanaIconSrc = () => `avatars/${sanaIcon()}.svg`;

    let loginMisses = 0;
    let userView = 'list';   // 'list' | 'signin' — the Users pane's screen
    let pickedUser = 'sana'; // the account selected on the sign-in screen
    let wardrobeOpen = false; // the icon wardrobe, unfolded by clicking her icon
    let pawTimer = 0;        // the paw reader's verification beat
    let pawTicker = 0;       // the dots ticking on the button while it reads

    // Signing in works anywhere — but the play layer it unlocks is
    // desk-exclusive, so on a phone the pane says so out loud instead of
    // gating the door. (Breakpoint mirrors VisualIdentity.isPhone.)
    const phoneMedia = matchMedia('(max-width: 640px)');

    const renderUser = () => {
      // a re-render outruns any pending paw verdict and its ticking dots
      clearTimeout(pawTimer);
      clearInterval(pawTicker);
      const open = document.querySelectorAll('.mac-window:not([hidden])').length;
      const signedIn = document.documentElement.dataset.user === RESIDENT;

      // The sign-in screen, asked for from the profile: a real pick-a-user
      // list. All three accounts select; the credential block below follows
      // the selection — and only sana's can actually be answered. jiali's
      // controls are present but dead (the admin is logged in elsewhere);
      // mochi signs in by passkey, and the attempt reliably fails: the
      // desk's paw reader knows a hand when it sees one.
      if (!signedIn && userView === 'signin') {
        const CREDENTIALS = {
          sana: `
            <p class="cp-kicker">enter sana's password</p>
            <div class="cp-login">
              <input class="cp-input" type="text" autocomplete="off" autocapitalize="off"
                spellcheck="false" aria-label="sana's password" placeholder="password" />
              <button class="cp-btn" type="button" data-signin>sign in</button>
            </div>`,
          jiali: `
            <p class="cp-kicker">enter jiali's password</p>
            <div class="cp-login">
              <input class="cp-input" type="text" disabled placeholder="password"
                aria-label="jiali's password (unavailable)" />
              <button class="cp-btn" type="button" disabled>sign in</button>
            </div>`,
          mochi: `
            <p class="cp-kicker">use mochi's passkey</p>
            <div class="cp-login">
              <button class="cp-btn cp-passkey" type="button" data-passkey>use passkey…</button>
            </div>`,
        };
        const OPENERS = {
          sana: loginMisses >= 2
            ? 'hint: <b>the world’s favourite password — just count to six.</b>'
            : '',
          jiali: 'this user is logged in elsewhere.',
          mochi: 'mochi does not use passwords but a paw reader.',
        };
        const account = (id, avatar, sizeClass, name, role, sub) => `
          <button class="cp-account" type="button" data-pick="${id}"
            aria-pressed="${pickedUser === id}">
            <img class="cp-avatar cp-portrait${sizeClass}" src="${avatar}" alt="" draggable="false" />
            <div>
              <p>${name} · <b>${role}</b></p>
              ${sub ? `<p class="cp-sub">${sub}</p>` : ''}
            </div>
          </button>`;

        paneHost.innerHTML = `
          <h3>sign in</h3>
          <p class="cp-kicker">select a user</p>
          ${account('sana', sanaIconSrc(), '', 'sana', 'resident', '')}
          ${account('jiali', 'avatars/jiali-round.svg', ' cp-avatar-64', 'jiali', 'admin', 'logged in elsewhere')}
          ${account('mochi', 'avatars/cat.svg', '', 'mochi', 'maintainer', '')}
          <div class="cp-rule"></div>
          ${CREDENTIALS[pickedUser]}
          <p class="cp-row cp-status" aria-live="polite"></p>
          <div class="cp-rule"></div>
          <button class="cp-btn" type="button" data-cancel>cancel</button>`;

        const row = paneHost.querySelector('.cp-login');
        const input = paneHost.querySelector('.cp-input');
        const status = paneHost.querySelector('.cp-status');
        status.innerHTML = OPENERS[pickedUser];
        const shake = () => {
          row.classList.remove('shake');
          void row.offsetWidth;
          row.classList.add('shake');
        };

        paneHost.querySelectorAll('[data-pick]').forEach(btn =>
          btn.addEventListener('click', () => {
            if (pickedUser === btn.dataset.pick) {
              input?.focus();
              return;
            }
            pickedUser = btn.dataset.pick;
            renderUser();
          }));

        if (pickedUser === 'sana') {
          const trySignIn = () => {
            if (input.value === RESIDENT_PASSWORD) {
              loginMisses = 0;
              userView = 'list';
              VI.setUser(RESIDENT);
              renderUser();
              return;
            }
            loginMisses += 1;
            input.value = '';
            shake();
            status.innerHTML = loginMisses >= 2
              ? 'wrong password. hint: <b>the world’s favourite password — just count to six.</b>'
              : 'wrong password.';
            input.focus();
          };
          paneHost.querySelector('[data-signin]').addEventListener('click', trySignIn);
          input.addEventListener('keydown', event => {
            if (event.key === 'Enter') trySignIn();
          });
          input.focus();
        }

        // A passkey does not fail instantly — verification takes a beat,
        // and it shows on the button itself: the label reads while the
        // reader reads, dots ticking. The opener line stays put meanwhile
        // (on a retry it returns, displacing the old verdict); the verdict
        // lands in the status line afterwards, the way a wrong password
        // does.
        paneHost.querySelector('[data-passkey]')?.addEventListener('click', event => {
          const button = event.currentTarget;
          button.disabled = true;
          status.innerHTML = OPENERS.mochi;
          let dots = 0;
          button.textContent = 'reading paw';
          clearInterval(pawTicker);
          pawTicker = setInterval(() => {
            dots = (dots + 1) % 4;
            button.textContent = 'reading paw' + '.'.repeat(dots);
          }, 250);
          clearTimeout(pawTimer);
          pawTimer = setTimeout(() => {
            clearInterval(pawTicker);
            button.textContent = 'use passkey…';
            button.disabled = false;
            shake();
            status.textContent = 'no paw detected — please place a paw on the reader.';
          }, 1000);
        });

        paneHost.querySelector('[data-cancel]').addEventListener('click', () => {
          userView = 'list';
          renderUser();
        });
        return;
      }

      if (!signedIn) {
        paneHost.innerHTML = `
          <div class="cp-hero">
            <img src="icons/user.svg" alt="" draggable="false" />
            <div><h3>Guest</h3><p>visitor</p></div>
            <button class="cp-btn" type="button" data-signin-open>sign in…</button>
          </div>
          <div class="cp-rule"></div>
          <p class="cp-kicker">this session</p>
          <p class="cp-row">access: <b>read-only</b></p>
          <p class="cp-row">windows open: <b>${open}</b></p>
          ${phoneMedia.matches ? `<p class="cp-note">sign-in works here, but
            the full experience is desktop-only — sana’s things need the
            room a desk gives.</p>` : ''}`;

        paneHost.querySelector('[data-signin-open]').addEventListener('click', () => {
          userView = 'signin';
          pickedUser = 'sana';
          renderUser();
        });
      } else {
        // What signing in changed, said out loud: on a desk the trash can
        // just appeared bottom right; on a phone nothing visibly did, so
        // the note sends the full experience to the desktop instead.
        // Her icon is the wardrobe door: clicking it unfolds the variants
        // right beneath, trying one applies it immediately (the wardrobe
        // stays open for flipping through looks), clicking the icon again
        // folds it away.
        paneHost.innerHTML = `
          <div class="cp-hero">
            <button class="cp-icon-toggle" type="button" data-wardrobe
              title="change icon" aria-label="change sana's icon"
              aria-expanded="${wardrobeOpen}">
              <img class="cp-portrait" src="${sanaIconSrc()}" alt="" draggable="false" />
            </button>
            <div><h3>sana</h3><p>resident · signed in</p></div>
            <button class="cp-btn" type="button" data-logout>sign out</button>
          </div>
          ${wardrobeOpen ? `
          <p class="cp-kicker">sana's icon</p>
          <div class="cp-icons">
            ${SANA_ICONS.map(name => `
              <button class="cp-icon-chip" type="button" data-icon="${name}"
                title="${name}" aria-pressed="${name === sanaIcon()}">
                <img src="avatars/${name}.svg" alt="${name}" draggable="false" />
              </button>`).join('')}
          </div>` : ''}
          <div class="cp-rule"></div>
          <p class="cp-kicker">this session</p>
          <p class="cp-row">access: <b>read + rummage</b></p>
          <p class="cp-row">windows open: <b>${open}</b></p>
          <p class="cp-note">${phoneMedia.matches
            ? 'sana’s things live on the desktop — the full experience needs a wider screen than this one.'
            : 'new on the desk: a trash can, bottom right. sana never empties it.'}</p>`;

        paneHost.querySelector('[data-wardrobe]').addEventListener('click', () => {
          wardrobeOpen = !wardrobeOpen;
          renderUser();
        });

        paneHost.querySelector('[data-logout]').addEventListener('click', () => {
          wardrobeOpen = false;
          VI.setUser(null);
          renderUser();
        });

        paneHost.querySelectorAll('[data-icon]').forEach(chip =>
          chip.addEventListener('click', () => {
            localStorage.setItem('identity-sana-icon', chip.dataset.icon);
            renderUser();   // the hero wears it immediately; the wardrobe stays open
          }));
      }
    };

    const renderAppearance = () => {
      const accent = document.documentElement.dataset.accent || 'indigo';
      const swatches = [
        ['indigo', '#4f46e5'], ['seafoam', '#82e3c0'],
      ].map(([name, chip]) => `<button class="cp-swatch" type="button" data-accent="${name}"
            style="--sw:${chip}" aria-pressed="${accent === name}">${name}</button>`).join('');
      paneHost.innerHTML = `
        <h3>Looks</h3>
        <button class="cp-check" type="button" data-setting="dark"
          aria-pressed="${document.documentElement.dataset.theme === 'dark'}">
          dark mode</button>
        <button class="cp-check" type="button" data-setting="crt"
          aria-pressed="${document.documentElement.dataset.crt === 'on'}">
          crt scanlines</button>
        <p class="cp-kicker">accent</p>
        <div class="cp-accents">${swatches}</div>
        <p class="cp-note">dark mode also lives on the wall switch, top right.</p>`;
      paneHost.querySelector('[data-setting="dark"]').addEventListener('click', event => {
        VI.setTheme(event.currentTarget.getAttribute('aria-pressed') !== 'true');
      });
      paneHost.querySelector('[data-setting="crt"]').addEventListener('click', event => {
        const on = event.currentTarget.getAttribute('aria-pressed') !== 'true';
        applyCrt(on);
        event.currentTarget.setAttribute('aria-pressed', String(on));
      });
      paneHost.querySelectorAll('.cp-swatch').forEach(sw => sw.addEventListener('click', event => {
        const chosen = event.currentTarget.dataset.accent;
        VI.setAccent(chosen);
        paneHost.querySelectorAll('.cp-swatch').forEach(s =>
          s.setAttribute('aria-pressed', String(s.dataset.accent === chosen)));
      }));
    };

    const renderers = {
      system: renderSystem,
      // Entering the pane always lands on the profile, never on a sign-in
      // screen or an open wardrobe left over from an earlier visit.
      user: () => { userView = 'list'; wardrobeOpen = false; renderUser(); },
      appearance: renderAppearance
    };

    const showPane = id => {
      tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.pane === id)));
      renderers[id]();
    };
    tabs.forEach(tab => tab.addEventListener('click', () => {
      showPane(tab.dataset.pane);
      // On a phone, choosing a section is drilling into level two — fold the
      // menu to the pane. On a desk the sidebar stays put, the way real
      // settings keep their rail while you click through it. (Folding lives
      // here, on the user's tap, not in showPane — opening must land on the
      // menu, and showPane also runs at boot and on open.)
      if (win.dataset.maximized) setFolded(true);
    }));
    showPane('system');

    // Keep the panel's dark-mode checkbox honest when the wall switch (or
    // the system preference) flips the theme while the pane is open.
    document.addEventListener('identity-theme-change', event => {
      const check = paneHost.querySelector('[data-setting="dark"]');
      if (check) check.setAttribute('aria-pressed', String(event.detail.dark));
    });

    // Crossing the phone boundary while the Users pane is showing (a tablet
    // rotating, a window narrowed) re-renders it, so its desk/phone notes
    // stay true to the screen they are on.
    phoneMedia.addEventListener('change', () => {
      const active = win.querySelector('.cp-tab[aria-selected="true"]');
      if (!win.hidden && active?.dataset.pane === 'user') renderUser();
    });

    // ---- window plumbing: shared chrome; only the open ritual is ours ----
    const { open: openPanel } = VI.attachWindowChrome(win, {
      title: 'Control Panel',
      closeLabel: 'Close control panel',
      icon,
      onOpen: () => {
        showPane('system');
        setFolded(false);   // open on the menu (phone) / sidebar beside pane (desk)
      },
    });

    // Public door: #controls deep-links here (see the page's welcome script).
    window.ControlPanelApp = { open: openPanel };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
