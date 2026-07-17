// contacts.js — Contacts: the address book, following the feature-module
// pattern (the page supplies .mac-window chrome + VisualIdentity helpers;
// everything specific to the app lives here).
//
// Concept: people as cards. The list on the left holds the owner (the
// first entry, marked "admin"), the advisors, and a few residents of the
// desktop for vibe; the card on the right shows the selected contact —
// avatar, name · kanji, role, fields, and NOTES. The owner card's notes
// are the living CV: service, awards, talks — one line each, straight
// from contacts.data.js.
(() => {
  const CSS = `
    /* Two panes need more room than the default window width. */
    .mac-window.contacts-window {
      width: min(720px, calc(100vw - 48px));
    }

    /* It's the CV — content reads at the universal 24px, like the
       publications window, not at the 16px chrome size. */
    .contacts-window .mac-content {
      font-size: 24px;
      line-height: 24px;
    }

    .contacts-window .ct {
      display: flex;
      min-height: 320px;
    }

    /* A toolbar above the address book: its one control folds the contact
       list in and out. The list is hidden by default, so the window opens
       straight on the owner card. */
    .contacts-window .ct-bar {
      display: flex;
      margin-bottom: 16px;
    }

    .contacts-window .ct-fold {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      color: var(--identity-normal);
      font: inherit;
      cursor: pointer;
    }

    /* The chevron is drawn from pixels (a base square + box-shadow copies) in
       the current text colour rather than an imported glyph, so it inverts
       with the theme — ink-on-paper in light, paper-on-ink in dark. */
    .contacts-window .ct-chev {
      position: relative;
      flex: none;
      width: 8px;
      height: 14px;
    }

    .contacts-window .ct-chev::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      width: 2px;
      height: 2px;
      background: currentColor;
      box-shadow:
        0 2px 0 0 currentColor, 2px 2px 0 0 currentColor,
        2px 4px 0 0 currentColor, 4px 4px 0 0 currentColor,
        4px 6px 0 0 currentColor, 6px 6px 0 0 currentColor,
        2px 8px 0 0 currentColor, 4px 8px 0 0 currentColor,
        0 10px 0 0 currentColor, 2px 10px 0 0 currentColor,
        0 12px 0 0 currentColor;
    }

    /* points right when the list is folded; flips to point back (left) open */
    .contacts-window .ct-fold[aria-expanded="true"] .ct-chev { transform: rotate(180deg); }

    .contacts-window .ct-fold:hover,
    .contacts-window .ct-fold:focus-visible { background: var(--identity-tint-mid); }

    .contacts-window .ct-fold:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .contacts-window .ct.folded .ct-list { display: none; }

    /* The list: avatar + name rows, the classic address-book spine. */
    .contacts-window .ct-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 16px;
      border-right: 4px solid var(--identity-normal);
      min-width: 208px;
    }

    .contacts-window .ct-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--identity-normal);
      text-align: left;
      cursor: pointer;
    }

    .contacts-window .ct-row img {
      flex: none;
      width: 24px;
      height: 24px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    .contacts-window .ct-row[aria-selected="true"] { background: var(--identity-tint-soft); }

    .contacts-window .ct-row:hover { color: var(--identity-primary-ink); }

    .contacts-window .ct-row:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .contacts-window .ct-admin {
      color: var(--identity-gray);
      font-size: 16px;
    }

    /* The card — macOS Contacts anatomy in pixels: avatar left of a
       large name + gray role with a row of ACTION BUBBLES beneath (the
       mac card's round buttons: mail, Scholar, ... — primary squares
       with 1-step rounded corners and white glyphs; gray = placeholder),
       then flat left-aligned sections divided by full-width tint
       hairlines — dense enough for a real CV. */
    .contacts-window .ct-card {
      flex: 1;
      padding-left: 24px;
      min-width: 384px;
    }

    /* Phone: the card's 384px floor is what clipped the profile on a 375px
       display — it forced a sideways scrollbar inside the window. The list and
       card stack instead of sitting side by side, and both drop their floors so
       the CV can simply be narrow. (Breakpoint mirrors VisualIdentity.isPhone.) */
    @media (max-width: 640px) {
      /* Must repeat both classes: the width rule above is specificity 0-2-0, so
         the page's own .mac-window phone rule can't reach it. This is why
         Contacts alone stayed 327px wide while every other app filled. */
      .mac-window.contacts-window { width: 100vw; }
      .contacts-window .ct { flex-direction: column; }
      .contacts-window .ct-card { min-width: 0; padding-left: 0; }
      .contacts-window .ct-list {
        min-width: 0;
        padding-right: 0;
        border-right: 0;
      }
    }

    .contacts-window .ct-head {
      display: flex;
      align-items: center;
      gap: 24px;
      margin: 8px 0 24px;
    }

    .contacts-window .ct-avatar {
      flex: none;
      width: 96px;
      height: 96px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }

    /* Admin's round portrait: an understated accent ring traced around the
       pixel circle with a drop-shadow outline (--identity-ring) — a soft, light
       tone in light mode and a deep one in dark, following the OS accent so it
       stays subtle on either surface. Works through <img>, where a currentColor
       ring baked into the SVG can't see the host theme. Cardinal + diagonal
       offsets close the round edge. */
    .contacts-window .ct-avatar[src$="jiali-round.svg"] {
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

    .contacts-window .ct-row img[src$="jiali-round.svg"] {
      filter:
        drop-shadow(1px 0 0 var(--identity-ring))
        drop-shadow(-1px 0 0 var(--identity-ring))
        drop-shadow(0 1px 0 var(--identity-ring))
        drop-shadow(0 -1px 0 var(--identity-ring));
    }

    .contacts-window .ct-name {
      margin: 0 0 8px;
      font-size: 32px;
      line-height: 32px;
      font-weight: 700;
    }

    .contacts-window .ct-role {
      margin: 0 0 8px;
      color: var(--identity-gray);
    }

    /* Action bubbles. */
    .contacts-window .ct-acts {
      display: flex;
      gap: 16px;
    }

    .contacts-window .ct-act {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 0;
      background: var(--identity-primary);
      font: inherit;
      cursor: pointer;
    }

    .contacts-window .ct-act img {
      width: 24px;
      height: 24px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      filter: invert(1);   /* baked ink glyphs read white on the bubble */
    }

    .contacts-window .ct-act:not(.soon):hover { background: var(--identity-tint-deep); }

    .contacts-window .ct-act:not(.soon):active { translate: 4px 4px; }

    .contacts-window .ct-act:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    .contacts-window .ct-act.soon {
      background: var(--identity-gray);
      cursor: default;
    }

    /* 1-step rounded bubble corners: paper covers. */
    .contacts-window .ac {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--identity-paper);
    }

    .contacts-window .ac-tl { top: 0; left: 0; }
    .contacts-window .ac-tr { top: 0; right: 0; }
    .contacts-window .ac-bl { bottom: 0; left: 0; }
    .contacts-window .ac-br { bottom: 0; right: 0; }

    /* Sections: ONE rule for every field — a gray label, then its value(s)
       indented on the next line. No column, so no big label-to-value gap
       and no squeezing; a long label ("research interest") sits on its own
       line like any other. Sections divided by tint hairlines. */
    .contacts-window .ct-sec {
      padding: 16px 0;
      border-top: 4px solid var(--identity-tint-soft);
    }

    .contacts-window .ct-sec:first-of-type { border-top: 0; }

    .contacts-window .ct-label {
      margin: 0;
      color: var(--identity-gray);
    }

    /* A new item starts when a label follows a value — space it out. */
    .contacts-window .ct-value + .ct-label { margin-top: 16px; }

    .contacts-window .ct-value {
      margin: 4px 0 0 24px;   /* tucked under the label, indented one step */
      color: var(--identity-normal);
    }

    .contacts-window .ct-value a {
      color: var(--identity-primary-ink);
      text-decoration: none;
    }

    .contacts-window .ct-value a:hover { text-decoration: underline; }

    /* Notes — the exception: a full-width ticked list under the label,
       flush left so it has the most room to grow. */
    .contacts-window .ct-note {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .contacts-window .ct-note::before {
      content: '';
      flex: none;
      width: 8px;
      height: 8px;
      margin-top: 8px;
      background: var(--identity-primary);
    }
  `;

  // Parse contacts.md.js: '# Name (admin)' blocks with 'key: value' meta,
  // '- label: value' info rows, and '## links' / '## notes' lists.
  const parseContacts = md => md.split(/^# /m).slice(1).map((block, index) => {
    const lines = block.split('\n');
    let title = lines.shift().trim();
    const admin = /\(admin\)\s*$/.test(title);
    title = title.replace(/\s*\(admin\)\s*$/, '');
    const person = {
      id: `c${index}`,
      name: title,
      short: title.split(' · ')[0],
      admin,
      avatar: 'avatars/anon.svg',   // fallback for contacts with no avatar of their own
      role: '',
      fields: [],
      links: [],
      notes: []
    };
    let section = 'info';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('## ')) {
        section = line.slice(3).trim().toLowerCase();
        continue;
      }
      if (!line.startsWith('- ')) {
        const meta = line.match(/^(avatar|role):\s*(.+)$/);
        if (meta) person[meta[1]] = meta[2].trim();
        continue;
      }
      const item = line.slice(2).trim();
      if (section === 'links') {
        const linked = item.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        person.links.push(linked
          ? { label: linked[1], href: linked[2] }
          : { label: item.replace(/\s*\(soon\)$/i, ''), href: '#' });
      } else if (section === 'notes') {
        person.notes.push(item);
      } else {
        const kv = item.match(/^([^:]+):\s*(.+)$/);
        if (kv) person.fields.push([kv[1].trim(), kv[2].trim()]);
        else person.notes.push(item);
      }
    }
    return person;
  });

  const boot = () => {
    const icon = document.querySelector('.contacts-icon');
    const VI = window.VisualIdentity;
    const contacts = parseContacts(window.CONTACTS_MD || '');
    if (!icon || !VI || !contacts.length) return;

    // The parsed address book, shared with other apps (Messages shows the
    // owner as an iOS-style profile card — the same data, a lighter view).
    window.ContactsData = {
      all: () => contacts,
      owner: () => contacts.find(person => person.admin) || contacts[0]
    };

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    const win = document.createElement('section');
    win.className = 'mac-window contacts-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'contacts-title');
    win.tabIndex = -1;
    win.hidden = true;
    win.innerHTML = `
      <header class="mac-titlebar">
        <button class="mac-close" type="button" aria-label="Close contacts window"></button>
        <h2 class="mac-title" id="contacts-title">Contacts</h2>
      </header>
      <div class="mac-content">
        <div class="ct-bar">
          <button class="ct-fold" type="button" aria-label="Show contact list"
            aria-expanded="false" aria-controls="ct-list" title="Contact list">
            <span class="ct-chev" aria-hidden="true"></span>
            <span>Contacts</span>
          </button>
        </div>
        <div class="ct folded">
          <nav class="ct-list" id="ct-list" aria-label="Contacts">
            ${contacts.map(person => `
              <button class="ct-row" type="button" data-id="${person.id}"
                aria-selected="${person === contacts[0]}">
                <img src="${person.avatar}" alt="" draggable="false" />
                <span>${person.short}</span>
                ${person.admin ? '<span class="ct-admin">(admin)</span>' : ''}
              </button>`).join('')}
          </nav>
          <div class="ct-card"></div>
        </div>
      </div>`;
    document.body.appendChild(win);

    const card = win.querySelector('.ct-card');
    const rows = [...win.querySelectorAll('.ct-row')];

    // The foldable contact list — hidden by default, revealed by the toolbar
    // toggle (and folded back once a contact is picked, drawer-style).
    const ct = win.querySelector('.ct');
    const foldBtn = win.querySelector('.ct-fold');
    const setFolded = folded => {
      ct.classList.toggle('folded', folded);
      foldBtn.setAttribute('aria-expanded', String(!folded));
      foldBtn.setAttribute('aria-label', folded ? 'Show contact list' : 'Hide contact list');
    };
    foldBtn.addEventListener('click', () => setFolded(!ct.classList.contains('folded')));

    const ACT_CORNERS = '<span class="ac ac-tl"></span><span class="ac ac-tr"></span>'
      + '<span class="ac ac-bl"></span><span class="ac ac-br"></span>';

    // The bubble row: mail first (from the info rows), then one bubble
    // per link. Glyphs come from the 16px icon set, inverted to white.
    const actIcon = label =>
      (/messages|chat/i.test(label) && 'icons/chat.svg')
      || (/scholar/i.test(label) && 'icons/cap.svg')
      || (/orcid/i.test(label) && 'icons/link.svg')
      || (/github/i.test(label) && 'icons/github.svg')
      || (/mail/i.test(label) && 'icons/mail.svg')
      || 'icons/external.svg';

    // One bubble. Three kinds: an in-page app action (`app:` href → a
    // button that opens that app), a live link (anchor, pixelate exit
    // unless it's mail), or a gray "soon" placeholder.
    const isApp = href => Boolean(href) && href.startsWith('app:');
    const bubble = ({ label, href }) => {
      const glyph = `<img src="${actIcon(label)}" alt="" draggable="false" />${ACT_CORNERS}`;
      if (isApp(href)) {
        return `<button type="button" class="ct-act" data-app="${href.slice(4)}"
                  aria-label="${label}" title="${label}">${glyph}</button>`;
      }
      if (href && href !== '#') {
        return `<a class="ct-act" href="${href}" draggable="false" aria-label="${label}" title="${label}"
                  ${href.startsWith('mailto:') ? '' : 'data-identity-transition="pixelate"'}>${glyph}</a>`;
      }
      return `<span class="ct-act soon" title="${label} — soon" aria-label="${label} — soon">${glyph}</span>`;
    };

    const actBubbles = person => {
      const links = person.links || [];
      // in-page app actions lead (e.g. "message me"), then mail, then links
      const acts = links.filter(l => isApp(l.href));
      const mail = (person.fields || []).find(([label]) => label === 'mail');
      if (mail) acts.push({ label: 'mail', href: `mailto:${mail[1]}` });
      links.filter(l => !isApp(l.href)).forEach(link => acts.push(link));
      if (!acts.length) return '';
      return `<span class="ct-acts">${acts.map(bubble).join('')}</span>`;
    };

    // Every field renders the same way: a gray label, then its value(s)
    // indented on the next line. A repeated label (two "affiliation" rows)
    // shows once — the values stack under the shared heading. mail is a
    // mailto link.
    const fieldsHTML = fields => fields.map(([label, value], i, arr) => {
      const grouped = i > 0 && arr[i - 1][0] === label;
      const valueHTML = label === 'mail' ? `<a href="mailto:${value}">${value}</a>` : value;
      return `${grouped ? '' : `<p class="ct-label">${label}:</p>`}<p class="ct-value">${valueHTML}</p>`;
    }).join('');

    // Notes — the exception: a full-width ticked list under its label.
    const notesHTML = notes =>
      `<p class="ct-label">notes:</p>${notes.map(note => `<span class="ct-note">${note}</span>`).join('')}`;

    const section = inner => inner ? `<div class="ct-sec">${inner}</div>` : '';

    const show = id => {
      const person = contacts.find(p => p.id === id) || contacts[0];
      rows.forEach(row => row.setAttribute('aria-selected', String(row.dataset.id === person.id)));
      card.innerHTML = `
        <div class="ct-head">
          <img class="ct-avatar" src="${person.avatar}" alt="" draggable="false" />
          <div>
            <h3 class="ct-name">${person.name}</h3>
            <p class="ct-role">${person.role || ''}</p>
            ${actBubbles(person)}
          </div>
        </div>
        ${section(fieldsHTML(person.fields || []))}
        ${section(person.notes && person.notes.length ? notesHTML(person.notes) : '')}`;
    };

    rows.forEach(row => row.addEventListener('click', () => { show(row.dataset.id); setFolded(true); }));

    // In-page app bubbles (e.g. "message me"): open the app via its door.
    const APP_DOORS = { chat: () => window.ChatApp };
    card.addEventListener('click', event => {
      const actionButton = event.target.closest('.ct-act[data-app]');
      if (!actionButton) return;
      APP_DOORS[actionButton.dataset.app]?.()?.open?.();
    });

    show(contacts[0].id);

    // ---- window plumbing (same contract as the other apps) ----
    const placeWindow = () => VI.placeWindow(win);

    const openContacts = () => {
      win.hidden = false;
      VI.raiseWindow(win);
      show(contacts[0].id);
      setFolded(true);            // always open on the owner card, list tucked away
      placeWindow();
      win.focus({ preventScroll: true });
    };

    const closeContacts = () => {
      win.hidden = true;
      icon.focus({ preventScroll: true });
    };

    // Public door: the page opens Contacts on arrival (see the welcome script
    // at the foot of index.html).
    window.ContactsApp = { open: openContacts };

    let pressX = 0;
    let pressY = 0;
    icon.addEventListener('pointerdown', event => {
      pressX = event.clientX;
      pressY = event.clientY;
    });
    icon.addEventListener('click', event => {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 4) return;
      if (win.hidden) {
        openContacts();
      } else {
        closeContacts();
      }
    });

    win.querySelector('.mac-close').addEventListener('click', closeContacts);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !win.hidden) closeContacts();
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
      if (VI.isPhone()) return;   // full-screen app: nowhere to drag it to
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
