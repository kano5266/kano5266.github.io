// The news timeline, in markdown — edit the text between the backticks
// freely; tv.js parses it at load and shares the result
// (window.NEWS_ITEMS) with Messages. (The markdown lives in this thin JS
// wrapper so the site keeps working from file:// with no fetch — the same
// pattern as publications.bib.js and contacts.md.js.)
//
// Format, per item — NEWEST FIRST:
//   ## date            <- as shown ("2026 JUL")
//   one line of text
//
// The same items appear in three places on the desk. The TV: CH 1 holds
// the NEWEST as the headline under the LIVE bug and crawls the older
// ones along the ticker; CH 2 rolls the whole timeline as an endroll,
// oldest to newest, ending on the latest. Messages: the timeline replays
// as dated chat history, with the newest arriving live as the unread
// message the red dot is for. And the arrival NOTICE at the top of the
// screen, which carries that same newest item in as a message banner
// and opens the thread if it is clicked (the welcome script at the foot
// of index.html).
window.NEWS_MD = String.raw`
## 2026 JUL
This pixel homepage went live!

## 2025 JUN
Our paper appears at ACM FAccT 2025
`;
