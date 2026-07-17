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
// The same items appear twice on the desk: CH 1 of the TV rolls them as
// an endroll (oldest to newest, ending on the latest), and Messages
// replays them as chat history along the timeline — with the newest one
// arriving live as the unread message.
window.NEWS_MD = String.raw`
## 2026 JUL
This pixel homepage went live!

## 2025 JUN
Our paper appears at ACM FAccT 2025
`;
