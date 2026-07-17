// Publication data for index.html — plain BibTeX inside a JS
// wrapper (a bare .bib file would need fetch(), which file:// forbids).
// Edit between the backticks as ordinary BibTeX.
//
// How entries are displayed:
//   - Grouping: the custom `category` field ({journal}, {international},
//     {domestic}, {preprint}) wins; otherwise mapped from the entry type
//     (@article -> journal, @inproceedings -> international,
//      @techreport -> domestic, @unpublished -> preprint, else -> other).
//     Empty sections are not rendered.
//   - Venue: custom `shortvenue` field if present, else booktitle/journal.
//   - Authors: "Last, First" names render as "F Last"; names without a
//     comma (e.g. CJK) render as written.
//   - Within a section, entries sort by year (newest first).
//
// Caveats of the JS wrapper: avoid backticks and the sequence ${ in values.

// Author names (as written in the BibTeX below) that identify the site owner —
// they get highlighted in the rendered author lists.
window.PUBLICATIONS_SELF = ['Ma, Jiali', '馬嘉利'];

window.PUBLICATIONS_BIB = String.raw`

@inproceedings{ma2025c2explainer,
  title      = {C2Explainer: Customizable Mask-based Counterfactual Explanation for Graph Neural Networks},
  author     = {Ma, Jiali and Takigawa, Ichigaku and Yamamoto, Akihiro},
  booktitle  = {Proceedings of the 2025 ACM Conference on Fairness, Accountability, and Transparency (FAccT)},
  shortvenue = {ACM FAccT},
  year       = {2025},
  slides     = {pdfs/FAccT2025_slide.pdf},
  url        = {https://scholar.google.com/citations?view_op=view_citation&hl=en&user=DxWQw84AAAAJ&citation_for_view=DxWQw84AAAAJ:u5HHmVD_uO8C}
}

@inproceedings{ma2025portfolio,
  title      = {ポートフォリオマネジメントにおける深層強化学習を解釈するための反実仮想説明法},
  author     = {馬嘉利 and 山本章博 and 伊藤青葉},
  booktitle  = {第39回人工知能学会全国大会 (JSAI 2025)},
  shortvenue = {JSAI Annual Conference 39},
  category   = {domestic},
  pages      = {3Win562},
  year       = {2025},
  url        = {https://scholar.google.com/citations?view_op=view_citation&hl=en&user=DxWQw84AAAAJ&citation_for_view=DxWQw84AAAAJ:2osOgNQ5qMEC}
}

@techreport{ma2025propagation,
  title      = {Counterfactual Explanation Propagation for Graph Neural Networks},
  author     = {Ma, Jiali},
  booktitle  = {人工知能学会研究会資料 人工知能基本問題研究会 第131回 (SIG-FPAI)},
  shortvenue = {JSAI SIG-FPAI 131},
  pages      = {56-61},
  year       = {2025},
  url        = {https://scholar.google.com/citations?view_op=view_citation&hl=en&user=DxWQw84AAAAJ&citation_for_view=DxWQw84AAAAJ:u-x6o8ySG0sC}
}

@techreport{ma2024recourse,
  title      = {Algorithmic Recourse for Graph Neural Networks via Customizable Edge Masks},
  author     = {Ma, Jiali},
  booktitle  = {人工知能学会研究会資料 人工知能基本問題研究会 第129回 (SIG-FPAI)},
  shortvenue = {JSAI SIG-FPAI 129},
  pages      = {02-07},
  year       = {2024},
  url        = {https://scholar.google.com/citations?view_op=view_citation&hl=en&user=DxWQw84AAAAJ&citation_for_view=DxWQw84AAAAJ:9yKSN-GCB0IC}
}

@techreport{ma2024nonsubgraph,
  title      = {Non-subgraph Counterfactual Explanation for Node Classification Graph Neural Networks},
  author     = {Ma, Jiali},
  booktitle  = {人工知能学会研究会資料 人工知能基本問題研究会 第128回 (SIG-FPAI)},
  shortvenue = {JSAI SIG-FPAI 128},
  pages      = {28-33},
  year       = {2024},
  url        = {https://scholar.google.com/citations?view_op=view_citation&hl=en&user=DxWQw84AAAAJ&citation_for_view=DxWQw84AAAAJ:d1gkVwhDpl0C}
}

`;
