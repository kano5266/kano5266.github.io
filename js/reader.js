// reader.js — the book reader: a paged, vertical-text reader for the
// 青空文庫 texts kept on this desk (mikan.aozora.js is the first).
//
// A novel is not a note, so it does not open in the folder kit's file
// viewer: that window is a scroll, and this is a BOOK. It reads the way
// the text was set — 縦書き, top to bottom, columns running RIGHT TO
// LEFT — so a page turn walks the columns leftward one page at a time,
// in whole 8px steps like every other motion here. The spine sits on
// the right, where a Japanese book's spine is, and a shiori marks the
// page someone keeps coming back to.
//
// Two type notes, both deliberate:
//   - The page declares its OWN face, "DotGothic16 Book", pointing at
//     the same subset file the page already loads. The site's
//     DotGothic16 carries size-adjust: 70% to balance CJK ink against
//     Enter Command in mixed runs; a page of pure Japanese has nothing
//     to balance against, and at native scale the font bakes crisp on
//     the 16s (32px glyphs, 16px ruby, 48px columns).
//   - Chrome stays Latin (the pixel law: CJK is content, never chrome),
//     so the bar reads prev/next and the window is titled Book. The
//     Japanese lives on the page, where it belongs.
//
// Feature-module pattern: this file owns its CSS, DOM and behavior; the
// page supplies .mac-window chrome + VisualIdentity. Cross-module door:
// window.ReaderApp = { open }.
(() => {
  // The page is MEASURED, not fixed: a book you can resize re-sets
  // itself, so the paper takes whole columns and whole glyphs out of
  // whatever room the window has (a part column at the edge would just
  // be a sliced letter). These are only the size it opens at —
  // 13 columns by 12 glyphs, 156 characters to a page.
  const PAD = 24;       // the paper's margins, all four the same: the
                        // folio is read off the window's bar, so the
                        // page keeps no furniture of its own

  // THE SIZE LADDER. Only these sizes exist, because the pixel law
  // says a face bakes crisp on multiples of 16 and blurs everywhere
  // else — so the reader steps 32 / 48 / 64 rather than nudging by
  // twos, and the ruby steps with it (16 under the small two, 32 under
  // the big one, never an off-grid half). A column is glyph + ruby
  // when readings are showing and glyph + 8 of air when they are not.
  const SIZES = [
    { glyph: 32, ruby: 16 },
    { glyph: 48, ruby: 16 },
    { glyph: 64, ruby: 32 },
  ];
  const columnFor = (step, withRuby) =>
    step.glyph + (withRuby ? step.ruby : 8);
  const OPEN_W = columnFor(SIZES[0], true) * 13;
  const OPEN_H = SIZES[0].glyph * 12;

  // Paper: the desk's own tokens by default, so a book on this desk
  // looks like it belongs to it. The other two are LITERAL colors,
  // which the theme law allows a physical object — a sepia paperback
  // does not turn indigo at night, it just sits there being sepia.
  const PAPERS = {
    desk: null,
    sepia: { paper: '#f2e7ce', ink: '#3d3227', mid: '#dbcaa6',
             deep: '#b7a07a', quiet: '#8a7a62' },
    night: { paper: '#191922', ink: '#c9ccd6', mid: '#2b2b36',
             deep: '#3b3b4a', quiet: '#787d8a' },
  };

  const STORE = { size: 'identity-book-size', paper: 'identity-book-paper',
                  ruby: 'identity-book-ruby', mark: 'identity-book-mark' };

  const CSS = `
    /* The reading face: the shipped subset at its native scale. */
    @font-face {
      font-family: "DotGothic16 Book";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("fonts/DotGothic16.subset.woff2") format("woff2");
    }

    /* The window is a column: bar, then book filling the rest. */
    .reader-window .mac-content {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Everything the paper is made of, in one place: the desk's tokens
       by default, swapped wholesale by a paper setting. */
    .reader-window {
      --bk-paper: var(--identity-paper);
      --bk-ink: var(--identity-normal);
      --bk-mid: var(--identity-tint-mid);
      --bk-deep: var(--identity-tint-deep);
      --bk-quiet: var(--identity-gray);
    }

    .reader-window .bk-book {
      position: relative;
      display: flex;
      /* a rail above the book: room for a card held clear of the pages
         as well as the ones slipped into them, two cells apart */
      margin-top: 40px;
      flex: 1 1 auto;
      min-height: 0;
      height: ${OPEN_H + PAD * 2 + 8}px;
      border: 4px solid var(--bk-ink);
      background: var(--bk-paper);
    }

    /* The paper turns the page: its left half carries you on, its right
       half back, the way the columns run. The pointer cursor lives on
       the paper but NOT on the type, which keeps its text cursor —
       selecting a line still behaves like selecting a line. */
    .reader-window .bk-view { cursor: pointer; }

    .reader-window .bk-text { cursor: text; }

    /* Both edges are just edges — the fore-edge is the stack of pages
       you have read, the spine is the spine. */
    .reader-window .bk-edge {
      flex: none;
      width: 16px;
      background: repeating-linear-gradient(
        to right,
        var(--bk-mid) 0 4px,
        var(--bk-paper) 4px 8px
      );
    }

    /* The paper: it takes the room the window gives it, and layout()
       rounds that down to whole columns and whole glyphs. (border-box
       is global here, so the margins live inside these numbers.) */
    .reader-window .bk-view {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
      width: ${OPEN_W + PAD * 2}px;
      overflow: hidden;
      padding: ${PAD}px;
    }

    /* The spine, right where a Japanese book carries it. */
    .reader-window .bk-spine {
      flex: none;
      width: 16px;
      background: var(--bk-deep);
      border-left: 4px solid var(--bk-ink);
    }

    .reader-window .bk-text {
      position: absolute;
      top: ${PAD}px;
      right: ${PAD}px;
      writing-mode: vertical-rl;
      font-family: "DotGothic16 Book", var(--font-content);
      font-size: ${SIZES[0].glyph}px;
      line-height: ${columnFor(SIZES[0], true)}px;
      color: var(--bk-ink);
      font-feature-settings: "palt" 0;
    }

    .reader-window .bk-text p {
      margin: 0;
      text-indent: 32px;
    }

    .reader-window .bk-text rt {
      font-size: ${SIZES[0].ruby}px;
      line-height: ${SIZES[0].ruby}px;
      font-weight: 400;
    }

    /* Readings off: the kana go away and the column tightens. */
    .reader-window .bk-text.bare rt { display: none; }

    /* The colophon — 奥付 — set quieter than the story, after a gap. */
    .reader-window .bk-colophon {
      margin-right: ${columnFor(SIZES[0], true) * 2}px;
      color: var(--bk-quiet);
      font-size: 16px;
      line-height: 24px;
    }

    .reader-window .bk-colophon p { margin: 0; text-indent: 0; }

    /* The SHIORI: a paper bookmark slipped between the pages, card and
       cord, standing where it was left. Its place along the top edge is
       the page it keeps — right for the beginning, left for the end,
       the way the columns run — and it does not move for anything but
       being re-laid. Click it to go back to it. */
    /* The card is drawn as solid bands rather than one fill, so the
       HOLE is a real gap: 4px square, centred in a 20px card, with the
       window or the page showing straight through it. Two bands here
       (above the hole and below it), two rects beside it in ::before
       and ::after — the site's own way of making a shape, and the only
       way to punch a hole that does not have to know what is behind
       the card. */
    .reader-window .bk-shiori {
      position: absolute;
      top: -24px;
      width: 20px;
      height: 24px;
      padding: 0;
      border: 0;
      background:
        linear-gradient(var(--bk-card) 0 0) no-repeat 0 0 / 100% 4px,
        linear-gradient(var(--bk-card) 0 0) no-repeat 0 8px / 100% calc(100% - 8px);
      cursor: pointer;
      z-index: 2;
    }

    .reader-window .bk-shiori::before,
    .reader-window .bk-shiori::after {
      content: '';
      position: absolute;
      top: 4px;
      width: 8px;
      height: 4px;
      background: var(--bk-card);
    }

    .reader-window .bk-shiori::before { left: 0; }
    .reader-window .bk-shiori::after { right: 0; }

    .reader-window .bk-shiori[data-colour="pink"] {
      --bk-card: var(--identity-accent-pink-soft);
    }

    .reader-window .bk-shiori[data-colour="amber"] {
      --bk-card: var(--identity-accent-amber-soft);
    }

    .reader-window .bk-shiori[data-colour="green"] {
      --bk-card: var(--identity-accent-green-soft);
    }

    .reader-window .bk-shiori[data-colour="cyan"] {
      --bk-card: var(--identity-accent-cyan-soft);
    }

    /* Seated — this IS the page it keeps — the card slides down into
       the open page. On any other page it stays up on its rail, off
       the paper entirely. */
    .reader-window .bk-shiori.seated { height: 64px; }

    /* WHERE YOU ARE is a shiori you have not put in yet: the same card,
       held clear above the book rather than slipped between its pages.
       It rides higher than the inserted ones — that 16px of daylight is
       the whole difference between out and in — slides as you read, and
       is the handle you drag to travel. It wears the colour it WILL be
       when you insert it, or a blank grey when the book already holds
       all four. */
    .reader-window .bk-shiori.loose {
      top: -40px;
      cursor: grab;
      touch-action: none;
      z-index: 3;
    }

    .reader-window .bk-shiori.loose.dragging { cursor: grabbing; }

    .reader-window .bk-shiori.loose[data-colour="none"] {
      --bk-card: var(--bk-mid);
    }

    .reader-window .bk-shiori:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    /* Three columns, so the title sits at the TRUE centre of the bar
       whatever the two sides weigh: settings at the left, the book's
       name in the middle, the reading tools at the right. */
    .reader-window .bk-bar {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      flex: none;
      padding: 0;
    }

    /* A window carrying a bar of its own wants that bar close under the
       title bar, not floating in the desk's full head margin — and
       nothing below it either, because the rail under the bar is not
       padding: the shiori live there. */
    .reader-window .mac-content { padding-top: 16px; }

    .reader-window .bk-bar > [data-settings] { justify-self: start; }

    /* Where you are, read off the window rather than printed on the
       page — window chrome, so it takes the desk's ink and not the
       paper's, and stays legible over sepia and night alike. */
    .reader-window .bk-folio {
      justify-self: end;
      margin: 0;
      font-size: 16px;
      line-height: 24px;
      color: var(--identity-gray);
      white-space: nowrap;
    }

    /* The book's own name, in the reading face because it is the book
       speaking, not the window. */
    .reader-window .bk-title {
      margin: 0;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-align: center;
      font-family: "DotGothic16 Book", var(--font-content);
      font-size: 16px;
      line-height: 24px;
      color: var(--identity-gray);
    }

    /* The settings strip: hidden until asked for, so the bar stays a
       bar. Chrome, so Latin and Enter Command throughout.
       The [hidden] rule is load-bearing: an author display property
       beats the attribute's own display:none, so without it the strip
       stands open forever while the attribute toggles invisibly
       underneath. (No backticks in here, either — this is inside a
       template literal, and one would close it.) */
    .reader-window .bk-set[hidden] { display: none; }

    .reader-window .bk-set {
      display: flex;
      flex: none;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      padding: 16px 0 0;
    }

    .reader-window .bk-set-label {
      font-size: 16px;
      line-height: 24px;
      color: var(--identity-gray);
    }

    .reader-window .bk-btn[aria-pressed="true"] {
      background: var(--identity-primary);
      color: var(--identity-paper);
    }

    .reader-window .bk-count {
      font-size: 16px;
      line-height: 24px;
      color: var(--identity-gray);
    }

    .reader-window .bk-btn {
      padding: 0 8px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      font: inherit;
      font-size: 16px;
      line-height: 24px;
      cursor: pointer;
    }

    .reader-window .bk-btn:hover:not(:disabled),
    .reader-window .bk-btn:focus-visible { background: var(--identity-tint-mid); }

    .reader-window .bk-btn:focus-visible {
      outline: 2px solid var(--identity-primary);
      outline-offset: 2px;
    }

    .reader-window .bk-btn:active:not(:disabled) { translate: 4px 4px; }

    .reader-window .bk-btn:disabled {
      color: var(--identity-gray);
      border-color: var(--identity-gray);
      cursor: default;
    }

    /* Sizeable, unlike the TV — a book is held, not installed — but
       never below five columns of paper: 240 page + 48 margins +
       28 edge and spine + 8 book border + 48 content padding +
       8 window border. The height cap stands down so the page can be
       drawn tall; the grow box handles the rest. */
    @media (min-width: 641px) {
      .reader-window { min-width: ${columnFor(SIZES[0], true) * 5 + PAD * 2 + 92}px; }
      .reader-window .mac-content { max-height: none; overflow: hidden; }
    }

    /* The desk's play layer never follows to the phone; if this window
       is ever reached there, let it scroll rather than clip. */
    @media (max-width: 640px) {
      .reader-window .bk-view { width: 100%; }
      .reader-window .bk-edge, .reader-window .bk-spine { display: none; }
    }
  `;

  // 青空文庫 notation -> DOM. Ruby is ｜base《reading》; everything else
  // is the text as typed. Escaped first, so the story can never inject
  // markup of its own.
  const escape = value => value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const setRuby = value =>
    escape(value).replace(/｜([^《]+)《([^》]+)》/g,
      (all, base, reading) => `<ruby>${base}<rt>${reading}</rt></ruby>`);

  const boot = () => {
    const VI = window.VisualIdentity;
    if (!VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    const win = document.createElement('section');
    win.className = 'mac-window reader-window';
    win.hidden = true;
    win.innerHTML = `
      <div class="mac-content">
        <div class="bk-bar">
          <button class="bk-btn" type="button" data-settings
            aria-expanded="false">settings</button>
          <p class="bk-title"></p>
          <p class="bk-folio"></p>
        </div>
        <div class="bk-set" hidden>
          <span class="bk-set-label">size</span>
          <button class="bk-btn" type="button" data-size="-1"
            aria-label="Smaller text">&minus;</button>
          <button class="bk-btn" type="button" data-size="1"
            aria-label="Larger text">+</button>
          <span class="bk-set-label">paper</span>
          <button class="bk-btn" type="button" data-paper="desk">desk</button>
          <button class="bk-btn" type="button" data-paper="sepia">sepia</button>
          <button class="bk-btn" type="button" data-paper="night">night</button>
          <span class="bk-set-label">readings</span>
          <button class="bk-btn" type="button" data-ruby>furigana</button>
        </div>
        <div class="bk-book">
          <span class="bk-edge"></span>
          <div class="bk-view">
            <div class="bk-text"></div>
          </div>
          <span class="bk-spine"></span>
          <button class="bk-shiori" type="button" hidden
            aria-label="Go to the shiori"></button>
          <button class="bk-shiori loose" type="button" hidden
            aria-label="Leave a shiori on this page — drag to travel"></button>
        </div>
      </div>`;
    document.body.appendChild(win);

    const chrome = VI.attachWindowChrome(win, {
      title: 'Book',
      closeLabel: 'Close book window',
    });
    VI.makeResizable?.(win);

    const titleEl = win.querySelector('.bk-title');
    const countEl = win.querySelector('.bk-folio');
    const textEl = win.querySelector('.bk-text');
    const view = win.querySelector('.bk-view');
    const shiori = win.querySelector('.bk-shiori');
    const loose = win.querySelector('.bk-shiori.loose');
    const book = win.querySelector('.bk-book');

    const setStrip = win.querySelector('.bk-set');
    const setBtn = win.querySelector('[data-settings]');

    // The reader's own choices, kept the way the desk keeps its theme
    // and accent: one small key each, read back at boot.
    const stored = (key, fallback) => {
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    };
    const remember = (key, value) => {
      try { localStorage.setItem(key, value); } catch { /* private window */ }
    };

    let sizeAt = Math.max(0, Math.min(SIZES.length - 1,
      Number(stored(STORE.size, '0')) || 0));
    let paper = PAPERS[stored(STORE.paper, 'desk')] !== undefined
      ? stored(STORE.paper, 'desk') : 'desk';
    let showRuby = stored(STORE.ruby, 'on') !== 'off';

    // A book may carry SEVERAL shiori, one per accent the palette
    // keeps for categories. Each is a place in the text plus the colour
    // of the card left there.
    const COLOURS = ['pink', 'amber', 'green', 'cyan'];
    let marks = [];         // { colour, index, page }
    let shownKey = null;
    let dragging = false;   // the marker is in a hand right now
    let pageW = OPEN_W;
    let pageH = OPEN_H;
    let pages = 1;
    let page = 0;
    let shown = null;

    const show = () => {
      textEl.style.transform = `translateX(${page * pageW}px)`;
      countEl.textContent = `${page + 1} / ${pages}`;
      placeTab();
      placePin();
    };

    const turn = step => {
      page = Math.max(0, Math.min(pages - 1, page + step));
      show();
    };

    // ---- the shiori, as a place in the text ---------------------------
    // A page number would be the wrong thing to keep: change the type
    // size or the window and the page it named is somewhere else. So a
    // mark is an INDEX INTO THE STORY — how many characters in — and the
    // page it falls on is worked out fresh each time the book is set.
    // Ruby readings are not part of that count; the base text is.
    const baseNodes = () => {
      const out = [];
      const walk = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement?.closest('rt')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      let node;
      while ((node = walk.nextNode())) out.push(node);
      return out;
    };

    const locate = index => {
      let count = 0;
      for (const text of baseNodes()) {
        if (index < count + text.length) return { node: text, offset: index - count };
        count += text.length;
      }
      return null;
    };

    // Lay the shiori at a character: unwrap wherever it was, wrap one
    // character where it goes. An inline span changes no layout, so the
    // story does not shift under the reader when they move it.
    // Wrap one character per mark, so each has something on the page to
    // be measured against. Wrapping changes no text, so the indices stay
    // true whatever order they are laid in.
    const layMarks = () => {
      textEl.querySelectorAll('.bk-mark').forEach(old => {
        old.replaceWith(document.createTextNode(old.textContent));
      });
      textEl.normalize();
      marks = marks.filter(mark => {
        const at = locate(mark.index);
        if (!at) return false;
        const range = document.createRange();
        range.setStart(at.node, at.offset);
        range.setEnd(at.node, at.offset + 1);
        const span = document.createElement('span');
        span.className = 'bk-mark';
        span.dataset.colour = mark.colour;
        try {
          range.surroundContents(span);
          return true;
        } catch {
          return false;   // a boundary we cannot wrap
        }
      });
    };

    // Which page a character falls on — MEASURED, not guessed: a probe
    // is wrapped round it, the column it lands in is read off, and the
    // probe comes straight out again.
    const pageOfIndex = index => {
      const at = locate(index);
      if (!at) return null;
      const range = document.createRange();
      range.setStart(at.node, at.offset);
      range.setEnd(at.node, at.offset + 1);
      const probe = document.createElement('span');
      try {
        range.surroundContents(probe);
      } catch {
        return null;
      }
      const from = textEl.getBoundingClientRect().right;
      const found = Math.min(pages - 1, Math.max(0,
        Math.floor((from - probe.getBoundingClientRect().right) / pageW)));
      probe.replaceWith(document.createTextNode(probe.textContent));
      textEl.normalize();
      return found;
    };

    // The first character of a page, found by BISECTION.
    //
    // This used to ask the browser for the caret nearest a point at the
    // head of the first column, and that is why a shiori sometimes went
    // in a page out: a paragraph's first line is indented, so when a
    // page opened on a new paragraph the point fell in the blank cell of
    // that indent and the caret answered with the character before it —
    // which belongs to the page before. Character position rises with
    // the page, so bisection cannot be fooled that way.
    const firstIndexOnPage = target => {
      let lo = 0;
      let hi = baseNodes().reduce((sum, node) => sum + node.length, 0) - 1;
      let found = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const at = pageOfIndex(mid);
        if (at === null) break;
        if (at >= target) {
          if (at === target) found = mid;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      return found;
    };

    // Where each shiori rests: the column holding its character,
    // measured after layout and converted to a page.
    const measureMarks = () => {
      const from = textEl.getBoundingClientRect().right;
      marks.forEach(mark => {
        const span = textEl.querySelector(`.bk-mark[data-colour="${mark.colour}"]`);
        if (!span) {
          mark.page = null;
          return;
        }
        const at = span.getBoundingClientRect().right;
        mark.page = Math.min(pages - 1, Math.max(0, Math.floor((from - at) / pageW)));
      });
    };

    const markOn = at => marks.find(mark => mark.page === at) || null;

    const render = book => {
      const body = book.text.trim().split('\n')
        .map(line => `<p>${setRuby(line)}</p>`).join('');
      const colophon = `<div class="bk-colophon">${
        [`初出：${book.first}`, ...book.colophon]
          .map(line => `<p>${escape(line)}</p>`).join('')}</div>`;
      textEl.innerHTML = body + colophon;
      titleEl.textContent = `${book.title}　${book.author}`;

      // The shiori: whatever this reader last left in the book, and
      // failing that the one the shelf put there — in 蜜柑, the page
      // where the mandarins fall.
      const kept = stored(`${STORE.mark}-${shownKey}`, '');
      marks = kept
        ? kept.split(',').map(pair => {
            const [colour, index] = pair.split(':');
            return { colour, index: Number(index), page: null };
          }).filter(mark => COLOURS.includes(mark.colour) && mark.index > 0)
        : [];
      if (!marks.length && book.bookmark) {
        const authored = baseNodes().map(node => node.data).join('').indexOf(book.bookmark);
        if (authored >= 0) marks = [{ colour: COLOURS[0], index: authored, page: null }];
      }
      layMarks();

      dress();
      page = 0;
    };

    // The type and the paper, straight onto the page. Sizes come off
    // the ladder so they always land on a crisp multiple; the paper's
    // literal themes overwrite the token defaults wholesale.
    const dress = () => {
      const step = SIZES[sizeAt];
      const col = columnFor(step, showRuby);
      textEl.style.fontSize = `${step.glyph}px`;
      textEl.style.lineHeight = `${col}px`;
      textEl.style.setProperty('--bk-ruby', `${step.ruby}px`);
      textEl.querySelectorAll('rt').forEach(rt => {
        rt.style.fontSize = `${step.ruby}px`;
        rt.style.lineHeight = `${step.ruby}px`;
      });
      textEl.classList.toggle('bare', !showRuby);
      const colophon = textEl.querySelector('.bk-colophon');
      if (colophon) colophon.style.marginRight = `${col * 2}px`;

      const tones = PAPERS[paper];
      ['paper', 'ink', 'mid', 'deep', 'quiet'].forEach(name => {
        if (tones) win.style.setProperty(`--bk-${name}`, tones[name]);
        else win.style.removeProperty(`--bk-${name}`);
      });

      win.querySelectorAll('[data-paper]').forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.paper === paper)));
      win.querySelector('[data-ruby]').setAttribute('aria-pressed', String(showRuby));
      win.querySelector('[data-size="-1"]').disabled = sizeAt === 0;
      win.querySelector('[data-size="1"]').disabled = sizeAt === SIZES.length - 1;
    };

    // Re-set the book to the room it now has: whole columns across,
    // whole glyphs down, and the story re-flowed into however many
    // pages that makes. The reader keeps their place across the
    // re-flow by where they were in the text, not by page number —
    // a smaller page means more of them.
    const layout = () => {
      if (win.hidden) return;
      const box = view.getBoundingClientRect();
      const step = SIZES[sizeAt];
      const col = columnFor(step, showRuby);
      const wide = Math.max(col, Math.floor((box.width - PAD * 2) / col) * col);
      const tall = Math.max(step.glyph,
        Math.floor((box.height - PAD * 2) / step.glyph) * step.glyph);
      if (wide === pageW && tall === pageH && textEl.style.height) return measure();
      const was = pages > 1 ? (page * pageW) / Math.max(1, textEl.offsetWidth) : 0;
      pageW = wide;
      pageH = tall;
      textEl.style.height = `${pageH}px`;
      pages = Math.max(1, Math.ceil(textEl.offsetWidth / pageW));
      page = Math.max(0, Math.min(pages - 1,
        Math.round((was * textEl.offsetWidth) / pageW)));
      measureMarks();
      show();
    };

    // How many pages the story sets to, and which one the shiori keeps.
    // Only meaningful once the window is laid out and the reading face
    // has actually loaded — a fallback face sets to a different width,
    // so this runs again on fonts.ready.
    // The shiori lies across the top of the book, and its place along
    // that edge IS the page it keeps: hard right for the first page,
    // hard left for the last, because that is the way the columns run.
    // Seated (deeper) when the page it keeps is the page in view.
    const tabSpan = (wide = 16) => {
      const bookBox = book.getBoundingClientRect();
      return { left: bookBox.left, width: Math.max(0, bookBox.width - wide) };
    };

    // THE RIBBON IS THE BOOKMARK, because a shiori is a thing you
    // LEAVE somewhere: it stays at the marked page, up on the rail
    // while you are elsewhere and lying down across the paper when you
    // are standing on it. Click it to go back to it.
    const placeTab = () => {
      book.querySelectorAll('.bk-shiori:not(.loose)').forEach(card => card.remove());
      if (pages < 1) return;
      const { left, width } = tabSpan(20);
      const base = book.getBoundingClientRect().left;
      marks.forEach(mark => {
        if (mark.page === null) return;
        const along = pages > 1 ? mark.page / (pages - 1) : 0;
        const x = left + Math.round((width * (1 - along)) / 8) * 8;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'bk-shiori';
        card.dataset.colour = mark.colour;
        card.dataset.page = String(mark.page);
        card.setAttribute('aria-label', mark.page === page
          ? `Take the ${mark.colour} shiori out of this page`
          : `Go to the ${mark.colour} shiori`);
        card.classList.toggle('seated', mark.page === page);
        card.style.left = `${x - base}px`;
        book.appendChild(card);
      });
    };

    // And WHERE YOU ARE is a marker, not a shiori: a small primary
    // pointer that slides along the rail as the pages turn, and the
    // handle you drag to travel. The gap between it and the shiori is
    // how far you have wandered from your mark.
    const placePin = () => {
      // Hidden on a page that already keeps a shiori: there is nothing
      // to put in, and the card standing there is the one already in.
      if (pages < 1 || markOn(page)) {
        loose.hidden = true;
        return;
      }
      const { left, width } = tabSpan(20);
      const along = pages > 1 ? page / (pages - 1) : 0;
      const x = left + Math.round((width * (1 - along)) / 8) * 8;
      loose.hidden = false;
      loose.style.left = `${x - book.getBoundingClientRect().left}px`;
      // It wears the colour it WOULD become — never the colour of a
      // card already in this page, which would read as holding the one
      // thing you are standing on.
      const free = COLOURS.find(name => !marks.some(mark => mark.colour === name));
      loose.dataset.colour = free || 'none';
      loose.setAttribute('aria-label', free
        ? 'Leave a shiori on this page — drag to travel'
        : 'Where you are reading — drag to travel');
    };

    // Dragging it travels AND re-lays it — one gesture, because a
    // shiori you slide to a page is a shiori now kept at that page.
    const pageFromX = clientX => {
      const { left, width } = tabSpan(20);
      if (width <= 0) return 0;
      const along = 1 - Math.min(1, Math.max(0, (clientX - left - 8) / width));
      return Math.round(along * (pages - 1));
    };

    const measure = () => {
      if (win.hidden) return;
      pages = Math.max(1, Math.ceil(textEl.offsetWidth / pageW));
      measureMarks();
      page = Math.min(page, pages - 1);
      show();
    };

    document.fonts?.ready.then(layout);

    // Any change to the paper's size re-sets the book: the grow box,
    // an edge drag, the phone's maximize, all of it.
    new ResizeObserver(() => layout()).observe(view);

    // Any setting changed: dress the page, then re-set it, because
    // bigger type is fewer characters to a page and the story has to
    // be re-flowed to find out how many.
    const restyle = () => {
      dress();
      layout();
    };

    setBtn.addEventListener('click', () => {
      const open = setStrip.hidden;
      setStrip.hidden = !open;
      setBtn.setAttribute('aria-expanded', String(open));
    });

    win.querySelectorAll('[data-size]').forEach(button =>
      button.addEventListener('click', () => {
        sizeAt = Math.max(0, Math.min(SIZES.length - 1,
          sizeAt + Number(button.dataset.size)));
        remember(STORE.size, String(sizeAt));
        restyle();
      }));

    win.querySelectorAll('[data-paper]').forEach(button =>
      button.addEventListener('click', () => {
        paper = button.dataset.paper;
        remember(STORE.paper, paper);
        dress();   // colour only: the page keeps its place and its count
      }));

    win.querySelector('[data-ruby]').addEventListener('click', () => {
      showRuby = !showRuby;
      remember(STORE.ruby, showRuby ? 'on' : 'off');
      restyle();
    });

    // A shiori goes in and comes out BY HAND — no button in the bar
    // for it. Tap the loose card standing at your place and it goes
    // into the page; tap the card already seated in this page and it
    // comes out. Anywhere else the card is a place to go back to.
    // A new one wears the first colour not already in the book: four
    // accents, four shiori.
    const saveMarks = () => {
      if (!shownKey) return;
      remember(`${STORE.mark}-${shownKey}`,
        marks.map(mark => `${mark.colour}:${mark.index}`).join(','));
    };

    const layHere = () => {
      const here = markOn(page);
      if (here) {
        marks = marks.filter(mark => mark !== here);
      } else {
        const colour = COLOURS.find(name => !marks.some(mark => mark.colour === name));
        if (!colour) return;                 // the book is full of shiori
        const index = firstIndexOnPage(page);
        if (index === null) return;
        marks.push({ colour, index, page });
      }
      layMarks();
      measureMarks();
      saveMarks();
      placeTab();
      show();
    };

    // The loose card taken by the keyboard. Pointer taps are settled
    // in tabDone, which knows whether the hand travelled; a click with
    // no pointer behind it (detail 0) is Enter or Space, and there is
    // no drag to tell it apart from.
    loose.addEventListener('click', event => {
      if (event.detail === 0) layHere();
    });

    // Clicking a shiori goes to it — unless it is the one seated in
    // this very page, which comes out instead. Delegated, because the
    // cards are built fresh whenever the rail is redrawn.
    book.addEventListener('click', event => {
      const card = event.target instanceof Element
        ? event.target.closest('.bk-shiori:not(.loose)') : null;
      if (!card) return;
      const to = Number(card.dataset.page);
      if (!Number.isFinite(to)) return;
      if (to === page) {
        layHere();
        return;
      }
      page = to;
      show();
    });

    // Turning by touching the page. Two guards, both the desk's own: a
    // press that travelled more than 4px was a drag, not a click, and a
    // click that leaves text selected was a reader picking out a line,
    // not asking for the next page.
    //
    // But PAGES MUST TURN AS FAST AS THEY ARE TAPPED, and a browser
    // answers a repeat click by selecting the word under it — which
    // read as picking out a line, so every second tap was swallowed and
    // the reader had to pause between them. A repeat click on the paper
    // is someone turning pages quickly, so the selection is refused
    // before it is made (that is what preventDefault on a mousedown of
    // detail 2 or more does) and the tap turns like any other. Picking
    // out a line is still a drag, which the 4px guard has already let
    // through.
    let paperFrom = null;
    view.addEventListener('pointerdown', event => {
      paperFrom = { x: event.clientX, y: event.clientY };
    });
    view.addEventListener('mousedown', event => {
      if (event.detail >= 2) event.preventDefault();
    });
    view.addEventListener('click', event => {
      const from = paperFrom;
      paperFrom = null;
      if (!from) return;
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4) return;
      const picked = window.getSelection?.();
      if (picked && !picked.isCollapsed) {
        if (event.detail < 2) return;
        picked.removeAllRanges();   // a selection this very tap made
      }
      const box = view.getBoundingClientRect();
      turn(event.clientX < box.left + box.width / 2 ? 1 : -1);
    });

    // The shiori: a click goes to it, a drag slides it (and the book
    // travels under it, so you can see where you are putting it). The
    // 4px threshold is the desk's own — the same number that separates
    // a click from a drag everywhere else here.
    let tabPointer = null;
    let tabFrom = 0;
    let tabMoved = false;

    const tabMove = event => {
      if (event.pointerId !== tabPointer) return;
      if (!tabMoved && Math.abs(event.clientX - tabFrom) <= 4) return;
      tabMoved = true;
      dragging = true;
      loose.classList.add('dragging');
      const to = pageFromX(event.clientX);
      if (to !== page) {
        page = to;
        show();
      }
    };

    const tabDone = event => {
      if (tabPointer === null) return;
      removeEventListener('pointermove', tabMove);
      removeEventListener('pointerup', tabDone);
      removeEventListener('pointercancel', tabDone);
      tabPointer = null;
      dragging = false;
      loose.classList.remove('dragging');
      if (!event) {
        placePin();   // abandoned mid-drag: back to the page in view
        return;
      }
      // Dropped after a drag, the reader is simply where they landed:
      // travelling never quietly moves a mark. Tapped without
      // travelling, the card in your hand goes into the page.
      if (tabMoved) show();
      else layHere();
    };

    loose.addEventListener('pointerdown', event => {
      if (tabPointer !== null) return;
      event.preventDefault();
      tabPointer = event.pointerId;
      tabFrom = event.clientX;
      tabMoved = false;
      try { loose.setPointerCapture?.(event.pointerId); } catch { /* uncapturable */ }
      addEventListener('pointermove', tabMove);
      addEventListener('pointerup', tabDone);
      addEventListener('pointercancel', tabDone);
    });
    addEventListener('blur', () => tabDone(null));

    // The book takes the arrow keys only while it is the front window
    // and nothing else is typing — the TV's game guards the same way,
    // and the two never both hold the keyboard.
    document.addEventListener('keydown', event => {
      if (win.hidden) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const front = [...document.querySelectorAll('.mac-window:not([hidden])')]
        .reduce((top, other) => (Number(getComputedStyle(other).zIndex) || 0) >
          (Number(getComputedStyle(top).zIndex) || 0) ? other : top, win);
      if (front !== win) return;
      event.preventDefault();
      // Columns run right to left: leftward is onward.
      turn(event.key === 'ArrowLeft' ? 1 : -1);
    });

    // Public door: open a book by key (window.BOOKS holds the texts).
    window.ReaderApp = {
      open: key => {
        const book = window.BOOKS?.[key];
        if (!book) return;
        if (shown !== book) {
          shownKey = key;
          render(book);
          shown = book;
        }
        // Open first: a hidden window has no layout, and a book that
        // cannot be measured is a book of one very long page.
        chrome.open();
        dress();
        layout();
      },
      close: () => chrome.close(),
    };

    // The play layer signs out with sana; her book closes with it.
    document.addEventListener('identity-user-change', event => {
      if (!event.detail.user) chrome.close();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
