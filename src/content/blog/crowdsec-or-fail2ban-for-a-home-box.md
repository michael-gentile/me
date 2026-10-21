---
title: "CrowdSec vs Fail2Ban: shared bans on a home box"
date: 2026-09-25
tags:
  - infrastructure
  - security
summary: "I compared Fail2Ban’s local jails with CrowdSec’s optional community blocklists on a small SSH-exposed host; the real tradeoff is outbound telemetry and false positives, not which logo is newer."
---

A small SSH-exposed home box or VPS eventually needs a log-tailing ban mechanism—but the real fork is not “which logo is newer.” **Fail2Ban** keeps decisions local: your jails, your thresholds, your ban list. **CrowdSec** adds an optional community signal path: detect on your logs, share metadata, consume a **Community Blocklist** of IPs that crossed collective thresholds elsewhere. Neither replaces key-only SSH or a sane firewall; both are speed bumps for password spraying and dumb bots. The tradeoff that matters is architecture (where decisions happen), outbound telemetry, false positives from shared reputation, and whether the box can afford another daemon on 1 GB of RAM.

Picture SSH auth logs filling with `Invalid user admin` from addresses you have never seen before. Fail2Ban increments a counter on **your** box and inserts a local ban when a jail fires. CrowdSec runs a similar local pipeline—parsers, scenarios, local decisions—then optionally **signals** upstream and applies **bouncers** that enforce bans from both local events and downloaded blocklists. The coffee-shop IP you use tomorrow might already be on a community list because someone else’s honeypot saw it first. That preemptive block is the feature and the risk.

## Stake: local jails versus collective reputation

Both tools address **automated abuse**: bots guessing passwords, scanning for weak services, hammering SSH. They do not fix publishing Docker to the world, weak keys, or missing patches. They reduce noise and slow attackers who reuse IPs.

