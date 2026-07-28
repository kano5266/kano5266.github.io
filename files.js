// files.js — the file types the system knows, apart from any folder
// that happens to hold them. A thing in the trash is just a thing: the
// Trash lists it, but what a file IS lives here.
//
// The plain types are the folder kit's own: kind 'text' and 'image'
// open in the kit's shared viewer (folder.js) and need no code here —
// eldrazi_edh.txt is one of those, a deck registry whose list lives in
// eldrazi.deck.js. The richer types are this file's:
//   .dsk    — the GAME DISK: opening one shows the floppy itself,
//             hand-sized, label out (shutter, slit, clipped corner,
//             write-protect notch), the label carrying the whole
//             instruction sheet, the era's way of printing the manual
//             on the sticker.
//   .exe    — an executable from ANOTHER system, which this one
//             cannot run: opening it panics the machine (crash.js).
//             It is in the trash because it was never going to open.
//   .app    — a NATIVE program, which is what this desk runs.
//             invoice.pdf.app wears a DOCUMENT's icon on purpose: the
//             double extension is the whole joke, and unlike setup.exe
//             this one runs. It takes the desk hostage (locker.js).
//   .book   — a book, which opens in the reader (reader.js) rather
//             than the note viewer, because a novel wants pages and
//             縦書き, not a scroll. Its text is a 青空文庫 file kept
//             beside it (mikan.aozora.js), that suffix naming the
//             notation the words are written in.
// Feature-module pattern: this file owns its CSS, DOM and behavior;
// the page supplies .mac-window chrome + VisualIdentity. Cross-module
// doors: window.SystemFiles.
(() => {
  const CSS = `
    /* The floppy, label out — the label IS the instruction sheet. */
    .disk-window .dw-floppy {
      position: relative;
      width: 264px;
      height: 264px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-soft);
    }

    .disk-window .dw-corner {
      position: absolute;
      right: -4px;
      top: -4px;
      width: 32px;
      height: 32px;
      background: var(--identity-paper);
      border-left: 4px solid var(--identity-normal);
      border-bottom: 4px solid var(--identity-normal);
    }

    .disk-window .dw-shutter {
      position: absolute;
      left: 64px;
      top: 16px;
      width: 128px;
      height: 56px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-tint-mid);
    }

    .disk-window .dw-slit {
      position: absolute;
      left: 72px;
      top: 8px;
      width: 24px;
      height: 40px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .disk-window .dw-label {
      position: absolute;
      left: 24px;
      right: 24px;
      top: 96px;
      bottom: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      padding: 8px 16px;
    }

    .disk-window .dw-title {
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 4px solid var(--identity-normal);
      font-weight: 700;
      font-size: 16px;
      line-height: 24px;
    }

    .disk-window .dw-label p {
      margin: 0;
      font-size: 16px;
      line-height: 24px;
      white-space: pre-line;
    }

    .disk-window .dw-notch {
      position: absolute;
      left: 16px;
      bottom: 16px;
      width: 16px;
      height: 16px;
      background: var(--identity-tint-deep);
    }
  `;

  // The one .dsk in the world so far. The item is data the Trash may
  // list; opening it is this file's business.
  const blockadeDisk = { name: 'blockade.dsk', kind: 'app', art: 'disk',
    open: () => window.SystemFiles?.openDisk?.() };

  // A deck registry: a plain .txt, so it opens in the folder kit's
  // viewer like any other note. Grouped by card type, the way the
  // builder groups it (eldrazi.deck.js holds the list).
  const eldraziDeck = { name: 'eldrazi_edh.txt', kind: 'text', art: 'draft',
    get body() { return window.DECKS?.eldrazi?.trim() || ''; } };

  // Its opposite number: ninety-eight cards of setup for one sorcery
  // (worldfire.deck.js holds the list).
  const worldfireDeck = { name: 'worldfire_edh.txt', kind: 'text', art: 'draft',
    get body() { return window.DECKS?.worldfire?.trim() || ''; } };

  // A book kept in the trash, which is its own kind of statement: a
  // 青空文庫 text (mikan.aozora.js holds it) that opens in the reader
  // rather than the note viewer, because it is a novel and reads
  // 縦書き. The file type is .book — what the thing IS, the way .dsk
  // is a disk; the source file keeps .aozora for the notation it is
  // written in.
  const mikanBook = { name: 'mikan.book', kind: 'app', art: 'book',
    open: () => window.ReaderApp?.open('mikan') };

  // The one thing on this desk that does not run. A stranger's
  // executable, kept in the trash because it was never going to open —
  // and opening it is exactly what stops the machine (crash.js owns
  // the blue screen; this only knows which module to name on it).
  const setupExe = { name: 'setup.exe', kind: 'app', art: 'exe',
    open: () => window.SystemCrash?.panic('setup.exe') };

  // The other thing that does not open the way it looks like it will.
  // A document's icon and a program's second extension — the joke is
  // over before you have clicked, if you were reading. It sits behind
  // two folders that both say not to (trash.js), and locker.js owns
  // what happens when someone ignores both.
  const invoiceApp = { name: 'invoice.pdf.app', kind: 'app', art: 'draft',
    open: () => window.SystemLocker?.run?.() };

  const boot = () => {
    const VI = window.VisualIdentity;
    if (!VI) return;

    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

    const win = document.createElement('section');
    win.className = 'mac-window disk-window';
    win.dataset.resize = 'none';
    win.hidden = true;
    win.innerHTML = `
      <div class="mac-content">
        <div class="dw-floppy">
          <span class="dw-corner"></span>
          <div class="dw-shutter"><span class="dw-slit"></span></div>
          <div class="dw-label">
            <p class="dw-title">BLOCKADE</p>
            <p>load disk into console,
connect console to TV set,
tune to channel 3.</p>
          </div>
          <span class="dw-notch"></span>
        </div>
      </div>`;
    document.body.appendChild(win);
    const chrome = VI.attachWindowChrome(win, {
      title: 'blockade.dsk',
      closeLabel: 'Close disk window',
    });

    window.SystemFiles = {
      blockadeDisk,
      mikanBook,
      setupExe,
      invoiceApp,
      eldraziDeck,
      worldfireDeck,
      openDisk: () => chrome.open(),
      closeDisk: () => chrome.close(),
    };

    // The play layer signs out with sana; a file window is hers too.
    document.addEventListener('identity-user-change', event => {
      if (!event.detail.user) chrome.close();
    });
  };

  // The item must exist before trash.js builds its inventory (script
  // order runs this file first); the window can wait for boot.
  window.SystemFiles = { blockadeDisk, mikanBook, setupExe, invoiceApp, eldraziDeck, worldfireDeck };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
