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
    { id: 'user', label: 'User', icon: 'icons/user.svg' },
    { id: 'appearance', label: 'Looks', icon: 'icons/contrast.svg' }
  ];

  const CSS = `
    .panel-window .cp {
      display: flex;
      min-height: 320px;
    }

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
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'panel-title');
    win.tabIndex = -1;
    win.hidden = true;
    win.innerHTML = `
      <header class="mac-titlebar">
        <button class="mac-close" type="button" aria-label="Close control panel"></button>
        <h2 class="mac-title" id="panel-title">Control Panel</h2>
      </header>
      <div class="mac-content">
        <div class="cp">
          <nav class="cp-side" aria-label="Control panel sections">
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
        <div class="cp-rule"></div>
        <p class="cp-kicker">this machine</p>
        ${machineRows()}
        <p class="cp-note">do the specs look familiar?</p>
        <div class="cp-rule"></div>
        <p class="cp-legal">(c) 2026 <b>Jiali Ma</b> · all rights reserved</p>`;
    };

    // User: the session belongs to the visitor — this desk is explored in
    // third person, not logged in as the owner. Everything here is scoped to
    // the visitor's own session; the desk's identity (system, owner) belongs to
    // the System pane. Counts are read fresh each time the pane shows.
    const renderUser = () => {
      const open = document.querySelectorAll('.mac-window:not([hidden])').length;
      paneHost.innerHTML = `
        <div class="cp-hero">
          <img src="icons/user.svg" alt="" draggable="false" />
          <div><h3>Guest</h3><p>visitor</p></div>
        </div>
        <div class="cp-rule"></div>
        <p class="cp-kicker">this session</p>
        <p class="cp-row">access: <b>read-only</b></p>
        <p class="cp-row">signed in: <b>no</b></p>
        <p class="cp-row">session: <b>this tab</b></p>
        <p class="cp-row">windows open: <b>${open}</b></p>`;
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
      user: renderUser,
      appearance: renderAppearance
    };

    const showPane = id => {
      tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.pane === id)));
      renderers[id]();
    };
    tabs.forEach(tab => tab.addEventListener('click', () => showPane(tab.dataset.pane)));
    showPane('system');

    // Keep the panel's dark-mode checkbox honest when the wall switch (or
    // the system preference) flips the theme while the pane is open.
    document.addEventListener('identity-theme-change', event => {
      const check = paneHost.querySelector('[data-setting="dark"]');
      if (check) check.setAttribute('aria-pressed', String(event.detail.dark));
    });

    // ---- window plumbing (same contract as wallet/news) ----
    const placeWindow = () => VI.placeWindow(win);

    const openPanel = () => {
      win.hidden = false;
      VI.raiseWindow(win);
      showPane('system');
      placeWindow();
      win.focus({ preventScroll: true });
    };

    const closePanel = () => {
      win.hidden = true;
      icon.focus({ preventScroll: true });
    };

    let pressX = 0;
    let pressY = 0;
    icon.addEventListener('pointerdown', event => {
      pressX = event.clientX;
      pressY = event.clientY;
    });
    icon.addEventListener('click', event => {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 4) return;
      if (win.hidden) {
        openPanel();
      } else {
        closePanel();
      }
    });

    win.querySelector('.mac-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !win.hidden) closePanel();
    });
    addEventListener('resize', placeWindow);

    const titlebar = win.querySelector('.mac-titlebar');
    let dragPointer = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let dragMoved = false;

    titlebar.addEventListener('pointerdown', event => {
      if (event.target.closest('.mac-close')) return;
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
