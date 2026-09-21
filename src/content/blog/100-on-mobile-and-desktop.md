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

## What was already small

The rest of the score is the stack I already wanted. Pages compile to static HTML on GitHub Pages. The only client script is the theme toggle, which reads `localStorage`, falls back to `prefers-color-scheme`, and flips a `dark` class. No analytics. No CMS JavaScript. No contact-form backend. If the inline boot script in the layout has already run, you shouldn't see a flash of the wrong theme.

That's the clone path too. If you take this repo, keep the self-hosted fonts and the sized WebP screenshots, you're starting from a home that PSI scored 100 on mobile and 100 on desktop. Your posts can still blow the budget if you drop a 2 MB PNG in a note. The plumbing is the part that was worth writing down.

## Sources

- [PageSpeed Insights](https://pagespeed.web.dev/): live home, mobile and desktop
- [Astro fonts](https://docs.astro.build/en/guides/fonts/): `fontProviders.google()`, `<Font>` preload
- [The stack behind this site](/me/blog/the-stack-behind-this-site/)

