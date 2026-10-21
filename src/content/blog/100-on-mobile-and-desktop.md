---
title: "PageSpeed: 100 on mobile and desktop"
date: 2026-08-20
tags:
  - web
summary: "PageSpeed Insights on the live home: mobile 89 and desktop 99 at first. Self-hosted fonts and sized WebP screenshots brought both viewports to 100."
---

A small static site on GitHub Pages still leaks performance budget on the critical path: a second origin for fonts, and hero images wider than the column. [PageSpeed Insights](https://pagespeed.web.dev/) on [michael-gentile.github.io/me](https://michael-gentile.github.io/me/) after launch showed mobile 89 and desktop 99—respectable, especially on desktop, but the report named two fixes before both viewports could hit 100. The ceiling is not “add a framework”; it is every origin, byte, and layout slot the first paint waits on.

## Terms that show up in the report

**Critical path** is the chain of network requests and layout work the browser must finish before it can paint meaningful content. Extra origins and oversized assets extend that chain even when total page weight looks modest.

**First Contentful Paint (FCP)** is when the first text or image from the DOM appears. **Largest Contentful Paint (LCP)** is when the largest above-the-fold element finishes rendering—often a hero image or a headline block. **Cumulative Layout Shift (CLS)** measures unexpected movement: layout jumps when an image arrives without reserved space. **Total Blocking Time (TBT)** sums main-thread blocks long enough to delay input; on a static site with almost no JavaScript, TBT should stay near zero. **Speed Index** approximates how quickly content becomes visually complete; a long blog index with hundreds of cards can score well on LCP yet still look “slow” here because the browser lays out everything below the fold early.

**Origin** means scheme plus host plus port. A stylesheet from `fonts.googleapis.com` is a different origin from `michael-gentile.github.io`, so the browser pays DNS, TLS, and connection setup again before the first woff2 byte arrives.

## Runtime Google Fonts was an extra origin on the critical path

Newsreader and Source Sans 3 used to arrive from fonts.googleapis.com. That's a second origin, CSS, then woff2, before the titles look like titles. PSI called it out on mobile.

The site now uses Astro's Fonts API. `fontProviders.google()` still *downloads* those families at build. What the visitor gets is woff2 files from this origin, with `<Font>` in `BaseLayout.astro` preloading the latin normal cuts. `global.css` maps `--font-sans` and `--font-serif` to those variables. There is no Google Fonts stylesheet at runtime.

Weights actually shipped: Newsreader 500 and 700, Source Sans 3 400 and 600, plus italic 400. That's enough for titles, body, and emphasis—not the whole family.

### Worked path: confirm fonts are same-origin

After `npm run build`, open `dist/` and search for `fonts.googleapis.com`. There should be no runtime link to Google’s CDN in the emitted HTML for production pages.

On the live site, DevTools → Network → filter **Font**. Reload with cache disabled. Every font request should target `michael-gentile.github.io` (under `/me/_astro/` or the path Astro emitted), not `fonts.gstatic.com`.

In the document head, look for `<link rel="preload" … as="font" … crossorigin>` pointing at those local woff2 files. Preload tells the browser to start the download early, which helps LCP when the LCP element is serif body copy or a large heading.

## Oversized PNGs paid for pixels the layout never showed

The stack post screenshots started as PNGs that were wider than the column. The browser downloaded the extra pixels, then the layout jumped when the image arrived because the markup had no width or height.

They were resized to 1280 px wide, encoded WebP, and given `width` and `height` on the `<img>` tags, plus `decoding="async"` and `fetchpriority` or `loading="lazy"`. The markdown posts that show a screenshot use that HTML so the dimensions survive the build.

The PSI capture screenshots were 1712 px PNGs. Same treatment: 1280 px WebP, about 34 KB each instead of ~250 KB.

**Intrinsic size** in HTML reserves layout space before decode finishes. Without `width` and `height`, the browser assumes zero height until it knows the image dimensions, then reflows—CLS spikes even when the image is “only” a blog illustration.

**fetchpriority="high"** on the first above-the-fold screenshot nudges the scheduler toward that request on the home page. **loading="lazy"** on images below the fold defers work until the user scrolls near them—appropriate for long posts with many figures.

### Worked path: resize and verify one asset

From the repo root, pick a heavy PNG under `public/images/blog/`:

```sh
file public/images/blog/example.png
# note dimensions; if width >> 1280, resize

npx --yes @squoosh/cli --webp auto -d /tmp/out public/images/blog/example.png
ls -lh /tmp/out/
```

Replace the source, update the markdown `<img width="…" height="…">` to match the new pixel dimensions (height scales with aspect ratio). Rebuild, deploy, and re-run PSI on the URL that embeds the image. The “properly size images” audit should drop off when displayed size matches intrinsic size within reasonable bounds.

## Both viewports reached 100 after the second run

Both viewports came back 100 for Performance, Accessibility, Best Practices, and SEO. CLS on both runs was 0.

![PageSpeed Insights mobile: 100 for Performance, Accessibility, Best Practices, and SEO. First Contentful Paint 0.8 s, Largest Contentful Paint 1.2 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.8 s.](/me/images/blog/google-insights-mobile.webp)

Mobile lab metrics: First Contentful Paint 0.8 s, Largest Contentful Paint 1.2 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.8 s.

![PageSpeed Insights desktop: 100 for Performance, Accessibility, Best Practices, and SEO. First Contentful Paint 0.2 s, Largest Contentful Paint 0.3 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.3 s.](/me/images/blog/google-insights-desktop.webp)

Desktop from the same session: First Contentful Paint 0.2 s, Largest Contentful Paint 0.3 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.3 s.

### Verification: reproduce the score locally-ish

PageSpeed Insights lab data comes from Lighthouse in a controlled environment; your laptop’s `npm run preview` will not match millisecond-for-millisecond. The useful checks are structural:

1. Run PSI on the exact production URL (include `/me/` base path).
2. Open the **Diagnostics** section and confirm no remaining “reduce unused CSS” from third-party font CSS—there should be none after self-hosting.
3. Confirm **Avoid large layout shifts** lists no offenders; if an image appears, add dimensions or reserve aspect-ratio in CSS.
4. Run twice if CDN cache just updated; GitHub Pages can serve stale assets for a minute after deploy.

Record the share link PSI generates (`pagespeed.web.dev/analysis/...`) so regressions are comparable week to week.

## Blog and contact needed smaller first-screen work

[Blog](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-blog/trqcxnp27d?form_factor=mobile) was 99 on mobile and 100 on desktop. Accessibility, Best Practices, and SEO were already 100. Mobile Speed Index was 3.6 s. First Contentful Paint 0.9 s, Largest Contentful Paint 1.4 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0.

On a phone the first screen was a wrapped pile of tag chips, then every post in the archive. The filter script restyled those chips on load even when the URL had no search. That stopped. The selected chip is `aria-current` in CSS, and the script leaves the HTML alone until there is a `q` or `tag` query. The chips sit on one scrolling row. Cards below the first couple use `content-visibility: auto` so the browser is not laying out the whole list before first paint.

**content-visibility: auto** tells the engine it may skip rendering work for off-screen subtrees until they approach the viewport. Pair it with **`contain-intrinsic-size`** (or reasonable min-heights on cards) so scroll height stays stable; otherwise you trade CLS for Speed Index wins.

[Contact](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-contact/i203w864xs?form_factor=mobile) was 100 for Performance, Best Practices, and SEO, and 95 for Accessibility, on mobile and desktop. PSI's note: "Links rely on color to be distinguishable." LinkedIn and GitHub sit in a sentence of body copy, teal, with no underline. They were underlined.

Accessibility at 100 on contact after the underline fix is a reminder that Performance and Accessibility diverge: you can max both without a JavaScript budget if link affordances meet WCAG contrast *and* non-color cues.

### Worked path: blog list without filter flash

1. Open `/me/blog/` with JavaScript enabled and an empty query string.
2. View source (not inspect): chip markup should already reflect the default state—no second pass required for styling.
3. Append `?tag=web` and reload; the matching chip should show `aria-current="true"` without a visible “all chips default then one highlights” flash.
4. Throttle CPU 4× in DevTools, reload: Speed Index should not block on layout of dozens of cards below the fold if `content-visibility` is applied.

## The stack was already small; posts can still blow the budget

The rest of the score is the stack already chosen. Pages compile to static HTML on GitHub Pages. Most pages only run the theme toggle, which reads `localStorage`, falls back to `prefers-color-scheme`, and flips a `dark` class. The blog list has a small filter script as well. No analytics. No CMS JavaScript. No contact-form backend. If the inline boot script in the layout has already run, you shouldn't see a flash of the wrong theme.

That's the clone path too. Take this repo, keep the self-hosted fonts and the sized WebP screenshots, and the home starts from PSI 100 on mobile and desktop. Individual posts can still blow the budget with a 2 MB PNG in a note—the plumbing is what was worth writing down.

### Clone checklist before you declare victory

| Step | Pass criterion |
| ---- | -------------- |
| Astro `base` matches Pages path (`/me/` today) | Assets load without 404 in Network tab |
| Fonts self-hosted via Astro Fonts API | No `fonts.googleapis.com` on critical path |
| Hero and blog PNGs ≤1280 px wide, WebP where sensible | “Properly size images” clean on PSI |
| Every inline `<img>` has width + height | CLS 0 on home and representative posts |
| Blog filter avoids DOM rewrite on bare `/blog/` | No chip flash; Speed Index not dominated by list layout |
| Contact links underlined or otherwise non-color-only | Accessibility 100 on contact |

Ship, wait for Pages to settle, run PSI mobile and desktop on home, blog, and contact. File the analysis URLs in your deploy notes. When a post regresses the score, fix the asset in that post— the platform does not auto-shrink attachments.

## Sources

- [PageSpeed Insights](https://pagespeed.web.dev/): live home, [blog](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-blog/trqcxnp27d?form_factor=mobile), and [contact](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-contact/i203w864xs?form_factor=mobile)
- [Astro fonts](https://docs.astro.build/en/guides/fonts/): `fontProviders.google()`, `<Font>` preload
- Related: [Astro: the stack behind this site](/me/blog/the-stack-behind-this-site/)
