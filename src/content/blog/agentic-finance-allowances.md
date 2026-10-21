---
title: "Agentic finance: allowances, not unbounded wallets"
date: 2026-10-15
tags:
  - finance
  - ai
summary: "Muse, Grok Bot, and OpenAI Dots are giving agents money-shaped tools: scoped cards, delegated payment tokens, and account context. Everyday spend is gated. Major decisions are still mostly draft-and-approve."
---

Put a primary account number in the model’s context and a prompt becomes the only gate—a failure mode product teams are explicitly not shipping. What is arriving instead is **allowance-shaped** finance: cap the merchant, the amount, and the lifetime; keep humans (or review agents outside the chat model) on the path for commitment; let the agent finish checkout only after scope is fixed. Always-on agents from Muse, Grok Bot, and OpenAI’s Dots wire spend and read-only financial context into the loop with different rails, but the pattern repeats: delegated credentials, not an open wallet in the transcript.

Everyday agent commerce is scoped spend. Major financial decisions show up first as agents that can *see* money and draft a plan—not as unsupervised fund managers.

## Terms

**PAN (primary account number)** is the reusable card number most people mean when they say “credit card.” If it lives in chat context or a long-lived tool secret, one successful exfiltration is game over.

**Allowance** here is a credential bound by **amount**, **merchant** (or MCC), and **time**—often single-use. The agent may complete checkout inside that box; it cannot rewrite the box without another human or policy step.

**PSP (payment service provider)** is the merchant’s processor (Stripe, Adyen, etc.). **Delegated payment** specs push a scoped token to the PSP so OpenAI or Meta is not the merchant of record.

**Blast radius** is what an attacker gets if prompt injection wins tonight: one checkout versus recurring charges versus portfolio trades.

## Scoped spend vs open wallet

The comparison axis is not “agent pays” versus “agent does not pay.” It is whether the payment instrument is single-use, merchant-bound, and time-boxed versus a reusable secret the model could exfiltrate in one tool call.

| Model | Instrument | Human gate | Typical blast radius |
| ----- | ---------- | ---------- | -------------------- |
| Open wallet in context | PAN or bank login | Prompt only | Unbounded |
| Muse + Link | Single-use virtual card | Every purchase approval | One merchant, one amount, short window |
| Grok Bot | X Money / Link | Allow / Deny; team “Ask first” | Account limits; no separate cap SKU yet |
| Dots delegated pay | Allowance token to PSP | Custom Rules / auto-review | Session-scoped checkout |
| OnePay read plugin | OAuth read context | Revoke consent | Data exposure, not spend |

## Muse: single-use card, every purchase asks

