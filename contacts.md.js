// Contacts, written in markdown — edit the text between the backticks
// freely; contacts.js parses it at load. (The markdown lives in this thin
// JS wrapper so the site keeps working from file:// with no fetch — the
// same pattern as publications.bib.js.)
//
// Format, per contact:
//   # Name · kanji (admin)       <- "(admin)" marks the owner card
//   avatar: avatars/sana.svg  <- optional; omit for the anonymous placeholder
//   role: PhD Student
//   - label: value               <- info rows (mail: becomes a mailto);
//                                   repeat a label to list several values
//                                   (e.g. two affiliations) — grouped in the card
//   ## links                     <- one action bubble per item
//   - [Label](https://...)       <- linked = live bubble
//   - [Label](app:chat)          <- opens an app in-page (app:chat = Messages); shown first
//   - Label (soon)               <- "(soon)" = gray placeholder bubble
//   ## notes                     <- the CV lines, one per item
//   - anything
window.CONTACTS_MD = String.raw`
# Jiali Ma · まかり (admin)
avatar: avatars/jiali-round.svg
role: PhD Student

- affiliation: Kyoto University · Graduate School of Informatics
- affiliation: University of Tokyo · Graduate School of Frontier Science
- research interest: Counterfactual Explanation · Algorithmic Recourse · Graph Neural Networks
- broader research interest: Explainable AI · Interpretability · Knowledge Discovery · Causal Inference
- mail: ma.jiali.28s@st.kyoto-u.ac.jp

## links
- [Messages](app:chat)
- [Google Scholar](https://scholar.google.com/citations?user=DxWQw84AAAAJ&hl=en)
- ORCID (soon)

## notes
- JSAI student member
// - service — reviewer, NeurIPS 2026

# A. Yamamoto · 山本章博
avatar: avatars/sensei.svg
role: Professor

- affiliation: Kyoto University · Informatics

## notes
- Jiali's PhD advisor

# I. Takigawa · 瀧川一学
avatar: avatars/takigawa.svg
role: Professor

- affiliation: University of Tokyo · Graduate School of Frontier Sciences

## notes
- Jiali's PhD advisor

# Mochi
avatar: avatars/cat.svg
role: chief designer & OS maintainer, self-appointed

## notes
- designs the OS & writes its code by napping on the warm part of the keyboard
- accepts pets · rejects paper drafts
`;
