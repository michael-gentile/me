---
title: "Muse: a personal agent with its own computer"
date: 2026-09-24
tags:
  - ai
summary: "Meta shipped a personal agent with a per-user VM and a pocket Charm. The interesting part isn’t the demo—it’s how that shape compares to OpenClaw and the DIY personal-agent stack, rolled out for people who won’t self-host."
---

Personal agents that hold mail credentials, browse the open web, and check out with real money eventually need more than a chat thread—they need a computer, a trust boundary, and a channel people already open. Muse is Meta’s answer: a personal AI agent as a chat contact in the Muse app, on the web, or in WhatsApp, that browses, connects to Gmail and calendars, shops with approvals, and plans trips on behalf of the user. Meta launched it in the US in early September 2026. The product bet is packaging: OAuth connectors, a VM the user does not provision, WhatsApp as the front door, for someone who will never read a systemd unit.

Picture a household that wants “text my agent to reorder filters” without running a gateway on a Mac mini. Muse ships the loop; OpenClaw expects you to bring the machine, the model, and the uptime.

## What shipped in September 2026

Muse went live in the US on September 8, 2026 (iOS, Android, muse.ai), with Canada shortly after. Meta’s in-house model for it is Muse Spark. Most use is free; paid tiers buy a larger weekly allowance. Meta apps (Facebook, Instagram, Threads) can attach through Accounts Center. Third parties plug in as Connectors: Gmail and Google Calendar at launch, Spotify for playback and playlists, Stripe Link for checkout, then Shop Pay and PayPal as more commerce rails, travel inventory through partners like Duffel, Expedia announced as coming.

Amazon is the counter-example. They blocked Muse from shopping on Amazon, arguing agentic checkout needs the merchant’s agreement. Commerce here is a negotiated surface, not “the open web.”

## Why each user gets a Secure VM

Personal agents that hold credentials and run tools need somewhere to live. Meta’s answer is a dedicated cloud computer per person: Muse Secure VM. Clients talk to *your* VM. Inside it, Meta’s safety post describes two security domains on one box.

```text
  Muse app / WhatsApp / web
            |
            v
     your Muse Secure VM
            |
   +--------+--------+
   |                  |
   v                  v
 runtime cell      host services
 (Hatch harness,   (Sentinel, authd,
  browser, tools)   connector workers)
```

The agent (internally “Hatch”) runs in a `systemd-nspawn` cell with a browser and a workspace. Credentials sit outside that cell. The agent sees surrogate tokens; real secrets are inserted at the network boundary after authorization. Sentinel is a separate host-side agent that owns connector actions and egress. Sensitive steps (send mail, buy something) stop for a human approval in the client UI. That answer goes to Sentinel, not back through a chat turn with the model.

That is “the model proposes, the process disposes,” productized. Meta also says a Confidential VM is coming later in 2026: encryption with a key only the user holds, so Meta cannot read the box. That is the next trust claim. It is not what shipped on day one.

Meta’s own wording for capacity is vague: enough CPU, memory, and storage “to do real work.” Community measurements of free-tier VMs (people asking Muse what it runs on) show something like **2** vCPUs, about **8 GB** RAM, a **100 GB** home volume, no GPU. Treat that as community measurement, not a Meta datasheet. From an IT seat, the architecture still reads clearly. Per-user isolation is a privacy story, and it is also a linear capacity problem if the agent stays warm in the background.

## Charm: same agent, another surface

At Meta Connect a few weeks later, Zuckerberg showed Muse Charm: a keychain-sized handheld with a screen, fingerprint wake, camera, mics, and cellular, so you can talk to Muse without unlocking a phone. Target talk is holidays in December; Meta said only a few units exist so far, and price isn’t public. Same agent, another channel. Hardware doesn’t change the VM or the connector politics.

## Muse vs OpenClaw: who holds the computer?

OpenClaw is the clean comparison. It is an open-source, self-hosted personal assistant: a Gateway on your machine (or a VPS) that meets you in WhatsApp, Telegram, Discord, Slack, Signal, iMessage, and more. You bring the model. State and skills live where you put them. No hosted product tier; you own the ops.

Both products share a loop shape:

```text
  chat surface → agent loop → tools / browser → memory → approvals
```

