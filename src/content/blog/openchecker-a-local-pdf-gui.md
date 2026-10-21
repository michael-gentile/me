---
title: "openChecker: a local PDF GUI"
date: 2026-08-28
tags:
  - programming
summary: I wrapped an open-source Java PDF extractor in a local drop-a-file page. Markdown, JSON with bounding boxes, and an annotated overlay.
---

Copy-paste out of a PDF viewer gives you a reading order the file never promised. Dump raw text into a model and you lose headings, smash columns, and have no coordinates when someone asks where a sentence came from. **openChecker** is a local FastAPI GUI around [opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf): drop a file on your machine, get Markdown, JSON with bounding boxes, and an annotated overlay—no upload account, no hosted OCR.

Picture a near-black page with a teal drop zone after dinner: one digital PDF, one JVM boot, four tabs from a single `convert` call. The upstream project (Apache 2.0, Java 11, Python bindings on PyPI) already does layout analysis and those export formats; hybrid OCR and PDF/UA exist upstream too, but we left them off because a wrapper that also boots a second AI server is not something we would run casually. Below: what the page does, why we wrapped instead of forked, and the Mac JDK path bug we hit first.

**Layout analysis** here means the extractor infers structure (blocks, lines, tables) from PDF operators, not from how a human would read aloud. **Bounding box** is a rectangle in page space—usually left, top, right, bottom in PDF units—tying a text span to a place on the page. **Born-digital** PDFs were exported from Word, LaTeX, or InDesign; scanned pages need OCR, which is a different upstream mode we did not enable in v1.

## One convert call feeds Markdown, JSON, overlay, and optional tagged PDF

The UI is one HTML page—near-black paper, teal, a drop zone. **Try sample PDF** loads a one-page digital file, or you drop your own, with an optional checkbox for a tagged PDF before you hit Check. The server writes the upload to a temp directory and calls `opendataloader_pdf.convert` **once** (each call starts a JVM, and looping `convert()` per format is how you learn that the hard way): Markdown, JSON, and the overlay come from that one process, not from three JVMs.

<img
  src="/me/images/blog/open-checker-page.webp"
  alt="openChecker in dark mode: a dashed drop zone, an Also emit a tagged PDF checkbox, and Try sample PDF and Check PDF buttons, with Java ready shown as OpenJDK 26."
  width="1280"
  height="1103"
  decoding="async"
  fetchpriority="high"
/>

What comes back is four tabs from that one convert:

- **Markdown:** headings, lists, tables, reading order. The thing you'd chunk later.
- **JSON:** the same elements with bounding boxes. Each box is page coordinates (left, top, right, bottom). Scroll until you see those four numbers next to a heading. That rectangle is what you'd highlight if someone asked where a sentence came from.
- **Annotated PDF:** the overlay the extractor already knows how to draw. The tab shows page images of that overlay; the download is the PDF itself. Native iframe PDF viewers on this stack often stayed blank if the file loaded while the tab was hidden, so the GUI rasterizes pages with pypdfium2 and shows PNGs.
- **Tagged PDF:** only if you tick the box. Auto-tagging is free upstream. Full PDF/UA export isn't, and this GUI doesn't pretend otherwise. Tagged and PDF/UA aren't the same checkbox.

The file never leaves the machine: no account, and no hosted OCR. If `java -version` fails, the page says so instead of hanging on a spinner.

### Worked example: tracing one sentence to a box

1. Drop a one-page digital PDF with a clear H1 and two paragraphs.
2. Open the Markdown tab; copy the H1 text.
3. Open the JSON tab; search for that string in the element list.
4. Read the `bbox` (or equivalent) array on that element—four numbers. Note the page index.
5. Open the Annotated PDF tab; find the highlighted region on the rasterized page. It should cover the same heading visually.

If Markdown order swaps two columns, the JSON boxes still tell you where each block lived on the page—useful when building RAG citations that must point to coordinates, not just chunk text.

