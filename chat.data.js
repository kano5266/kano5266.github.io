// Data for Messages (chat.js). The thread itself is the NEWS timeline
// (news.md.js, parsed by tv.js): old items replay as dated history, the
// newest arrives live as the unread message. This file holds only what
// Jiali says herself.
//
// CHAT_GREETINGS: typed in a few seconds after the news lands — the
// "oh, you're actually there" moment. Keep them short.
window.CHAT_GREETINGS = [
  "hi! I'm Jiali — thanks for dropping by (^-^)",
  'I research explainable AI for graph neural networks at Kyoto University.'
  // 'psst — this desk has a light switch, top right. try it.'   // hidden for now
];

// Quick replies the reader can tap; each gets one answer from Jiali.
window.CHAT_REPLIES = [
  { text: 'hi!', reply: 'hi hi! (^o^)/' },
  // { text: 'nice desk (^-^)', reply: 'thanks! I pixeled everything myself — 8px at a time.' },   // hidden for now
  { text: 'tell me about your research', reply: 'I make GNN decisions explainable — counterfactuals, mostly. the Publications window has the papers!' }
];

// The cat sticker: what Jiali says when the reader sends it.
// (The sticker button itself is hidden for now — see buildReplies() in chat.js.)
window.CHAT_STICKER_REPLY = 'you found my cat!! (=^･ω･^=) her name is Mochi.';

// Sharing materials: clicking a "slides"/"paper" button under a paper in
// Publications opens Messages and Jiali sends the file here. This is what she
// says before it arrives — {kind} is the material (slides/paper), {venue} the
// conference. Tapping the file bubble that follows downloads it.
window.CHAT_SHARE_MESSAGE = 'here you go — my {kind} from {venue} ! (^-^)';

// The profile card behind the avatar is NOT configured here — it syncs
// with the Contacts app (the owner record in contacts.md.js), shown
// iOS-style with notes omitted. Edit the CV over there.
