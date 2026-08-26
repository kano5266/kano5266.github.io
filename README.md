# System 8 — Jiali Ma's personal site

A personal academic homepage built as a tiny pixel-art desktop OS ("System 8"):
Contacts, Messages, Publications, TV, Wallet, and a Control Panel, all hand-
pixeled on an 8px grid. Vanilla HTML / CSS / JavaScript, no build step — open
`index.html`.

© 2026 Jiali Ma. All rights reserved. See [LICENSE](LICENSE).

## Layout

    index.html   the desk itself — markup, all the CSS, VisualIdentity
    js/                     one file per app or system feature
    data/                   content as data: *.md.js, *.bib.js, *.deck.js
    avatars/ cards/ icons/  artwork the page loads
    fonts/ pdfs/
    tools/                  pixel, card and icon editors (workshop only)
    docs/                   STYLE_GUIDE.md — the rules, and why
    art/                    drawings nothing currently wears
    publish.sh              build the public copy; stamp-version.sh stamps the build id

`js/` and `data/` keep their names in the published site: there is no build
step and the page must run from `file://`, so a script's path is the same
string here and on the server. Anything not listed in `publish.sh` does not
ship — that file is the source of truth for what the site actually needs.

## Fonts

The fonts are third-party. They stay under their own licences and are **not**
covered by the copyright above — nothing here grants any rights in them.

- **Enter Command** — © jeti ([Font End Dev](https://fontenddev.com/fonts/enter-command/)),
  licensed [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Bundled here;
  terms in [fonts/EnterCommand-LICENSE.txt](fonts/EnterCommand-LICENSE.txt).
  This credit is the attribution CC BY asks for.
- **DotGothic16** — © 2020 The DotGothic16 Project Authors
  ([Fontworks Inc.](https://github.com/fontworks-fonts/DotGothic16)), licensed under
  the SIL Open Font License 1.1. Bundled here; the full licence travels with it in
  [fonts/DotGothic16-OFL.txt](fonts/DotGothic16-OFL.txt), as the OFL requires.
  The published site ships a **subset** (the glyphs the site uses, plus all kana)
  built by [fonts/subset-dotgothic16.sh](fonts/subset-dotgothic16.sh); the full
  font stays in this repo as the source. The OFL permits subsetting, and
  DotGothic16 declares no Reserved Font Name.
- **Silkscreen** — © 2001 The Silkscreen Project Authors
  ([Jason Kottke](https://github.com/googlefonts/silkscreen)), licensed under the
  SIL Open Font License 1.1. Self-hosted (it used to load from Google Fonts);
  the licence travels with it in [fonts/Silkscreen-OFL.txt](fonts/Silkscreen-OFL.txt).
