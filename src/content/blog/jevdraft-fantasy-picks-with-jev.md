---
title: "JevDraft: typed picks for a fantasy NHL draft"
date: 2026-09-22
tags:
  - llm
  - architecture
summary: "A local CLI that rescores a public hockey board to my ESPN league, then asks Jev for pick-time choices with confidence gates. Just for fun."
---

I already wrote about [Jev](/me/blog/a-typed-decision-instead-of-a-paragraph/): state in, typed answers out, confidence you can threshold. Fantasy hockey draft night is a pile of those decisions. Who among the five still on the board? Is this a reach vs ADP? Should I take a goalie *now*? The math can rank players. The situational call is what I wanted to try on Jev.

So I built **JevDraft**, a small Node CLI I run locally. It pulls the free [Hockey Insights](https://hockeyinsights.ca/opendata/) 2026–27 board, rescores every skater and goalie with *my* ESPN weights, and optionally calls Jev's `/v1/decide` when it's my pick. This is just for fun. It will not win you a league by itself, and a wrong pick with a pretty confidence number is still a wrong pick.

## Split of labor

Hockey Insights publishes JSON at a stable URL (credit [hockeyinsights.ca](https://hockeyinsights.ca/opendata/)): blended per-game rates, an 84-game projection line, and consensus ranks from ESPN / NHL / Daily Faceoff / CBS. That file is the pool. My code owns expected fantasy points and who's still available.

Jev never sees the full 400-player dump. At `advise` time it gets a short `state`: league settings, pick number, my roster, remaining needs, and the top handful of available players with rank, ADP, and expected points. Then four typed questions in one round trip:

| Question | Type | Job |
| -------- | ---- | --- |
| `pick` | choice | Who among this shortlist fits *now* |
| `reach` | score | clear value → steep reach vs ADP |
| `take_goalie_now` | noul | Gate an early or unnecessary G |
| `fill_d_now` | noul | Prefer D over another F? |

The CLI applies gates from config. If `pick` confidence is below the threshold, expected points win. If Jev wants a goalie and `take_goalie_now` is too low, it skips G. Schema-safe still isn't correct. Calibration is why I bother with a number at all.

## Rules that change

ESPN leagues are not fixed. Ours might be 8 teams one year and 10 the next. Assists might be worth 1 or 1.5. Bench spots move. Hat tricks might pay or sit at zero.

All of that lives in `league.config.json`. Team count, starter slots (F / D / G), bench, IR, every skater and goalie scoring weight, shortlist size, and confidence thresholds. Change the file, re-run `rank`. Strategy hints and the draft loop both read it. No code edit for a typical ESPN tweak.

Provisional defaults I started from (confirm on the live settings page before you trust them):

- teams, snake, H2H points
- starters like 9 F / 4 D / 1 G, plus bench and IR
- skaters: goals heavy, assists, PIM/HIT peripherals
- goalies: wins and shutouts (no saves in that config)

`npm run strategy` prints hints from whatever is in the file right now: finishers vs playmakers, whether peripherals matter, whether early goalies are a trap for your team count and G starters.

## Commands

```sh
npm run fetch              # cache fantasy_2027.json
npm run fetch -- --force   # refresh
npm run rank               # overall board by your expected points
npm run rank -- D          # defensemen only (also F, G)
npm run strategy           # hints from current league.config.json
npm run draft              # interactive loop
npm run draft -- --offline # math only, even if a Jev key is set
```

Draft loop commands: `take <name>`, `mine <name>`, `advise`, `board [F|D|G]`, `roster`, `undo`, `quit`. Put `JEV_API_KEY` in `.env` for live advise. Without it, draft stays on the sorted board.

## What comes back

`fetch` reports the cache path and pool size (hundreds of skaters, dozens of goalies, a generated date from Hockey Insights).

`rank` prints a table rescored to your weights. Columns are your rank, expected points, ADP gap (your rank minus consensus average), position, name, and ADP. A negative gap means the public boards have them later than your formula does. Under a goal-heavy, hit/PIM config, some physical scorers climb the sheet in a way ESPN's default board might not. That's the point of rescoring.

`advise` first prints the math shortlist (same columns, top of what's left). Offline, it stops at the top expected-points name. With a key, you also get Jev's answers as JSON (`pick` choice + probabilities, `reach` score, the two noul gates), usage, then a gated recommendation:

```text
Recommend (use_jev): <player> (<pos>, <pts> pts)
reasons: pick confidence 0.72 ≥ 0.6
math fallback: <player> | fill_d_now=0.41 | reach≈1.2
```

`action` is `use_jev`, `use_math`, or `gated` when a noul rule overrode the choice. I still click the name in ESPN myself.

## What I would not do with this

I would not ask Jev who wins the Art Ross with an empty state. I would not paste the whole JSON board into every call. I would not treat a steep-reach score as a dare. The playbook in the repo is the dry-run checklist: update config from live ESPN, fetch the week of the draft, mock a few snakes offline, then turn the key on.

JevDraft is tinkering with the same shape as the TypeSafe notes: code does the arithmetic and the board, Jev does the pick-time labels, I keep the click. For fun, on draft night, with the remote handy if the API hiccups.