They disagree on custody.

| | Muse | OpenClaw |
| --- | --- | --- |
| Computer | Meta Secure VM | Your machine or VPS |
| Model | Muse Spark | Bring your own |
| Channels | Muse app, WhatsApp, web; glasses coming | Many self-hosted messaging plugins |
| Trust boundary | Sentinel + Meta policy + connectors | Your allowlists, workspace rules, sandbox choices |
| Getting started | Install an app | `openclaw onboard` and keep a gateway alive |

Operator-style computer-use products and Claude’s computer use sit in the same neighborhood: an agent that clicks and types. Hosted or local, email and web pages become untrusted input once the agent can act. Custody of the box is what changes.

### Is Muse OpenClaw under the hood?

After launch, X filled up with a stronger claim: Muse isn’t merely similar to OpenClaw, it *is* OpenClaw under the hood, wrapped for consumers. People pointed at the workspace layout inside the VM (`SOUL.md`, `AGENTS.md`, `MEMORY.md`, `TOOLS.md`, and the rest) and at lines in Muse’s personality files that match OpenClaw’s almost word for word. Some poked the agent itself and got it to call the overlap a “match.”

That “literally OpenClaw” version stays unconfirmed gossip until someone publishes a serious dependency or binary analysis on a live Muse box. The file conventions are exactly where a DIY personal agent stores its self-model, and they are hard to unsee once OpenClaw has been run locally.

What Meta has said publicly is softer. Nat Friedman (product head at Meta Superintelligence Labs) wrote on X that Muse was built from scratch and “definitely heavily inspired as a product by OpenClaw,” that the MSL team ran OpenClaw hard after he bought a pile of Mac minis, and that they kept the workspace names and near-identical `SOUL.md` content because they thought Peter Steinberger “got those things exactly right.” Inspired product and shared conventions are compatible with a rewrite. A silent fork of the OpenClaw runtime would be a different story—no public evidence for the latter yet.

Either way, the packaging bet still holds: consumer productization of the personal-agent pattern, with enterprise SSO and managed connectors waiting on the approval story becoming dull enough for architecture diagrams.

## Limits worth watching

Approval fatigue. If every purchase and every outbound mail needs a tap, people start rubber-stamping. If Meta auto-allows too much, Sentinel becomes theater.

Connector politics. Amazon’s block is a preview. Agents that shop and book need merchant consent; the open web is not a free tool surface.

Confidential VM timing versus marketing. “Even Meta can’t read it” only counts when it ships and auditors can check it.

Charm as a listening surface. Pocket hardware with mics and always-available wake is a different privacy conversation than an app you open on purpose.

Quotas versus real agent work. Background sub-agents and long browser jobs burn allowance. Free tiers teach habits; paid tiers teach whether the economics work.

Prompt injection through Gmail and the web. Sentinel and credential surrogation are the right kind of design; whether they hold when the agent reads hostile mail is empirical—not something marketing resolves.

## What’s next

For teams designing their own personal or team agents, Muse is the reference for hosted custody, Sentinel-style gates, and connector negotiation—not for copying Meta’s VM economics blindly. Compare one real workflow (mail + calendar + a single commerce connector) against a self-hosted OpenClaw gateway on hardware you already own; the difference is ops and trust boundary, not whether the loop exists.

## Sources

- [Introducing Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) (Meta)
- [How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (Meta AI Research)
- [Muse Charm coverage](https://www.theverge.com/tech/999750/muse-charm-meta-ai-hardware) (The Verge)
- [Stripe Link + Muse](https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link)
- [OpenClaw](https://openclaw.ai/) and [docs](https://docs.openclaw.ai/)
- [Community-measured Muse VM specs](https://www.starkinsider.com/2026/09/meta-muse-specs-what-it-runs-on.html) (Stark Insider; not Meta official)
- [Meta admits Muse’s likeness to OpenClaw isn’t a coincidence](https://techcrunch.com/2026/09/22/meta-admits-muses-likeness-to-openclaw-isnt-a-coincidence/) (TechCrunch; Friedman on X)
- [Muse sure looks a lot like OpenClaw](https://www.theverge.com/report/1000180/muse-openclaw-instinct-lookalike) (The Verge)
- Related: [Prompt injection: the webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/)