The choice is whether **all intelligence stays on the machine** or whether you opt into **shared threat metadata** for preemptive blocks and curated lists—explicitly documented by CrowdSec in [signal metadata](https://docs.crowdsec.net/docs/next/central_api/intro#signal-meta-data) and [our data](https://www.crowdsec.net/our-data).

## Architecture contrast

| Layer | Fail2Ban | CrowdSec |
| --- | --- | --- |
| Input | Log files (sshd, nginx, …) | Log files, journals, optional acquisition |
| Detection | Jail regex + counters | Parsers + scenarios (YAML), buckets |
| Decision | Local jail action | Local `cscli decisions` + optional LAPI/CAPI sync |
| Enforcement | `iptables`/`nftables` via action | **Bouncers** (firewall, nginx, cloud, …) |
| Shared intel | None by default | Optional community blocklists / signals |
| Ops model | One daemon, familiar tutorials | Agent + bouncer(s), versioned hub scenarios |

Fail2Ban’s loop is tight: **log line → filter match → ban action**. Custom jails are powerful and easy to get wrong (regex too broad bans legitimate users; too narrow misses attacks).

CrowdSec splits **detection** (agent) from **enforcement** (bouncers). The agent evaluates scenarios, may consult central services depending on mode, and publishes decisions bouncers poll or subscribe to. That modularity helps when you want nginx or cloud WAF enforcement without rewriting jails—but it is more moving parts on a tiny VPS.

**PSAD** sometimes appears in the same chapter as iptables log analysis—scan detection, email alerts, optional auto-block—watching **firewall logs** instead of application logs. It overlaps philosophically with ban tools but does not replace either primary story. Stacking every tool on 1 GB RAM without measuring CPU and log volume is a bad default.

## Fail2Ban: boring, local, yours

Fail2Ban tails auth logs, matches regexes, fires `iptables`/`nftables` or your firewall helper.

**Pros:** No vendor API for core operation, no outbound dependency for bans, decades of tutorials, easy to reason about in incident review (“this IP hit jail `sshd` N times”).

**Cons:** You learn only from **your** noise. A novel scan pattern hits every home user before any single ban list catches up. Distributed attacks rotate IPs faster than one box’s logs teach.

For a VPS that only runs SSH and a static site, Fail2Ban plus UFW limit rules is often enough. Occasional manual log reads still beat assuming the jail name matches reality after a distro upgrade changes log format.

Minimal verification after install:

```bash
sudo fail2ban-client status sshd
sudo journalctl -u fail2ban --since today
# intentional fail login from a test IP, confirm ban list
sudo fail2ban-client get sshd banip --with-time
```

Keep a break-glass path before tightening `maxretry` or `bantime`.

## CrowdSec: local decision plus optional sharing

CrowdSec’s docs describe curating the Community Blocklist and document what leaves your machine when sharing is enabled. Installing the agent is also choosing whether to participate in collective defense.

**Pros:** Proactive blocks for IPs already flagged globally; rich hub scenarios; bouncer ecosystem; fits a minimal “only SSH exposed” lab if you accept the ops footprint.

**Cons:** Dependency on CrowdSec infrastructure for full community value; privacy and employer policy review when homelab shares a LAN with work traffic; rare but non-zero **false positives** propagated from community signals (shared NAT egress, VPN nodes, misconfigured scanners).

Read [how they curate the blocklist](https://www.crowdsec.net/our-data) before enabling sharing on a network that also carries work traffic. **Local-only** or restricted modes may exist for your version—verify in current docs rather than assuming “install = upload everything.”

Typical install shape (versions vary):

```bash
# illustrative; follow official install for your distro
sudo apt install crowdsec crowdsec-firewall-bouncer-iptables
sudo cscli collections install crowdsecurity/linux
sudo systemctl enable --now crowdsec
sudo cscli decisions list
```

Confirm the firewall bouncer sees decisions and that your own IP is not blocked after a test scenario.

## Privacy and policy: what leaves the network

When sharing is on, CrowdSec documents **signal metadata**—not your full auth logs as a dump, but structured events derived from parsers (scenario name, source IP, timestamps, machine identity fields as configured). Homelab on consumer ISP is a different policy conversation than employer-owned hardware or a VPC peered to corporate SIEM.

Questions to answer before enable:

- Does corp policy forbid uploading threat indicators from this network?
- Is egress NAT shared with family devices that could trigger odd scenarios?
- Do you need a documented data-processing story for a side project on the same host?

If any answer is uncomfortable, Fail2Ban or CrowdSec in verified local-only configuration is the conservative branch.

## One table for usual home-lab cases

| Situation | Lean |
| --- | --- |
| Minimal VPS, you hate outbound deps | Fail2Ban |
| SSH heavily scanned, you want preemptive blocks | CrowdSec with eyes open on sharing |
| Corp policy forbids threat intel upload | Fail2Ban (or CrowdSec local-only—verify docs for your version) |
| You already run Docker and fixed publishing vs UFW | Either — fix publishing first |
| 1 GB RAM, noisy logs | One primary ban tool; measure before PSAD stack |

## Build: close the loop with alerts and break-glass

Serious checklists insist bans and audits only help if someone reads them. Fail2Ban can email via action scripts; CrowdSec has notification paths and metrics. If mail is broken, the first sign of a ban is failing SSH from a coffee-shop IP lumped in with a botnet.

Before aggressive jails or community lists:

- Console access, provider out-of-band shell, or a second SSH session from a known-good network
- Test ban/unban for a controlled IP
- Document how to remove a bouncer block (`cscli decisions delete`, fail2ban unban) without rebooting

Neither tool replaces **key-only SSH**, **`AllowUsers`/`AllowGroups`**, or fixing **world-published** services. They are layers on a box whose exposure map you already probed from a second machine.

## Limits

Community blocklists lag zero-day behavior and can punish shared egress IPs. Fail2Ban cannot see attacks that never hit your logs. Both struggle with slow, distributed guessing at scale.

On container-heavy hosts, ensure bouncers interact correctly with Docker **`FORWARD`** / **`DOCKER-USER`** policy—you can ban an IP on INPUT while published ports still accept traffic on another path if networking is split-brain.

Pick **one** primary ban mechanism, verify it fires, wire alerts, then stop installing overlapping daemons for the same log lines.

## Sources

- [CrowdSec — signal metadata](https://docs.crowdsec.net/docs/next/central_api/intro#signal-meta-data)
- [CrowdSec — our data](https://www.crowdsec.net/our-data)
- Related: [Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/), [Docker: UFW is not your exposure map](/me/blog/docker-ufw-is-not-your-exposure-map/)
