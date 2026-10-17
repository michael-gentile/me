---
title: "Agentic finance: allowances, not unbounded wallets"
date: 2026-10-15
tags:
  - finance
  - ai
summary: "Muse, Grok Bot, and OpenAI Dots are giving agents money-shaped tools: scoped cards, delegated payment tokens, and account context. Everyday spend is gated. Major decisions are still mostly draft-and-approve."
---

Agents that can browse and call tools eventually need a way to pay. The failure mode is the same one I keep writing about for [`send_email`](/me/blog/the-model-does-not-get-send-email/): put the real credential in the model’s reach and hope a prompt holds. What is shipping is closer to an allowance. Cap the merchant, the amount, the lifetime. Make a human (or a review agent outside the chat model) say yes. Then let the agent finish the checkout.

I already wrote about [Muse’s per-user VM](/me/blog/muse-and-the-personal-agent/) and the [stablecoin / X Money / Cloudflare wallet rails](/me/blog/stablecoins-treasuries-wallets/). This note is about the money path: how Muse, Grok Bot, and OpenAI’s Dots attach spend and financial sight to always-on agents.

## Scoped spend vs open wallet

Everyday agent commerce is arriving as delegated, scoped spend. Major financial decisions are arriving first as agents that can *see* your money and draft a plan, not as unsupervised fund managers.

## Muse: single-use card, every purchase asks

Meta’s Muse shops through Stripe Link. On Link merchants it can check out with a saved method. Elsewhere Link issues a **single-use virtual card** scoped to that merchant, that dollar amount, and a short validity window. Muse does not get your real card number. Meta’s [safety write-up](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) is blunt: every purchase stops for human approval with the exact details, and those checks live outside the model (Sentinel / host services). [Stripe’s note](https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link) and Meta’s [payments help](https://www.meta.com/help/artificial-intelligence/1436362127544482/) match that story. You remain responsible for what you approve.

Even if prompt injection steals the one-time number, the blast radius is that checkout.

## Grok Bot: X Money or Link, hand the payment UI to you

Grok Bot’s changelog and docs describe Bots that can pay with **X Money** or **Stripe Link**. Login, 2FA, and payment steps are handed to the member rather than typed by the model into chat. When a purchase is proposed, you Allow or Deny; team admins can mark payments as “Ask first” under Auto-review. There is still no separate Grok Bot spend-cap product today; account on-demand limits apply.

## Dots: always-on computer, financial sight, delegated pay

OpenAI’s [Dots](https://openai.com/index/introducing-dots/) (Sep 29, 2026) are always-on agents with their own cloud computer and browser, reachable from ChatGPT, Slack, and Teams. Background “proactive research” is restricted to read-only tools on connected apps. Custom Rules and auto-review decide what proceeds, what needs you, and what stays human-only (password changes, and so on).

Money shows up in two layers.

**Sight.** [OnePay](https://www.onepay.com/newsroom/onepay-chatgptanddots) shipped an official plugin for ChatGPT and Dots (Oct 12, 2026), building on their earlier MCP “OnePay for Agents.” With consent you can revoke, the agent can pull balances, transactions, credit, investments, loans, rewards, and related context into planning. An always-on agent can budget a trip or talk through a house purchase with your numbers in the window. That is still context for a draft, not a trading desk.

**Spend.** OpenAI’s [Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment) sends a single-use, allowance-scoped credential to the merchant’s PSP (max amount, expiry, merchant, checkout session). OpenAI is not the merchant of record. Stripe’s Shared Payment Token is an early compatible path; [Visa](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-openai-partnership.html) is wiring tokenized credentials, agent identity, and spend limits into the same class of flow.

Specialist dots (in the enterprise preview) get their own identity and credentials for well-defined jobs like invoices or expense drafts; OpenAI is also working with Microsoft Agent 365 on governance. Policy and review still sit in front of money and commitments.

## Seeing money and spending it

Buying a cable, paying an API via something like [Cloudflare’s capped Virtual Wallets](/me/blog/stablecoins-treasuries-wallets/), or completing a Link checkout after you tap Approve is everyday agent finance. The product is the scope: dollar, merchant, and time caps; prefer single-use; the model never holds the PAN.

Rebalancing a portfolio, taking a loan, or wiring a down payment is a different job. What shipped first for that class is **read access + draft**: OnePay-style context inside an agent that already knows your calendar and inbox. Revoke and audit matter here the same way they matter for spend. The residual risk I care about is quiet promotion: the agent that planned the house purchase later gets a “just pay the deposit” tool with a higher ceiling and a tired human rubber-stamp.

Wire the gates before you raise the ceilings. For Muse-class shopping, Meta’s every-purchase bar is the conservative default I would keep until audit logs are boring.

## Sources

- [How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (Meta) · [How Muse works with payments](https://www.meta.com/help/artificial-intelligence/1436362127544482/) · [Stripe: Muse + Link](https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link)
- [Introducing dots](https://openai.com/index/introducing-dots/) (OpenAI) · [Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment) · [Visa and OpenAI](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-openai-partnership.html)
- [OnePay on ChatGPT and Dots](https://www.onepay.com/newsroom/onepay-chatgptanddots) · [OnePay for Agents](https://www.onepay.com/help-center/articles/connecting-onepay-to-ai-tools)
- Grok Bot: [changelog](https://x.ai/changelog/bot) · [teams and enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises) · [security](https://docs.x.ai/grok-bot/security)
- Earlier notes: [Muse and the personal agent](/me/blog/muse-and-the-personal-agent/), [Stablecoins, short Treasuries, and wallets](/me/blog/stablecoins-treasuries-wallets/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/)
