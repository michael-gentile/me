---
title: "openChecker: a local PDF GUI"
date: 2026-08-28
tags:
  - pdf
  - python
  - fastapi
  - accessibility
summary: I wrapped an open-source Java PDF extractor in a local drop-a-file page. Markdown, JSON with bounding boxes, and an annotated overlay.
---

A PDF is a pile of drawing instructions. Copy-paste out of a viewer and you get a reading order the file never promised. Dump the raw text into a model and you lose headings, smash columns, and have no coordinates when someone asks where a sentence came from.

[opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf) already exists: Apache 2.0, Java 11 underneath, Python bindings on PyPI. Layout analysis, Markdown, JSON with bounding boxes, an annotated overlay. Hybrid OCR and PDF/UA export exist upstream too. I left those off. A wrapper that also boots a second AI server is no longer something I'd run after dinner.

## The page

openChecker is a local FastAPI app. One HTML page, near-black paper, teal, a drop zone. **Try sample PDF** loads a one-page digital file, or you drop your own. There's a checkbox for a tagged PDF. Hit Check. The server writes the upload to a temp directory and calls `opendataloader_pdf.convert` **once**. Each call starts a JVM. Looping `convert()` per format is how you learn that the hard way: Markdown, JSON, and the overlay come from that one process, not from three JVMs.

<img
  src="/me/images/blog/open-checker-page.webp"
  alt="openChecker in dark mode: a dashed drop zone, an Also emit a tagged PDF checkbox, and Try sample PDF and Check PDF buttons, with Java ready shown as OpenJDK 26."
  width="1280"
  height="1103"
  decoding="async"
  fetchpriority="high"
/>

What comes back:

- **Markdown:** headings, lists, tables, reading order. The thing you would chunk later.
- **JSON:** the same elements with bounding boxes. Each box is page coordinates (left, top, right, bottom). Scroll until you see those four numbers next to a heading. That rectangle is what you would highlight if someone asked where a sentence came from.
- **Annotated PDF:** the overlay the extractor already knows how to draw. The tab shows page images of that overlay; the download is the PDF itself. Native iframe PDF viewers on this stack often stayed blank if the file loaded while the tab was hidden, so the GUI rasterizes pages with pypdfium2 and shows PNGs.
- **Tagged PDF:** only if you tick the box. Auto-tagging is free upstream. Full PDF/UA export isn't, and this GUI doesn't pretend otherwise. Tagged and PDF/UA are not the same checkbox.

The file never leaves the machine: no account, and no hosted OCR. If `java -version` fails, the page says so instead of hanging on a spinner.

## Why wrap instead of clone

The GitHub repo is the product. Cloning it into a folder and slapping a form on the CLI would still be their code, plus a worse install. The Python package already bundles the CLI. The GUI is the missing piece: a browser, a drop target, tabs, download links.

Hybrid mode is the tempting add-on. Scans, borderless tables, LaTeX, chart captions. It wants `opendataloader-pdf-hybrid` on another port and a pile of extra models. That is useful on a bench and wrong for v1. Deterministic local mode: digital PDFs in, structure out, JVM on the PATH.

Homebrew on a Mac often has a JDK and still reports `Unable to locate a Java Runtime`. The app looks under `/opt/homebrew/opt/openjdk*` when `PATH` is shy. That's the bug I hit first.

The benchmark numbers on the upstream README are theirs. What I needed was a page I would click, on a laptop, without sending a PDF to a cloud parser I don't run.

Run it locally. Drop a born-digital file. Read the Markdown. Scroll the JSON until you see a bounding box. I got tired of remembering the CLI flags.