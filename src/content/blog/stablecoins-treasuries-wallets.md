---
title: "Stablecoins: short Treasuries and the wallets on top"
date: 2026-10-15
tags:
  - finance
  - ai
summary: "Payment stablecoins pull demand into short Treasuries; firms also put bill yield on-chain. X Money and Cloudflare Wallets are two places that stack might meet people and agents."
---

Dollar-pegged payment coins only stay credible if reserves sit in cash, repo, and especially short U.S. Treasury paper—and the apps and wallets on top are how that instrument meets creators, retail users, and agents trying to buy APIs without pasting a card every time. This post is a map of that stack: issuer demand for bills, tokenized funds that put bill-like yield on-chain, regulation on payment stablecoins, and two consumer surfaces—**X Money** on bank rails and **Cloudflare Wallets** aimed at agentic commerce.

USDC and Tether dominate market cap. Ripple USD (RLUSD) is another regulated payment coin, issued under an NYDFS trust charter since late 2024. Below: what issuers buy, how BUIDL and VBILL differ from reserve books, rules of the road, where X Money ships today versus stablecoin rumors, and why Virtual Wallets look like spend caps for bots.

## Payment stablecoins pull issuers into short Treasuries

A payment stablecoin promises one-to-one convertibility into dollars (or another unit of account). To make that promise credible, the issuer parks reserves in cash, bank deposits, repo, and especially short-term Treasury securities. The [San Francisco Fed](https://www.frbsf.org/research-and-insights/publications/economic-letter/2026/09/stablecoin-issuers-growing-appetite-for-treasury-securities/) (Sep 2026) documents how large that appetite has become: Tether and USD Coin make up more than 80% of stablecoin market capitalization as of mid-August 2026; their combined Treasury holdings (including repo in the Fed’s series) rose by about $200 billion over five years; if recent growth continues, short-Treasury demand from issuers could approach roughly $400 billion by end-2030. That is noteworthy for the bill market. It is still small next to total U.S. financing needs.

The same letter notes a maturity mismatch: China’s reduced holdings have been concentrated in longer debt, while stablecoin demand is short-dated. [Kansas City Fed](https://www.kansascityfed.org/research/economic-bulletin/stablecoins-could-increase-treasury-demand-but-only-by-reducing-demand-for-other-assets/) work adds the flow-of-funds caveat: money that moves from bank deposits into stablecoins can raise Treasury demand while shrinking bank lending.

U.S. Treasury’s TBAC materials treat stablecoins as an emerging demand source for T-bills and Treasury repo, especially under reserve rules that push issuers into high-quality liquid assets.

## Tokenized funds put the same short end on-chain for institutions

Issuer reserves are one channel into short Treasuries. Tokenized funds are another. BlackRock’s BUIDL (USD Institutional Digital Liquidity Fund) and VanEck’s VBILL hold short-term government paper as fund shares on public chains, so institutions get bill-like yield with on-chain settlement. In September 2025, [Ripple and Securitize](https://ripple.com/ripple-press/ripple-and-securitize-enable-rlusd-smart-sontract-functionality-for-blackrock-buidl-and-vaneck-vbill-tokenized-funds/) added a path for those shares to redeem into RLUSD around the clock. That shows large managers treating short-duration dollar liquidity as something that can move on the same rails as payment coins. You can skip this paragraph and still follow USDC’s T-bill book or X Money’s bank balances.

## GENIUS and MiCA set the license path large firms watch

The U.S. GENIUS Act (July 2025) sets a federal frame for *payment* stablecoins: who may issue, one-to-one high-quality reserves, licensing. Treasury and the OCC have been running 2026 notices of proposed rulemaking toward effective dates in 2027–2028 for offer and sale limits. Europe’s MiCA path for e-money and asset-referenced tokens is the parallel conversation. Large firms test when the license path is visible.

## X Money ships on bank rails; stablecoins are still exploratory

X Money is the invite-only U.S. payments product on X: deposit-like balances at Cross River Bank, Visa debit, promotional yields for Premium users, instant peer transfers. [AP coverage](https://apnews.com/article/elon-musk-x-money-cross-river-payments-0bb86f98e0747757992bc8f435f7014e) and [TechCrunch](https://techcrunch.com/2026/09/02/x-shifts-us-creator-payouts-from-stripe-to-x-money/) describe the live shape. In September 2026, U.S. creator payouts moved from Stripe onto X Money for instant settlement. Those payouts still move on bank rails.

Stablecoins are not the default path yet. [CoinDesk reported](https://www.coindesk.com/business/2026/08/20/elon-musk-s-x-is-exploring-stablecoins-to-pay-influencers-and-content-providers) (Aug 2026) that X has been exploring USDC and similar coins for creator royalties, with no network or launch date confirmed. SpaceX’s Starlink already collects some cross-border customer payments in stablecoins, which is the closest precedent in the same corporate orbit. A Senate banking letter also asked whether X might eventually *issue* a GENIUS-eligible coin. That is a live policy question, not a shipping date.

## Cloudflare Wallets treat agent spend like policy, not prose

[Cloudflare’s announcement](https://blog.cloudflare.com/wallets/) and [docs](https://developers.cloudflare.com/wallets/) describe programmable wallets aimed at agentic commerce. Account Wallets are for humans on a Cloudflare account: fund, withdraw, set policy. Virtual Wallets are for agents under API keys, with allowances, allow lists, and max transaction sizes so an agent can buy APIs, MCP tools, and content without an unbounded burn rate. Handles reserve at [cloudflare.pay](https://cloudflare.pay/); as of late 2026 that reservation is what is live. Sending, receiving, and holding funds are still “soon.”

The payment glue is x402 (HTTP 402 Payment Required), with Coinbase and Cloudflare among the foundation players: stablecoin micropayments (often USDC on Base, Ethereum, Solana, and other networks) attached to HTTP requests. X Money is social and retail banking UX. Cloudflare’s bet is spend caps for agents that need to try ten APIs without a human pasting a card each time. If stablecoin funding turns on, both surfaces sit downstream of the same Treasury-backed dollar instruments.

The Virtual Wallet design matters for the same reason least-privilege tool gates do in agent harnesses: the control is a dollar limit and an allow list in *your* policy. A stern system prompt is not the control.

## Before you trust a balance, read the claim and the license

Attestations and clear redemption for any coin an app puts in front of a creator or an agent. Know who holds the T-bills and under what license.

Honest deposit-insurance language. X Money balances live at an FDIC-insured bank partner; the app is not the bank. Stablecoin balances are a different claim entirely.

Agent spend caps as a product control when the buyer is a bot: allowance, allow list, max size, human override.

Watch bank-deposit displacement if stablecoin growth is large: more bills, fewer loans in the simple KC Fed arithmetic.

A CBDC is still a different claim from a privately issued payment stablecoin. Keep the words separate in a design review.

Short Treasuries are becoming backstop inventory for dollar-pegged coins. Separately, funds like BUIDL put that same short end on-chain for institutions. X Money is the retail bank-rail surface so far; Cloudflare Wallets are the agent surface with explicit spend limits once funding ships. Follow the plumbing and the licenses. “Digital currency takes over the world economy” is the wrong summary of what is actually shipping.

## Sources

- [Stablecoin Issuers’ Growing Appetite for Treasury Securities](https://www.frbsf.org/research-and-insights/publications/economic-letter/2026/09/stablecoin-issuers-growing-appetite-for-treasury-securities/) (FRBSF Economic Letter, Sep 2026)
- [Stablecoins Could Increase Treasury Demand…](https://www.kansascityfed.org/research/economic-bulletin/stablecoins-could-increase-treasury-demand-but-only-by-reducing-demand-for-other-assets/) (Kansas City Fed)
- [Ripple and Securitize: RLUSD for BUIDL and VBILL](https://ripple.com/ripple-press/ripple-and-securitize-enable-rlusd-smart-sontract-functionality-for-blackrock-buidl-and-vaneck-vbill-tokenized-funds/) (Sep 23, 2025)
- [GENIUS Act NPRM overview](https://home.treasury.gov/news/press-releases/sb0605) (U.S. Treasury)
- [Announcing Cloudflare Wallets](https://blog.cloudflare.com/wallets/) · [Cloudflare Wallets docs](https://developers.cloudflare.com/wallets/)
- [X Money / Cross River (AP)](https://apnews.com/article/elon-musk-x-money-cross-river-payments-0bb86f98e0747757992bc8f435f7014e) · [Creator payouts to X Money (TechCrunch)](https://techcrunch.com/2026/09/02/x-shifts-us-creator-payouts-from-stripe-to-x-money/) · [USDC talks for creators (CoinDesk)](https://www.coindesk.com/business/2026/08/20/elon-musk-s-x-is-exploring-stablecoins-to-pay-influencers-and-content-providers)
- Related: [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/)
