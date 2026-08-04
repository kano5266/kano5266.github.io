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
// The frame, the rail and the drop are VisualIdentity.notify's — this
// file only draws the battery cell and says the words. The rail is
// shared because the arrival's message banner uses it too, and two
// modules each pinning their own notice to the top of the screen would
// land exactly on top of each other.
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

  // Only the cell — the notice's own frame, rail and drop come with it.
  const CSS = `
    /* The charge drawn rather than described: a cell on the grid, filled
       to what the machine is reporting. */
    .sys-note .pw-cell {
      position: relative;
      width: 48px;
      height: 24px;
      border: 4px solid var(--identity-normal);
      background: var(--identity-paper);
    }

    .sys-note .pw-cell::after {
      content: '';
      position: absolute;
      top: 4px;
      right: -8px;
      width: 4px;
      height: 8px;
      background: var(--identity-normal);
    }

    .sys-note .pw-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: var(--identity-accent-pink);   /* the system's red */
    }
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

  // The live notice's own dismissal, handed back by notify(). Held so a
  // second warning replaces the first rather than stacking under it.
  let take = () => {};

  const say = battery => {
    take();
    const percent = Math.round(battery.level * 100);
    const left = timeLeft(battery.dischargingTime);
    const cell = document.createElement('span');
    cell.className = 'pw-cell';
    cell.innerHTML = `<span class="pw-fill" style="width:${fillWidth(battery.level)}px"></span>`;
    take = window.VisualIdentity.notify({
      mark: cell,
      head: 'the battery is low.',
      line: `${percent}% left${left ? `, ${left}` : ''}.`,
      hold: HOLD_MS
    });
  };

  const boot = async () => {
    if (typeof navigator.getBattery !== 'function') return;
    if (typeof window.VisualIdentity?.notify !== 'function') return;

    let battery;
    try {
      battery = await navigator.getBattery();
    } catch {
      return;      // asked and refused: stay quiet
    }
    if (!battery || typeof battery.level !== 'number') return;

    document.head.appendChild(Object.assign(document.createElement('style'),
      { textContent: CSS }));

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
