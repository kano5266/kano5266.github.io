// chat.js — Messages: the chat app where Jiali talks to the reader. Like
// wallet.js, everything specific to it lives in this one module (styles,
// markup, choreography, and the pile of functions only a message app
// needs); the page supplies .mac-window chrome + VisualIdentity helpers.
//
// Anatomy of a real messenger, in pixels:
//   - contact header: avatar + name + presence (offline / online / typing…)
//   - tapping the avatar (header or any bubble's) opens the CONTACT CARD —
//     a profile pane over the thread, like every real message app. It's
//     the iOS-style cut of the owner's Contacts record (window.ContactsData,
//     from contacts.md.js): info + links in inset groups, notes omitted —
//     the full macOS-style CV lives in the Contacts app
//   - the thread IS the news timeline (news.md.js): old items replay as
//     dated history, and the NEWEST is the unread message the red dot was
//     for — she posted it while away, so it's already sitting there when
//     you open. She reads OFFLINE; a few seconds later she comes ONLINE
//     and types her greetings live behind a stepped "…" indicator
//     (mimic reality — you open to an unread message, then the person
//     turns up)
//   - quick replies: each gets one typed answer from Jiali; reader bubbles
//     carry delivery receipts (delivered → read when she starts typing)
//   - tapbacks: clicking one of her bubbles toggles a pixel-heart reaction
//   - stickers: the cat can be sent once — she has opinions about that
//   - the icon's unread badge greets EVERY visit: read state is in-memory
//     only, so each page load starts unread (and replays the typed-in
//     thread); opening the window clears it until the next load
(() => {
  const TYPE_MS = 700;          // typing dwell for the opening thread
  const REPLY_TYPE_MS = 900;    // typing dwell before an auto-reply
  const OFFLINE_MS = 3000;      // she reads offline, then comes online to greet

  const CSS = `
    /* ---- contact header ---- */
    .chat-window .chat-head {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 16px;
      border-bottom: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .chat-window .chat-head-avatar {
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      line-height: 0;
    }

    .chat-window .chat-head-avatar img {
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .chat-window .chat-head-avatar:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .chat-window .chat-head-name {
      margin: 0;
      font-weight: 700;
      font-size: 24px;   /* the contact's name, readable like the thread below */
      line-height: 24px;
    }

    .chat-window .chat-head-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: var(--identity-gray);
    }

    .chat-window .chat-head-status .dot {
      width: 8px;
      height: 8px;
      background: var(--identity-accent-green);   /* online */
    }

    .chat-window .chat-head-status.offline .dot {
      background: var(--identity-gray);
    }

    .chat-window .chat-head-status.typing .dot {
      background: var(--identity-accent-amber);
      animation: chat-dot 600ms step-end infinite;
    }

    /* ---- thread ---- */
    /* The thread is content the reader actually reads, so it runs at the
       universal 24px like Contacts and Publications — not the 16px it used
       to inherit from the body. */
    .chat-window .mac-content {
      position: relative;
      font-size: 24px;
      line-height: 24px;
    }

    .chat-window .chat-log {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 448px;
      min-height: 264px;
    }

    /* Phone: 448px is wider than the display. The thread just fills whatever
       it is given — bubbles already cap themselves against their own row.
       (Breakpoint mirrors VisualIdentity.isPhone.) */
    @media (max-width: 640px) {
      .chat-window .chat-log { width: 100%; }
    }

    .chat-window .chat-day {
      align-self: center;
      margin: 0;
      color: var(--identity-gray);
      font-size: 16px;   /* a quiet divider, not thread content */
      line-height: 16px;
    }

    .chat-window .msg {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 100%;
    }

    .chat-window .msg-avatar {
      flex: none;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      line-height: 0;
    }

    .chat-window .msg-avatar img {
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .chat-window .msg-avatar:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* The circular profile portrait wears an understated accent ring — an
       --identity-ring drop-shadow outline (soft in light, deep in dark) that
       follows the OS accent, kept subtle on the chat's surfaces (96px, 2px).
       The header and message avatars are the plain rounded-rect (48px, borderless). */
    .chat-window .chat-profile-head img[src$="jiali-round.svg"] {
      filter:
        drop-shadow(2px 0 0 var(--identity-ring))
        drop-shadow(-2px 0 0 var(--identity-ring))
        drop-shadow(0 2px 0 var(--identity-ring))
        drop-shadow(0 -2px 0 var(--identity-ring))
        drop-shadow(1px 1px 0 var(--identity-ring))
        drop-shadow(-1px 1px 0 var(--identity-ring))
        drop-shadow(1px -1px 0 var(--identity-ring))
        drop-shadow(-1px -1px 0 var(--identity-ring));
    }

    .chat-window .msg-bubble {
      position: relative;
      margin: 0;   /* it's a <p>: kill the UA 1em margin (24px now) that
                      doubled the row height and dropped the avatar */
      padding: 8px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-soft);
      color: var(--identity-normal);
      cursor: pointer;   /* her bubbles take tapbacks */
    }

    .chat-window .msg-time {
      flex: none;
      margin: 0 0 4px;
      color: var(--identity-gray);
      font-size: 16px;
      line-height: 24px;
    }

    /* Ultra-rounded pixel corners: a 16px pixel-circle quarter at the 4px
       chrome scale — cut profile [2,1,1] cells, ink tracing the staircase.
       Each corner element carries three boxes: itself (8x4 outer paper
       cover), ::before (4x8 side paper cover), ::after (4x8 ink step).
       Real border-radius is against the law. */
    .chat-window .bc {
      position: absolute;
      width: 8px;
      height: 4px;
      background: var(--identity-paper);
    }

    .chat-window .bc::before,
    .chat-window .bc::after {
      content: '';
      position: absolute;
      width: 4px;
      height: 8px;
    }

    .chat-window .bc::before { background: var(--identity-paper); }
    .chat-window .bc::after { background: var(--identity-normal); }

    .chat-window .bc-tl { top: -4px; left: -4px; }
    .chat-window .bc-tl::before { top: 4px; left: 0; }
    .chat-window .bc-tl::after { top: 4px; left: 4px; }

    .chat-window .bc-tr { top: -4px; right: -4px; }
    .chat-window .bc-tr::before { top: 4px; right: 0; }
    .chat-window .bc-tr::after { top: 4px; right: 4px; }

    .chat-window .bc-bl { bottom: -4px; left: -4px; }
    .chat-window .bc-bl::before { bottom: 4px; left: 0; }
    .chat-window .bc-bl::after { bottom: 4px; left: 4px; }

    .chat-window .bc-br { bottom: -4px; right: -4px; }
    .chat-window .bc-br::before { bottom: 4px; right: 0; }
    .chat-window .bc-br::after { bottom: 4px; right: 4px; }

    /* Reader side. */
    .chat-window .msg.mine {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .chat-window .msg.mine .msg-bubble {
      background: var(--identity-primary);
      color: #fff;
      cursor: default;
    }

    .chat-window .msg-wrap { display: flex; flex-direction: column; }

    .chat-window .msg.mine .msg-wrap { align-items: flex-end; }

    .chat-window .msg-meta {
      margin: 4px 4px 0;
      color: var(--identity-gray);
      font-size: 16px;
      line-height: 16px;
    }

    /* Tapback: a pixel heart pinned to the bubble corner. 32px is 2x the
       heart's 16px viewBox, so every source pixel lands on whole screen
       pixels at any DPR; it straddles the right edge and keeps 8px of itself
       inside the bubble's top padding, clear of the text. */
    .chat-window .react {
      position: absolute;
      top: -24px;
      right: -16px;
      width: 32px;
      height: 32px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      display: none;
    }

    .chat-window .msg-bubble.reacted .react { display: block; }

    /* Stickers: artwork, no bubble chrome. */
    .chat-window .msg-sticker {
      width: 96px;
      height: 96px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    /* Typing indicator. */
    .chat-window .msg-typing {
      position: relative;
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-soft);
    }

    .chat-window .msg-typing span:not(.bc) {
      width: 8px;
      height: 8px;
      margin: 8px 0;
      background: var(--identity-normal);
      animation: chat-dot 600ms step-end infinite;
    }

    .chat-window .msg-typing span:nth-child(2) { animation-delay: 200ms; }
    .chat-window .msg-typing span:nth-child(3) { animation-delay: 400ms; }

    @keyframes chat-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }

    /* File attachment: Jiali "sends" a slide deck / PDF and tapping the card
       downloads it (it's an <a download>). Same pixel-bubble language, with a
       doc glyph masked in the accent-ink so it adapts to the theme. */
    .chat-window .msg-file {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 300px;
      padding: 10px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-deep);
      color: var(--identity-normal);
      text-decoration: none;
      cursor: pointer;
      position: relative;
    }
    .chat-window .msg-file-icon {
      width: 48px;
      height: 48px;
      flex: none;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .chat-window .msg-file-name {
      display: block;
      font-weight: 700;
      word-break: break-word;
    }
    .chat-window .msg-file-sub { color: var(--identity-normal); opacity: 0.6; }
    .chat-window .msg-file:hover { filter: brightness(0.96); }
    .chat-window .msg-file:active { translate: 4px 4px; }
    .chat-window .msg-file:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* ---- quick replies ---- */
    .chat-window .chat-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 24px;
    }

    .chat-window .chat-replies[hidden] { display: none; }

    .chat-window .chat-reply {
      padding: 4px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      font: inherit;
      color: var(--identity-normal);
      cursor: pointer;
      line-height: 24px;
    }

    .chat-window .chat-reply img {
      width: 24px;
      height: 24px;
      vertical-align: -4px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .chat-window .chat-reply:hover { background: var(--identity-tint-mid); }
    .chat-window .chat-reply:active { translate: 4px 4px; }

    .chat-window .chat-reply[disabled] {
      opacity: 0.4;
      cursor: default;
      translate: none;
      background: var(--identity-paper);
    }

    .chat-window .chat-reply:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    /* ---- the contact card (tap the avatar, like a real messenger) ---- */
    /* The card is its own scroll container (it can be taller than the pane),
       so it carries .mac-scroll in the markup and inherits the desk's pixel
       scrollbar from the page. It used to redraw that bar here instead, and
       the copy drifted — it stayed overflow-y: auto long after the windows
       moved to always-on scroll, so this groove came and went while every
       other one stayed put. Nothing about the bar belongs in this file. */
    .chat-window .chat-profile {
      position: absolute;
      inset: 0;
      z-index: 3;   /* over the thread; still under the window's grow box */
      padding: 24px;
      background: var(--identity-paper);
    }

    .chat-window .chat-profile[hidden] { display: none; }

    .chat-window .chat-profile-back {
      padding: 4px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      font: inherit;
      color: var(--identity-normal);
      cursor: pointer;
    }

    .chat-window .chat-profile-back:hover { background: var(--identity-tint-mid); }

    .chat-window .chat-profile-back:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    /* The profile card — the iOS Contacts look, the counterpart to the
       macOS layout in the Contacts app (§ contacts.js): centered header,
       then inset GROUPS of cells with tint hairlines and ultra-rounded
       corners. Same owner data as Contacts, minus the notes — the full
       CV lives over there. */
    .chat-window .chat-profile-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 16px 0 24px;
    }

    .chat-window .chat-profile-head img {
      width: 96px;
      height: 96px;
      margin-bottom: 16px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .chat-window .chat-profile-name {
      margin: 0 0 8px;
      font-size: 32px;
      line-height: 32px;
      font-weight: 700;
    }

    .chat-window .chat-profile-role {
      margin: 0;
      color: var(--identity-gray);
    }

    /* Section label above each group, iOS-style. */
    .chat-window .ct-group-label {
      margin: 24px 0 8px 16px;
      color: var(--identity-gray);
      font-size: 16px;
      line-height: 16px;
    }

    /* The group: a bordered inset card of cells. */
    .chat-window .ct-group {
      position: relative;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .chat-window .ct-cell {
      display: block;
      padding: 8px 16px;
      text-decoration: none;
      color: var(--identity-normal);
    }

    .chat-window .ct-cell + .ct-cell {
      border-top: 4px solid var(--identity-tint-soft);
    }

    .chat-window .ct-cell-label {
      margin: 0 0 4px;
      color: var(--identity-gray);
      font-size: 16px;
      line-height: 16px;
    }

    .chat-window .ct-cell-value { margin: 0; }

    /* Tappable cells: primary value + trailing chevron, Apple's blue rows. */
    .chat-window .ct-cell-value a,
    .chat-window a.ct-cell {
      color: var(--identity-primary-ink);
      text-decoration: none;
    }

    .chat-window a.ct-cell {
      display: flex;
      align-items: center;
    }

    .chat-window a.ct-cell::after {
      content: '>';
      margin-left: auto;
      color: var(--identity-gray);
    }

    .chat-window a.ct-cell:hover { background: var(--identity-tint-mid); }

    .chat-window a.ct-cell:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: -2px;
    }

    .chat-window .ct-cell.soon { color: var(--identity-gray); }

    /* Ultra-rounded group corners — the .bc bubble construction reused as
       .gc (this window already owns .bc for message bubbles). */
    .chat-window .gc {
      position: absolute;
      width: 8px;
      height: 4px;
      background: var(--identity-paper);
    }

    .chat-window .gc::before,
    .chat-window .gc::after {
      content: '';
      position: absolute;
      width: 4px;
      height: 8px;
    }

    .chat-window .gc::before { background: var(--identity-paper); }
    .chat-window .gc::after { background: var(--identity-normal); }

    .chat-window .gc-tl { top: -4px; left: -4px; }
    .chat-window .gc-tl::before { top: 4px; left: 0; }
    .chat-window .gc-tl::after { top: 4px; left: 4px; }

    .chat-window .gc-tr { top: -4px; right: -4px; }
    .chat-window .gc-tr::before { top: 4px; right: 0; }
    .chat-window .gc-tr::after { top: 4px; right: 4px; }

    .chat-window .gc-bl { bottom: -4px; left: -4px; }
    .chat-window .gc-bl::before { bottom: 4px; left: 0; }
    .chat-window .gc-bl::after { bottom: 4px; left: 4px; }

    .chat-window .gc-br { bottom: -4px; right: -4px; }
    .chat-window .gc-br::before { bottom: 4px; right: 0; }
    .chat-window .gc-br::after { bottom: 4px; right: 4px; }

    @media (prefers-reduced-motion: reduce) {
      .chat-window .msg-typing span:not(.bc) { animation: none; }
      .chat-window .chat-head-status.typing .dot { animation: none; }
    }
  `;

  const boot = () => {
    const icon = document.querySelector('.chat-icon');
    const VI = window.VisualIdentity;
    const news = window.NEWS_ITEMS || [];      // parsed by tv.js from news.md.js
    const history = news.slice(1).reverse();   // the old news, oldest first
    const latest = news[0] || null;            // …and the one still unread
    const greetings = window.CHAT_GREETINGS || [];
    const replies = window.CHAT_REPLIES || [];
    // The profile card syncs with the Contacts app — same owner record,
    // read lazily so it reflects any edit to contacts.md.js.
    const owner = () => window.ContactsData?.owner?.() || null;
    if (!icon || !VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    // ---- unread badge: every visit starts unread — she always has
    // something to say to whoever just walked in. Read state lives only
    // in memory, so a reload brings the badge (and the typed-in thread
    // choreography) back.
    let read = false;
    localStorage.removeItem('identity-chat-read');   // retire the old key
    const syncBadge = () => {
      icon.classList.toggle('unread', Boolean(latest || greetings.length) && !read);
    };
    syncBadge();

    // ---- window ----
    const win = document.createElement('section');
    win.className = 'mac-window chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'chat-title');
    win.tabIndex = -1;
    win.hidden = true;
    win.innerHTML = `
      <header class="mac-titlebar">
        <button class="mac-close" type="button" aria-label="Close messages window"></button>
        <h2 class="mac-title" id="chat-title">Messages</h2>
      </header>
      <div class="chat-head">
        <button class="chat-head-avatar" type="button" aria-label="Open profile">
          <img src="avatars/jiali-rect.svg" alt="" draggable="false" />
        </button>
        <div>
          <p class="chat-head-name">${owner()?.short || ''}</p>
          <p class="chat-head-status"><span class="dot"></span><span class="chat-status-text">online</span></p>
        </div>
      </div>
      <div class="mac-content">
        <div class="chat-log" aria-live="polite"></div>
        <div class="chat-replies" hidden></div>
        <div class="chat-profile mac-scroll" hidden>
          <button class="chat-profile-back" type="button">&lt; back</button>
          <div class="chat-profile-card"></div>
        </div>
      </div>`;
    document.body.appendChild(win);

    const content = win.querySelector('.mac-content');
    const log = win.querySelector('.chat-log');
    const replyRow = win.querySelector('.chat-replies');
    const profilePane = win.querySelector('.chat-profile');
    const profileCard = win.querySelector('.chat-profile-card');
    const statusText = win.querySelector('.chat-status-text');
    const statusLine = win.querySelector('.chat-head-status');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    const CORNERS = '<span class="bc bc-tl"></span><span class="bc bc-tr"></span>'
      + '<span class="bc bc-bl"></span><span class="bc bc-br"></span>';
    const GROUP_CORNERS = '<span class="gc gc-tl"></span><span class="gc gc-tr"></span>'
      + '<span class="gc gc-bl"></span><span class="gc gc-br"></span>';

    // ---- the profile card: the owner from Contacts, iOS-style. Same
    // record as the Contacts app, a lighter cut — info + links, no notes
    // (the full CV stays in Contacts). Rebuilt on open so edits to
    // contacts.md.js show up here too.
    const group = (label, cellsHTML) => cellsHTML
      ? `<p class="ct-group-label">${label}</p>
         <div class="ct-group">${cellsHTML}${GROUP_CORNERS}</div>`
      : '';

    const fieldCell = ([label, value]) => {
      const shown = label === 'mail' ? `<a href="mailto:${value}">${value}</a>` : value;
      return `<div class="ct-cell">
          <p class="ct-cell-label">${label}</p>
          <p class="ct-cell-value">${shown}</p>
        </div>`;
    };

    const linkCell = ({ label, href }) => href && href !== '#'
      ? `<a class="ct-cell" href="${href}" draggable="false"
           data-identity-transition="pixelate">${label}</a>`
      : `<span class="ct-cell soon">${label} · soon</span>`;

    const renderProfile = () => {
      const person = owner();
      if (!person) return;
      // drop the in-page app links (a "Messages" row inside Messages is silly)
      const links = (person.links || []).filter(link => !(link.href || '').startsWith('app:'));
      profileCard.innerHTML = `
        <div class="chat-profile-head">
          <img src="${person.avatar}" alt="" draggable="false" />
          <h3 class="chat-profile-name">${person.name}</h3>
          <p class="chat-profile-role">${person.role || ''}</p>
        </div>
        ${group('info', (person.fields || []).map(fieldCell).join(''))}
        ${group('links', links.map(linkCell).join(''))}`;
    };

    // ---- presence: 'offline' | 'online' | 'typing' ----
    const setStatus = state => {
      statusText.textContent = state === 'typing' ? 'typing…' : state;
      statusLine.classList.toggle('offline', state === 'offline');
      statusLine.classList.toggle('typing', state === 'typing');
    };

    // ---- thread building ----
    const scrollLatest = () => {
      // never yank the scroll while the contact card covers the thread —
      // the pane is anchored at the scroll origin
      if (!profilePane.hidden) return;
      content.scrollTop = content.scrollHeight;
    };

    const nowTime = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const dayDivider = label => {
      const p = document.createElement('p');
      p.className = 'chat-day';
      p.textContent = `— ${label} —`;
      log.appendChild(p);
    };

    // The live conversation opens a fresh "today", laid down once — before the
    // first message that actually happens now (a greeting, a shared file, a
    // tapped reply). It is lazy, and called from inside the queue's render
    // steps, so it always lands in log order however those are interleaved.
    // The news above keeps its own dates: she posted it on its day.
    let todayOpened = false;
    const openToday = () => {
      if (todayOpened) return;
      todayOpened = true;
      dayDivider('today');
    };

    const bubble = (text, { mine = false, time = '', sticker = false } = {}) => {
      const row = document.createElement('div');
      row.className = 'msg' + (mine ? ' mine' : '');
      const body = sticker
        ? `<img class="msg-sticker" src="${text}" alt="a cat sticker" draggable="false" />`
        : `<p class="msg-bubble">${text}${CORNERS}
             <img class="react" src="icons/heart.svg" alt="" draggable="false" /></p>`;
      const meta = mine && !sticker ? '<p class="msg-meta">delivered</p>' : '';
      row.innerHTML = mine
        ? `<div class="msg-wrap">${body}${meta}</div>
           ${time ? `<p class="msg-time">${time}</p>` : ''}`
        : `<button class="msg-avatar" type="button" aria-label="Open profile">
             <img src="avatars/jiali-rect.svg" alt="" draggable="false" /></button>
           <div class="msg-wrap">${body}</div>
           ${time ? `<p class="msg-time">${time}</p>` : ''}`;
      log.appendChild(row);
      scrollLatest();
      return row;
    };

    const typingRow = () => {
      const row = document.createElement('div');
      row.className = 'msg';
      row.innerHTML = `<button class="msg-avatar" type="button" aria-label="Open profile">
          <img src="avatars/jiali-rect.svg" alt="" draggable="false" /></button>
        <span class="msg-typing" aria-label="typing"><span></span><span></span><span></span>${CORNERS}</span>`;
      log.appendChild(row);
      scrollLatest();
      setStatus('typing');
      return {
        row,
        done() {
          row.remove();
          setStatus('online');
        }
      };
    };

    // A file Jiali sends: an attachment card. Tapping it saves the PDF (the
    // download attribute) or, if the browser declines to download, opens it in
    // a NEW tab (target=_blank) — it never navigates the desktop's own tab. The
    // log click-handler ignores it (not a .msg-bubble/.msg-avatar), so the
    // anchor behaves natively.
    const fileBubble = (url, filename) => {
      const ext = (filename.split('.').pop() || 'file').toUpperCase();
      const row = document.createElement('div');
      row.className = 'msg';
      row.innerHTML =
        `<button class="msg-avatar" type="button" aria-label="Open profile">
           <img src="avatars/jiali-rect.svg" alt="" draggable="false" /></button>
         <div class="msg-wrap">
           <a class="msg-file" href="${url}" download="${filename}" target="_blank" rel="noopener">
             <img class="msg-file-icon" src="icons/pdf.svg" alt="" draggable="false" />
             <span class="msg-file-meta">
               <span class="msg-file-name">${filename}</span>
               <span class="msg-file-sub">${ext} · tap to save</span>
             </span>${CORNERS}
           </a>
         </div>`;
      log.appendChild(row);
      scrollLatest();
      return row;
    };

    // ---- receipts: reader bubbles go delivered -> read when she reacts ----
    const markAllRead = () => {
      log.querySelectorAll('.msg-meta').forEach(meta => {
        meta.textContent = 'read';
      });
    };

    // ---- tapbacks: click one of her bubbles to toggle a heart ----
    log.addEventListener('click', event => {
      const bubbleEl = event.target.closest('.msg-bubble');
      if (bubbleEl && !bubbleEl.closest('.mine')) {
        bubbleEl.classList.toggle('reacted');
        return;
      }
      if (event.target.closest('.msg-avatar')) openProfile();
    });

    // ---- the contact card ----
    let lastFocus = null;
    const openProfile = () => {
      lastFocus = document.activeElement;
      renderProfile();
      // Hide the thread's scrollbar BEFORE revealing the pane: the pane is
      // inset:0 inside .mac-content, so if it's laid out while that
      // scrollbar is still present its width comes out 24px short and the
      // pane's own pixel scrollbar paints in a stale spot (fixed only by a
      // later reflow). Settle the parent first, then show + scroll the pane.
      content.style.overflow = 'hidden';
      content.scrollTop = 0;
      profilePane.hidden = false;
      profilePane.scrollTop = 0;
      profilePane.querySelector('.chat-profile-back').focus({ preventScroll: true });
    };
    const closeProfile = () => {
      profilePane.hidden = true;
      content.style.overflow = '';
      // catch up on anything that arrived while the card was open
      content.scrollTop = content.scrollHeight;
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    };
    win.querySelector('.chat-head-avatar').addEventListener('click', openProfile);
    profilePane.querySelector('.chat-profile-back').addEventListener('click', closeProfile);

    // ---- quick replies + auto-replies ----
    const setRepliesEnabled = enabled => {
      replyRow.querySelectorAll('.chat-reply').forEach(button => {
        if (!button.dataset.used) button.disabled = !enabled;
      });
    };

    // Jiali's outbox: everything she "sends" — greetings, a shared file, a reply
    // — is queued here and delivered one typing beat at a time, in the order it
    // was triggered, so any mix (several downloads, or a download and the
    // greeting) lands coherently however fast the buttons are tapped. Quick
    // replies are disabled while it drains.
    const outbox = [];
    let draining = false;
    const drainOutbox = () => {
      if (draining || !outbox.length) return;
      draining = true;
      setRepliesEnabled(false);
      outbox.shift()(() => {
        draining = false;
        if (outbox.length) drainOutbox();
        else setRepliesEnabled(true);
      });
    };
    // Enqueue one message from Jiali: she types for `dwell` ms, then render()
    // appends her bubble(s). dwell 0 (reopen / reduced motion) skips the typing.
    const say = (render, dwell) => {
      const d = dwell != null ? dwell : (reducedMotion.matches ? 0 : REPLY_TYPE_MS);
      outbox.push(done => {
        if (d <= 0) { render(); done(); return; }
        const typing = typingRow();
        setTimeout(() => { typing.done(); render(); done(); }, d);
      });
      drainOutbox();
    };
    // Typing dwell scaled to the message length, so a longer line takes longer
    // to "type" (clamped so nothing is too quick or tediously slow).
    const dwellFor = text =>
      reducedMotion.matches ? 0 : Math.min(2000, Math.max(500, (text || '').length * 30));

    const jialiReplies = (text, after) => {
      markAllRead();
      say(() => { openToday(); bubble(text, { time: nowTime() }); if (after) after(); }, dwellFor(text));
    };

    const buildReplies = () => {
      replyRow.innerHTML = '';
      replies.forEach(item => {
        const button = document.createElement('button');
        button.className = 'chat-reply';
        button.type = 'button';
        button.textContent = item.text;
        button.addEventListener('click', () => {
          if (draining || button.dataset.used) return;
          button.dataset.used = 'true';
          button.disabled = true;
          openToday();
          bubble(item.text, { mine: true, time: nowTime() });
          jialiReplies(item.reply);
        });
        replyRow.appendChild(button);
      });
      // the sticker: sendable once — hidden for now (uncomment to bring the cat back)
      // const sticker = document.createElement('button');
      // sticker.className = 'chat-reply';
      // sticker.type = 'button';
      // sticker.setAttribute('aria-label', 'Send the cat sticker');
      // sticker.innerHTML = `<img src="avatars/cat.svg" alt="cat sticker" draggable="false" />`;
      // sticker.addEventListener('click', () => {
      //   if (draining || sticker.dataset.used) return;
      //   sticker.dataset.used = 'true';
      //   sticker.disabled = true;
      //   bubble('avatars/cat.svg', { mine: true, sticker: true, time: nowTime() });
      //   jialiReplies(window.CHAT_STICKER_REPLY || 'a sticker!');
      // });
      // replyRow.appendChild(sticker);
    };

    // ---- the opening thread ----
    // Built ONCE and kept for the life of the tab, so the DOM — and whatever's
    // been added since (a tapped reply, shared files) — survives reopening the
    // window, theme changes, everything. renderBase() lays down the history +
    // the unread latest instantly; queueGreetings() enqueues her opening lines.
    let built = false;
    const renderBase = () => {
      log.innerHTML = '';
      todayOpened = false;
      buildReplies();
      replyRow.hidden = true;
      history.forEach(item => {
        dayDivider(item.date);
        bubble(item.text);
      });
      // The latest item is THE unread message the red dot was for — she posted
      // it on its own day and it has sat here unread ever since, so it is dated
      // like the rest of the news rather than stamped with the reader's clock.
      if (latest) {
        dayDivider(latest.date);
        bubble(latest.text);
      }
      scrollLatest();
    };
    const ensureBase = () => {
      if (built) return;
      built = true;
      renderBase();
    };
    // Queue her greetings — once. On a cold first open she "wakes up" (a beat
    // offline, then online) before the first line; otherwise she's already here.
    // Each greeting is its own queued message, so files shared before them slot
    // in ahead cleanly.
    let greetingsQueued = false;
    const queueGreetings = ({ wake = false } = {}) => {
      if (greetingsQueued) return;
      greetingsQueued = true;
      // greetings only ever render once, so `read` must NOT make them instant —
      // only a reduced-motion preference does. Each still types, one by one.
      const instant = reducedMotion.matches;
      if (wake && !instant) {
        outbox.push(done => {
          setStatus('offline');
          scrollLatest();
          setTimeout(() => { setStatus('online'); done(); }, OFFLINE_MS);
        });
      } else {
        setStatus('online');
      }
      greetings.forEach(text =>
        say(() => { openToday(); bubble(text, { time: nowTime() }); }, dwellFor(text)));
      outbox.push(done => { replyRow.hidden = false; scrollLatest(); done(); });
      drainOutbox();
    };

    // ---- window plumbing (same contract as the other apps) ----
    const placeWindow = () => VI.placeWindow(win);

    const openChat = () => {
      win.hidden = false;
      VI.raiseWindow(win);
      closeProfile();
      ensureBase();                              // build once; reopen keeps it
      if (greetingsQueued) setStatus('online');  // reopened: she's still here
      else queueGreetings({ wake: true });       // first open: she wakes + greets
      placeWindow();
      win.focus({ preventScroll: true });
      read = true;
      syncBadge();
    };

    const closeChat = () => {
      win.hidden = true;
      setStatus('offline');
      icon.focus({ preventScroll: true });
    };

    // Publications' material buttons call this: open Messages and Jiali "sends"
    // the file — a typed line plus a tappable file bubble that downloads it. It's
    // just another queued message, so tapping several download buttons (or one
    // plus the greeting) delivers them in order, one at a time.
    const share = ({ url, venue, kind, filename }) => {
      win.hidden = false;
      VI.raiseWindow(win);
      closeProfile();
      ensureBase();
      placeWindow();
      win.focus({ preventScroll: true });
      read = true;
      syncBadge();
      const text = (window.CHAT_SHARE_MESSAGE || 'here you go — my {kind} from {venue} ! (^-^)')
        .replace('{kind}', kind || 'slides')
        .replace('{venue}', venue || 'the talk');
      say(() => { openToday(); bubble(text, { time: nowTime() }); fileBubble(url, filename); }, dwellFor(text));
      queueGreetings();   // if she hasn't greeted yet, that follows the file(s)
    };

    // Public door: Contacts' "message me" bubble opens Messages here; the
    // Publications material buttons call share().
    window.ChatApp = { open: openChat, share };

    let pressX = 0;
    let pressY = 0;
    icon.addEventListener('pointerdown', event => {
      pressX = event.clientX;
      pressY = event.clientY;
    });
    icon.addEventListener('click', event => {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 4) return;
      if (win.hidden) {
        openChat();
      } else {
        closeChat();
      }
    });

    win.querySelector('.mac-close').addEventListener('click', closeChat);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || win.hidden) return;
      // profile first, then the window — like backing out of a real app
      if (!profilePane.hidden) {
        closeProfile();
      } else {
        closeChat();
      }
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
