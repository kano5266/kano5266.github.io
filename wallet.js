// wallet.js — an Apple Wallet–style pass stack.
//
// Cards fan down as a stack of header strips with the last one shown in full.
// Tapping a card opens it: the cards above stay as strips, the ones below slide
// down to reveal it, and the last card stays fully visible at the bottom.
// The stack height follows its content (it is never pinned or clipped), so the
// last card is always shown whole — which means the total height isn't fixed,
// and the window grows to fit it (scrolling only past the viewport). Motion is
// a soft spring, like Wallet. The page supplies the .mac-window chrome and the
// window.VisualIdentity grid helpers; everything else lives here.
(() => {
  const CARD_W = 480;
  const CARD_H = 304;
  const STRIP = 48;     // strip shown per collapsed card — same above or below the open one
  const GAP   = 24;     // clear space under the open card
  const SHADOW = 8;     // card drop-shadow offset (stage bottom padding)

  const SPRING = 'cubic-bezier(0.34, 1.28, 0.64, 1)';  // soft overshoot, Wallet-ish
  const MOVE_MS = 460;                                 // card move/expand
  const DEAL_MS = 360, DEAL_STAGGER = 80;              // deal-in per card + stagger

  const CARDS = [
    { id: 'student-id',     title: 'Kyoto ID',  src: 'cards/student-id.svg' },
    { id: 'utokyo-id',      title: 'UTokyo ID', src: 'cards/utokyo-id.svg' },
    { id: 'starbucks-gold', title: 'Starbucks', src: 'cards/starbucks-gold.svg' },
  ];

  const CSS = `
    .wallet-window .mac-content {
      /* Fixed window like the other apps — the shared .mac-content max-height
         applies; the card stack scrolls inside it. */
      overflow-x: hidden;
    }

    .wallet-window .wallet-stage {
      position: relative;
      width: ${CARD_W}px;
    }

    .wallet-window .wcard {
      position: absolute;
      left: 0;
      top: 0;
      width: ${CARD_W}px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      /* Positioned by transform so the card + its drop-shadow ride along in one
         composited layer (the shadow stays put after a move) with a soft spring. */
      transform: translateY(0);
      transition: transform ${MOVE_MS}ms ${SPRING};
      will-change: transform;
    }

    .wallet-window.no-anim .wcard { transition: none; }

    .wallet-window .wcard img {
      display: block;
      width: ${CARD_W}px;
      height: ${CARD_H}px;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      filter: drop-shadow(${SHADOW}px ${SHADOW}px 0 var(--identity-tint-shadow));
    }

    /* Phone: a ${CARD_W}px card is wider than the display. The deck takes the
       width it is given and the cards keep their aspect; the stack itself is
       driven by translateY, so the shuffle keeps working untouched.
       (Breakpoint mirrors VisualIdentity.isPhone.) */
    @media (max-width: 640px) {
      .wallet-window .wallet-stage { width: 100%; max-width: ${CARD_W}px; }
      .wallet-window .wcard { width: 100%; }
      .wallet-window .wcard img { width: 100%; height: auto; }
    }

    /* Desktop width floor: the deck must never be narrower than its cards.
       ${CARD_W} card + 48 content padding + 24 scrollbar gutter + 8 window
       border. The gutter is in the sum because .mac-content is overflow-y:
       scroll — the groove is always there, taking its 24px whether or not the
       stack is long enough to scroll. Miss it and the card is clipped, not
       squeezed: the stage is a fixed ${CARD_W}px, so it overflows into
       overflow-x: hidden and simply loses its right edge.
       Off on the phone, where the window is 100vw and a floor this wide would
       shove it off the display. */
    @media (min-width: 641px) {
      .wallet-window { min-width: ${CARD_W + 80}px; }
    }

    .wallet-window .wcard:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 4px;
    }

    /* Deal-in: each card rises + fades into its slot, staggered. */
    .wallet-window.dealing .wcard img {
      animation: wcard-deal ${DEAL_MS}ms ease-out backwards;
      animation-delay: calc(var(--deal-i) * ${DEAL_STAGGER}ms);
    }

    @keyframes wcard-deal {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .wallet-window.dealing .wcard img { animation: none; }
      .wallet-window .wcard { transition: none; }
    }
  `;

  const boot = () => {
    const icon = document.querySelector('.wallet-icon');
    const VI = window.VisualIdentity;
    if (!icon || !VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    const win = document.createElement('section');
    win.className = 'mac-window wallet-window';
    // The deck is a fixed CARD_W of pixel art, so width is not the reader's to
    // drag — only height, to show more of the stack at once. The page reads
    // this and gives the grow box its down-stepping glyph.
    win.dataset.resize = 'v';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', 'wallet-title');
    win.tabIndex = -1;
    win.hidden = true;
    win.innerHTML = `
      <header class="mac-titlebar">
        <button class="mac-close" type="button" aria-label="Close wallet window"></button>
        <h2 class="mac-title" id="wallet-title">Wallet</h2>
      </header>
      <div class="mac-content">
        <div class="wallet-stage">
          ${CARDS.map((card, i) => `
            <button class="wcard" type="button" data-id="${card.id}"
              style="--deal-i:${i}" aria-label="${card.title}" aria-expanded="false">
              <img src="${card.src}" alt="" draggable="false" />
            </button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(win);

    const cards = [...win.querySelectorAll('.wcard')];
    const stage = win.querySelector('.wallet-stage');
    const content = win.querySelector('.mac-content');
    const dealTotal = DEAL_MS + (cards.length - 1) * DEAL_STAGGER;
    let openId = null;   // id of the open card, or null when the stack is folded

    // ---- layout ----------------------------------------------------------
    // y of card i given the open index `sel` (-1 = none): every collapsed card
    // is one STRIP from the next (same distance above or below the open one);
    // the open card shows in full with GAP below it, and so does the last card.
    const cardTop = (sel, i) =>
      (sel < 0 || i <= sel)
        ? i * STRIP
        : sel * STRIP + CARD_H + GAP + (i - sel - 1) * STRIP;

    const layout = () => {
      const sel = cards.findIndex(c => c.dataset.id === openId);
      let bottom = 0;
      cards.forEach((card, i) => {
        card.classList.toggle('open', i === sel);
        card.setAttribute('aria-expanded', String(i === sel));
        const top = cardTop(sel, i);
        card.style.transform = `translateY(${top}px)`;
        bottom = Math.max(bottom, top + CARD_H);
      });
      stage.style.height = `${bottom + SHADOW}px`;   // grows/shrinks with content
    };

    // toggle a card open/closed; the window is fixed-size, so the stack just
    // re-lays out and scrolls inside it
    cards.forEach(card => card.addEventListener('click', () => {
      openId = card.dataset.id === openId ? null : card.dataset.id;
      layout();
    }));

    // ---- window placement (grid-snapped, centred until the user moves it) -
    const placeWindow = () => VI.placeWindow(win);

    const dealCards = () => {
      win.classList.remove('dealing');
      void win.offsetWidth;
      win.classList.add('dealing');
    };

    // ---- open / close ----------------------------------------------------
    let openTimer = 0;

    const openWallet = () => {
      win.hidden = false;
      VI.raiseWindow(win);
      // Two-beat entrance: deal every card in FOLDED, then once the deal
      // settles, open the first card (spring).
      clearTimeout(openTimer);
      openId = null;
      win.classList.add('no-anim');
      layout();
      void win.offsetWidth;
      win.classList.remove('no-anim');
      content.scrollTop = 0;
      placeWindow();
      win.focus({ preventScroll: true });
      dealCards();
      openTimer = setTimeout(() => { openId = CARDS[0].id; layout(); }, dealTotal);
    };

    const closeWallet = () => {
      clearTimeout(openTimer);
      win.hidden = true;
      icon.focus({ preventScroll: true });
    };

    // ---- icon: click opens/closes, drag is ignored -----------------------
    let pressX = 0, pressY = 0;
    icon.addEventListener('pointerdown', e => { pressX = e.clientX; pressY = e.clientY; });
    icon.addEventListener('click', e => {
      if (Math.hypot(e.clientX - pressX, e.clientY - pressY) > 4) return;
      if (win.hidden) openWallet(); else closeWallet();
    });

    win.querySelector('.mac-close').addEventListener('click', closeWallet);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !win.hidden) closeWallet(); });
    addEventListener('resize', placeWindow);

    // ---- titlebar drag (grid-snapped) ------------------------------------
    const titlebar = win.querySelector('.mac-titlebar');
    let dragId = null, startX = 0, startY = 0, originX = 0, originY = 0, dragged = false;

    titlebar.addEventListener('pointerdown', e => {
      if (e.target.closest('.mac-close')) return;
      if (win.dataset.maximized) return;   // it IS the desk; nowhere to drag it to
      dragId = e.pointerId; startX = e.clientX; startY = e.clientY;
      const r = win.getBoundingClientRect(); originX = r.left; originY = r.top; dragged = false;
      titlebar.setPointerCapture(e.pointerId);
    });
    titlebar.addEventListener('pointermove', e => {
      if (e.pointerId !== dragId) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!dragged && Math.abs(dx) + Math.abs(dy) <= 4) return;
      dragged = true; win.dataset.userMoved = 'true'; win.classList.add('dragging');
      win.style.left = `${VI.snap(originX) + VI.snapDelta(dx)}px`;
      win.style.top  = `${VI.snap(originY) + VI.snapDelta(dy)}px`;
    });
    const endDrag = e => { if (e.pointerId === dragId) { dragId = null; win.classList.remove('dragging'); } };
    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