## The PyPI package already is the product—we added the click path

The GitHub repo is the product. Cloning it into a folder and slapping a form on the CLI would still be their code, plus a worse install. The Python package already bundles the CLI. The GUI is the missing piece: a browser, a drop target, tabs, download links.

Hybrid mode is the tempting add-on. Scans, borderless tables, LaTeX, chart captions. It wants `opendataloader-pdf-hybrid` on another port and a pile of extra models. That's useful on a bench and wrong for v1. Deterministic local mode: digital PDFs in, structure out, JVM on the PATH.

Homebrew on a Mac often has a JDK and still reports `Unable to locate a Java Runtime`. The app looks under `/opt/homebrew/opt/openjdk*` when `PATH` is shy. That's the bug we hit first.

The benchmark numbers on the upstream README are theirs. What we needed was a page we'd click, on a laptop, without sending a PDF to a cloud parser we don't run.

Run it locally. Drop a born-digital file. Read the Markdown. Scroll the JSON until you see a bounding box. We got tired of remembering the CLI flags.

## Verification steps before you trust output

**Java present**

```console
$ java -version
```

The UI should show "Java ready" with a version string. If not, install OpenJDK 11+ and on Apple Silicon ensure `/opt/homebrew/opt/openjdk/bin` is on PATH or let the app's fallback find the Cellar layout.

**Single JVM per request**

Watch process list during one Check: one short-lived `java` child from Python, not three. If you extend the app, never call `convert()` per tab.

**Temp hygiene**

Uploads live in a temp directory. After the response, confirm deletion (or documented retention policy) so a sensitive PDF does not accumulate on disk.

**Large files**

Try a 50-page digital PDF. Note memory and time. The GUI is for inspection, not batch ETL—upstream CLI may be better for directories of files.

**Scanned PDFs**

Expect weak structure without hybrid OCR. Verification: a scan should not pretend to perfect Markdown; note missing text or garbage order and route those files to hybrid upstream when you choose to run it.

## Limits: what openChecker v1 does not solve

- **No cloud, also no team sharing.** Everyone runs their own instance; there is no multi-user audit log.
- **Digital-first.** Scanned contracts, phone photos saved as PDF, and fax dumps need OCR/hybrid—explicitly out of scope for the wrapper we ship.
- **PDF/UA compliance.** Optional tagged PDF is not a compliance certificate; accessibility workflows need upstream PDF/UA tooling and human review.
- **JVM cost.** Cold start per convert is seconds on a laptop; not ideal for high-QPS APIs without pooling (not implemented here).
- **Security boundary.** Local GUI reduces exfiltration risk but does not sandbox malicious PDFs; Java PDF parsers have had bugs—do not drop untrusted nation-state samples on your daily driver without isolation.

## Architecture in one pass

Browser → FastAPI upload endpoint → temp file → `opendataloader_pdf.convert` → read emitted Markdown/JSON/PDF paths → return HTML tabs plus download links. Annotated tab: pypdfium2 renders pages to PNG for display. No database, no queue, no worker pool—deliberately boring.

When integrating with downstream RAG: prefer JSON boxes for citation UI; prefer Markdown for chunking; store page number and bbox with each chunk so answers can show "page 3, region (x,y,w,h)."

## When to use CLI vs GUI

Use the GUI when exploring a new PDF format or demoing structure to someone non-technical. Use the upstream CLI when batch-converting a corpus in CI or when you need flags the GUI does not expose. The wrapper's value is discoverability and one-click tabs, not feature parity with every upstream flag.

## Sources

- [opendataloader-pdf](https://github.com/opendataloader-project/opendataloader-pdf) (upstream extractor)
- [pypdfium2](https://github.com/pypdfium2-team/pypdfium2) (page raster for the annotated-PDF tab)
- Related: [PageIndex: vectorless RAG](/me/blog/pageindex-vectorless-rag/), [Helping agents discover a static site](/me/blog/helping-agents-discover-a-static-site/)
