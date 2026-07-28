// power.js — the desk notices your battery.
//
// The rarest thing on this site: a notice that appears only when the
// machine you are reading on is actually running low. Real level, real
// time remaining, read from the browser and shown on your own screen —
// nothing is sent, stored or kept, same as everything else here that
// knows something about you.
//
// A NOTICE, NOT A WINDOW. A window is the desk's unit for things you
// DO: it takes a slot in the cascade, it drags, it waits to be
// answered. A low battery asks nothing of this page — whatever you do
// about it happens in the room, not on the desk — so it arrives at the
// top of the screen, says its piece, and leaves on its own. An OK
// button would be the desk demanding acknowledgement for something it
// only overheard.
//
// It is Chromium-only. Firefox removed the Battery Status API and
// Safari never shipped it, so for a good share of visitors this file
// does nothing at all — which is the correct behaviour, not a
// degradation: a desk that guessed at your battery would be worse than
// one that stays quiet. A desktop with no battery reports 100% and
// charging, so it never fires there either.
//
// It warns ONCE per discharge. Plug in, or climb back above the mark,
// and it arms again — a system that keeps saying the same thing is a
// system you stop reading.
//
// Feature-module pattern: this file owns its CSS, DOM and behavior.
// Cross-module door: none. Reads `data-stopped` (crash.js) because
// nothing should draw over a machine that has already given up.
(() => {
  const LOW = 0.2;             // where a laptop starts to mean it
  const SETTLE_MS = 2400;      // after the desk's welcome, like the report
  const HOLD_MS = 8000;        // long enough to read twice, short enough to forgive

  const CSS = `
    /* The rail is full width and takes no clicks; the notice inside it
       is what the pointer can reach. Centring this way keeps transform
       free for the drop, which needs it. */
    .power-rail {
      position: fixed;
      top: 16px;
      left: 0;
      right: 0;
      z-index: 9990;        /* over any window (their z climbs forever);
                               under the overlays that end a session */
      display: flex;
      justify-content: center;
      pointer-events: none;
    }

    .power-note {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: calc(100vw - 48px);
      padding: 8px 16px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
      box-shadow: 8px 8px 0 var(--identity-tint-shadow);
      color: var(--identity-normal);
      font-family: var(--font-content);
      font-size: 16px;
      line-height: 24px;
      pointer-events: auto;
      cursor: pointer;
      animation: pw-drop 240ms step-end;
    }

    /* In by whole cells, four frames, nothing in between. */
    @keyframes pw-drop {
      0%   { transform: translateY(-32px); }
      25%  { transform: translateY(-24px); }
      50%  { transform: translateY(-16px); }
      75%  { transform: translateY(-8px); }
      100% { transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .power-note { animation: none; }
    }

    /* The charge drawn rather than described: a cell on the grid, filled
       to what the machine is reporting. */
    .power-note .pw-cell {
      position: relative;
      flex: none;
      width: 48px;
      height: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .power-note .pw-cell::after {
      content: '';
      position: absolute;
      top: 4px;
      right: -8px;
      width: 4px;
      height: 8px;
      background: var(--identity-normal);
    }

    .power-note .pw-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: var(--identity-accent-pink);   /* the system's red */
    }

    .power-note .pw-words { min-width: 0; }

    .power-note .pw-head { font-weight: 700; }

    .power-note .pw-line { color: var(--identity-gray); }

    .power-note .pw-head,
    .power-note .pw-line { display: block; }
  `;

  // 40px of interior, five 8px steps — the grid, like everything else.
  const fillWidth = level => Math.max(8, Math.round((40 * level) / 8) * 8);

  const timeLeft = seconds => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const minutes = Math.round(seconds / 60);
    if (minutes < 90) return `about ${Math.max(1, minutes)} minutes`;
    const hours = Math.round(minutes / 30) / 2;      // half hours
    return `about ${hours} hours`;
  };

  let rail = null;
  let note = null;
  let goTimer = null;

  const take = () => {
    clearTimeout(goTimer);
    goTimer = null;
    if (note) {
      note.remove();
      note = null;
    }
  };

  const say = battery => {
    take();
    const percent = Math.round(battery.level * 100);
    const left = timeLeft(battery.dischargingTime);
    note = document.createElement('div');
    note.className = 'power-note';
    note.setAttribute('role', 'status');
    note.innerHTML = `
      <span class="pw-cell"><span class="pw-fill" style="width:${fillWidth(battery.level)}px"></span></span>
      <span class="pw-words">
        <span class="pw-head">the battery is low.</span>
        <span class="pw-line">${percent}% left${left ? `, ${left}` : ''}.</span>
      </span>`;
    note.addEventListener('click', take);      // read it, dismiss it
    rail.appendChild(note);
    goTimer = setTimeout(take, HOLD_MS);
  };

  const boot = async () => {
    if (typeof navigator.getBattery !== 'function') return;

    let battery;
    try {
      battery = await navigator.getBattery();
    } catch {
      return;      // asked and refused: stay quiet
    }
    if (!battery || typeof battery.level !== 'number') return;

    document.head.appendChild(Object.assign(document.createElement('style'),
      { textContent: CSS }));
    rail = document.createElement('div');
    rail.className = 'power-rail';
    document.body.appendChild(rail);

    let warned = false;
    const look = () => {
      if (battery.charging || battery.level > LOW) {
        warned = false;                      // plugged in, or back up: arm again
        return;
      }
      if (warned) return;
      if (document.documentElement.dataset.stopped === 'true') return;
      warned = true;
      say(battery);
    };

    battery.addEventListener('levelchange', look);
    battery.addEventListener('chargingchange', look);
    // A machine that is already low when the page opens still gets told,
    // but only once the desk has finished coming up.
    setTimeout(look, SETTLE_MS);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
