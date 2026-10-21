---
title: "CrowdSec vs Fail2Ban: shared bans on a home box"
date: 2026-09-25
tags:
  - infrastructure
  - security
summary: "I compared Fail2Ban’s local jails with CrowdSec’s optional community blocklists on a small SSH-exposed host; the real tradeoff is outbound telemetry and false positives, not which logo is newer."
---

I wanted one decision page for **Fail2Ban** versus **CrowdSec** on a home box or small VPS: both tail logs and ban addresses, but only CrowdSec adds optional shared blocklists and explicit privacy questions about what leaves your network. This post explains how each behaves on the wire, where PSAD fits without stacking three daemons on a 1 GB instance, and the table I use when SSH on the public internet collects knock attempts like lint.

Fail2Ban is local: your jails, your thresholds, your ban list. CrowdSec is local **plus** a community signal path—detect on your logs, share metadata, consume a **Community Blocklist** of IPs that crossed collective thresholds elsewhere. Neither replaces key-only SSH or a sane firewall; both are speed bumps for password spraying and dumb bots.

## Fail2Ban: boring and yours

Fail2Ban tails auth logs, matches regexes, fires `iptables`/`nftables` or your firewall helper. Custom jails are powerful and easy to get wrong.

**Pros:** No vendor API, no outbound dependency for core bans, well understood in tutorials.

**Cons:** You learn only from **your** noise. A novel scan pattern hits every home user before any single ban list catches up.

For a VPS that only runs SSH and a static site, Fail2Ban plus UFW limit rules is often enough. I would still read logs occasionally instead of assuming the jail name matches reality.

## CrowdSec: local decision, shared reputation

CrowdSec's docs describe curating the Community Blocklist and document [what signal metadata leaves your machine](https://docs.crowdsec.net/docs/next/central_api/intro#signal-meta-data). You are not just installing a daemon — you are choosing whether to participate in collective defense.

**Pros:** Proactive blocks for IPs already flagged globally; bouncer ecosystem; fits a minimal "only SSH exposed" lab setup.

**Cons:** Dependency on CrowdSec infrastructure for full value; privacy/policy review for homelab vs employer; false positives propagated from the community (rare but not impossible).

Read [how they curate the blocklist](https://www.crowdsec.net/our-data) before you enable sharing on a network that also carries work traffic.

## PSAD: the third character

The same network chapter in many guides includes **PSAD** for iptables log analysis — scan detection, email alerts, optional auto-block rules. It overlaps philosophically with Fail2Ban but watches firewall logs instead of application logs.

I would not stack every tool on a 1 GB VPS without measuring CPU and log volume. Pick one primary ban mechanism (Fail2Ban **or** CrowdSec bouncers) and know what PSAD adds.

## Decision table I would actually use

| Situation | Lean |
| --- | --- |
| Minimal VPS, you hate outbound deps | Fail2Ban |
| SSH heavily scanned, you want preemptive blocks | CrowdSec with eyes open on sharing |
| Corp policy forbids threat intel upload | Fail2Ban (or CrowdSec in local-only mode — verify docs for your version) |
| You already run Docker and fixed [Docker: UFW is not your exposure map](/me/blog/docker-ufw-is-not-your-exposure-map/) | Either — fix publishing first |

## Tie-in to principles

[Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/) asked how alerts leave the box. Fail2Ban can email via action scripts; CrowdSec has its own notification paths. If mail is broken, you discover bans when **you** cannot SSH from a coffee shop IP that got lumped in with a botnet.

Keep a break-glass path: console access, provider out-of-band shell, or a second session from a known-good network before you tighten jails.

## Sources

- [CrowdSec — signal metadata](https://docs.crowdsec.net/docs/next/central_api/intro#signal-meta-data)
- [CrowdSec — our data](https://www.crowdsec.net/our-data)
- Related: [Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/)