Meta’s Muse shops through Stripe Link. On Link merchants it can check out with a saved method. Elsewhere Link issues a **single-use virtual card** scoped to that merchant, that dollar amount, and a short validity window. Muse does not get your real card number. Meta’s [safety write-up](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) is blunt: every purchase stops for human approval with the exact details, and those checks live outside the model (Sentinel / host services). [Stripe’s note](https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link) and Meta’s [payments help](https://www.meta.com/help/artificial-intelligence/1436362127544482/) match that story. You remain responsible for what you approve.

Even if prompt injection steals the one-time number, the blast radius is that checkout.

### Worked path: Muse-class purchase

1. User asks Muse to buy a specific SKU from a named merchant.
2. Muse assembles cart context; **Sentinel** (non-model services) validates policy.
3. User sees exact merchant, line items, total, and validity window—not a vague “approve shopping.”
4. On approve, Link mints scoped instrument; Muse completes checkout on supported rails.
5. Audit log records approval actor, amount, merchant, time.

**Verification:** After a test purchase, confirm the virtual card declines on a different merchant and after expiry. Confirm chat export does not contain your real PAN—only references to Link.

## Grok Bot: X Money or Link, payment UI stays with the member

Grok Bot’s changelog and docs describe Bots that can pay with **X Money** or **Stripe Link**. Login, 2FA, and payment steps are handed to the member rather than typed by the model into chat. When a purchase is proposed, you Allow or Deny; team admins can mark payments as “Ask first” under Auto-review. There is still no separate Grok Bot spend-cap product today; account on-demand limits apply.

### Worked path: team bot with “Ask first”

1. Admin enables payment capability and sets Auto-review to **Ask first** for payments.
2. Bot proposes a charge; member gets native payment UI—not credentials in the thread.
3. Deny path: no token minted; bot receives failure state, not a retry loop with secrets.
4. Allow path: same scoped rails as consumer Link where applicable.

**Verification:** Attempt a payment above account on-demand limits; expect hard stop. Review team audit for who approved, not just that the bot asked.

## Dots: always-on computer, financial sight, delegated pay

OpenAI’s [Dots](https://openai.com/index/introducing-dots/) (Sep 29, 2026) are always-on agents with their own cloud computer and browser, reachable from ChatGPT, Slack, and Teams. Background “proactive research” is restricted to read-only tools on connected apps. Custom Rules and auto-review decide what proceeds, what needs you, and what stays human-only (password changes, and so on).

Money shows up in two layers.

**Sight.** [OnePay](https://www.onepay.com/newsroom/onepay-chatgptanddots) shipped an official plugin for ChatGPT and Dots (Oct 12, 2026), building on their earlier MCP “OnePay for Agents.” With consent you can revoke, the agent can pull balances, transactions, credit, investments, loans, rewards, and related context into planning. An always-on agent can budget a trip or talk through a house purchase with your numbers in the window. That is still context for a draft, not a trading desk.

**Spend.** OpenAI’s [Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment) sends a single-use, allowance-scoped credential to the merchant’s PSP (max amount, expiry, merchant, checkout session). OpenAI is not the merchant of record. Stripe’s Shared Payment Token is an early compatible path; [Visa](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-openai-partnership.html) is wiring tokenized credentials, agent identity, and spend limits into the same class of flow.

Specialist dots (in the enterprise preview) get their own identity and credentials for well-defined jobs like invoices or expense drafts; OpenAI is also working with Microsoft Agent 365 on governance. Policy and review still sit in front of money and commitments.

### Worked path: plan with sight, spend separately

1. User connects OnePay with scoped read consent; stores revocation in account settings.
2. Dot drafts trip budget using balances and recent spend categories—output is markdown or chat, not a wire.
3. User asks to buy flights; delegated payment token is minted for **that checkout session** with max amount and merchant binding.
4. Custom Rules block password changes and high-risk commits without human step.

**Verification:** Revoke OnePay; confirm dot loses financial context on next turn. Attempt to reuse a delegated token on another merchant; expect decline. Read Custom Rules audit for spend vs read events.

## Seeing money is not spending it

Buying a cable, paying an API via something like [Cloudflare’s capped Virtual Wallets](/me/blog/stablecoins-treasuries-wallets/), or completing a Link checkout after you tap Approve is everyday agent finance. The product is the scope: dollar, merchant, and time caps; prefer single-use; the model never holds the PAN.

Rebalancing a portfolio, taking a loan, or wiring a down payment is a different job. What shipped first for that class is **read access + draft**: OnePay-style context inside an agent that already knows your calendar and inbox. Revoke and audit matter here the same way they matter for spend. The residual risk to design for is quiet promotion: the agent that planned the house purchase later gets a “just pay the deposit” tool with a higher ceiling and a tired human rubber-stamp.

### Quiet promotion: what to test

| Scenario | Risk | Mitigation |
| -------- | ---- | ---------- |
| Morning draft mentions “$50k deposit Friday” | Evening “pay deposit” with pre-filled amount | Separate approval copy; show bank destination |
| Read plugin exposes full transaction history | Model quotes sensitive memo in shared channel | Channel rules; redact in tool layer |
| Auto-review fatigue | User taps Approve twice daily | Rate limits; cumulative daily cap |

Run tabletop exercises: prompt injection in email asking the dot to “approve the attached invoice.” Spend tools should not arm from email body alone without quarantine (see prompt-injection patterns in sibling notes).

## Limits and what’s next

Wire the gates before raising the ceilings. For Muse-class shopping, Meta’s every-purchase bar is the conservative default worth keeping until audit logs are boring. Map one workflow—small purchase, API spend, financial planning draft—against which rail (Link, X Money, Delegated Payment Spec, read-only OnePay) applies, and document where human approval sits relative to Sentinel, auto-review, or Custom Rules.

### Integration checklist (for your own agent product)

1. **Inventory rails:** Which flows are read-only OAuth vs delegated pay vs virtual card?
2. **Draw trust boundaries:** Model never stores PAN; tokens minted in host service after policy engine.
3. **Define allowances:** Max amount, merchant allowlist, TTL, single-use default on.
4. **Log for audit:** Actor, scope, outcome, correlation id—not chat text alone.
5. **Test injection:** Malicious merchant page + malicious receipt email; expect deny or scoped fail.
6. **Revoke path:** One click removes sight and invalidates pending tokens.

Major financial moves stay **draft → human commit → maybe execute** until regulators and insurers expect otherwise. Agentic finance in 2026 is allowances and visibility with gates—not autonomous fund management.

## Sources

- [How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (Meta) · [How Muse works with payments](https://www.meta.com/help/artificial-intelligence/1436362127544482/) · [Stripe: Muse + Link](https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link)
- [Introducing dots](https://openai.com/index/introducing-dots/) (OpenAI) · [Delegated Payment Spec](https://developers.openai.com/commerce/specs/payment) · [Visa and OpenAI](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-openai-partnership.html)
- [OnePay on ChatGPT and Dots](https://www.onepay.com/newsroom/onepay-chatgptanddots) · [OnePay for Agents](https://www.onepay.com/help-center/articles/connecting-onepay-to-ai-tools)
- Grok Bot: [changelog](https://x.ai/changelog/bot) · [teams and enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises) · [security](https://docs.x.ai/grok-bot/security)
- Related: [Muse: a personal agent with its own computer](/me/blog/muse-and-the-personal-agent/), [Stablecoins: short Treasuries and the wallets on top](/me/blog/stablecoins-treasuries-wallets/)
