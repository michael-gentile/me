---
title: "100 on mobile and desktop"
date: 2026-08-20
tags:
  - astro
  - github-pages
  - performance
summary: I ran PageSpeed Insights on the live home. Mobile was 89, desktop 99. Here are the two things that brought the scores to 100.
---

I ran [PageSpeed Insights](https://pagespeed.web.dev/) on [michael-gentile.github.io/me](https://michael-gentile.github.io/me/) after the site went live. Mobile came back 89. Desktop came back 99. it's definitely a good score for a small static site, especially on desktop. But It's also not 100.

The report pointed at two things sitting on the critical path: a Google Fonts stylesheet, and PNG screenshots that were wider than the column. I changed those and ran it again.

## Self-hosted fonts

Newsreader and Source Sans 3 used to arrive from fonts.googleapis.com. That's a second origin, CSS, then woff2, before the titles look like titles. PSI called it out on mobile.

The site now uses Astro's Fonts API. `fontProviders.google()` still *downloads* those families at build. What the visitor gets is woff2 files from this origin, with `<Font>` in `BaseLayout.astro` preloading the latin normal cuts. `global.css` maps `--font-sans` and `--font-serif` to those variables. There is no Google Fonts stylesheet at runtime.

Weights I actually ship: Newsreader 500 and 700, Source Sans 3 400 and 600, plus italic 400. That's enough for titles, body, and emphasis. I didn't pull the whole family.

## WebP screenshots with a size

The stack post screenshots started as PNGs that were wider than the column. The browser downloaded the extra pixels, then the layout jumped when the image arrived because the markup had no width or height.

I resized them to 1280 px wide, encoded WebP, and put `width` and `height` on the `<img>` tags, plus `decoding="async"` and `fetchpriority` or `loading="lazy"`. The markdown posts that show a screenshot use that HTML so the dimensions survive the build.

These PSI captures were 1712 px PNGs. Same treatment: 1280 px WebP, about 34 KB each instead of ~250 KB.

## The second run

Both viewports came back 100 for Performance, Accessibility, Best Practices, and SEO. CLS on both runs was 0.

![PageSpeed Insights mobile: 100 for Performance, Accessibility, Best Practices, and SEO. First Contentful Paint 0.8 s, Largest Contentful Paint 1.2 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.8 s.](/me/images/blog/google-insights-mobile.webp)

Mobile lab metrics: First Contentful Paint 0.8 s, Largest Contentful Paint 1.2 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.8 s.

![PageSpeed Insights desktop: 100 for Performance, Accessibility, Best Practices, and SEO. First Contentful Paint 0.2 s, Largest Contentful Paint 0.3 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.3 s.](/me/images/blog/google-insights-desktop.webp)

Desktop from the same session: First Contentful Paint 0.2 s, Largest Contentful Paint 0.3 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, Speed Index 0.3 s.

## Blog and contact

[Blog](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-blog/trqcxnp27d?form_factor=mobile) was 99 on mobile and 100 on desktop. Accessibility, Best Practices, and SEO were already 100. Mobile Speed Index was 3.6 s. First Contentful Paint 0.9 s, Largest Contentful Paint 1.4 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0.

On a phone the first screen was a wrapped pile of tag chips, then every post in the archive. The filter script restyled those chips on load even when the URL had no search. I stopped that. The selected chip is `aria-current` in CSS, and the script leaves the HTML alone until there is a `q` or `tag` query. The chips sit on one scrolling row. Cards below the first couple use `content-visibility: auto` so the browser is not laying out the whole list before first paint.

[Contact](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-contact/i203w864xs?form_factor=mobile) was 100 for Performance, Best Practices, and SEO, and 95 for Accessibility, on mobile and desktop. PSI's note: "Links rely on color to be distinguishable." LinkedIn and GitHub sit in a sentence of body copy, teal, with no underline. I underlined them.

## What was already small

The rest of the score is the stack I already wanted. Pages compile to static HTML on GitHub Pages. Most pages only run the theme toggle, which reads `localStorage`, falls back to `prefers-color-scheme`, and flips a `dark` class. The blog list has a small filter script as well. No analytics. No CMS JavaScript. No contact-form backend. If the inline boot script in the layout has already run, you shouldn't see a flash of the wrong theme.

That's the clone path too. If you take this repo, keep the self-hosted fonts and the sized WebP screenshots, you're starting from a home that PSI scored 100 on mobile and 100 on desktop. Your posts can still blow the budget if you drop a 2 MB PNG in a note. The plumbing is the part that was worth writing down.

## Sources

- [PageSpeed Insights](https://pagespeed.web.dev/): live home, [blog](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-blog/trqcxnp27d?form_factor=mobile), and [contact](https://pagespeed.web.dev/analysis/https-michael-gentile-github-io-me-contact/i203w864xs?form_factor=mobile)
- [Astro fonts](https://docs.astro.build/en/guides/fonts/): `fontProviders.google()`, `<Font>` preload
- [The stack behind this site](/me/blog/the-stack-behind-this-site/)

