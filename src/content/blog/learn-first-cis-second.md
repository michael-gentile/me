---
title: "CIS benchmarks: learn the box first"
date: 2026-09-24
tags:
  - infrastructure
  - security
summary: "I wanted one ordered home-server story before CIS PDFs trumped my choices. That learn-first, CIS-second sequence is deliberate, not a compromise."
---

Home-server hardening guidance splinters across blog posts, distro wikis, and vendor PDFs—and they disagree on order. Starting with CIS distribution benchmarks is dense enough that SSH hardening may never finish before frustration wins. The ceiling is documentation design for an infrequent task: install a server once a year, scattered articles skip “boring” basics, and a static PDF cannot track Docker versus UFW or CrowdSec rewrites. The sequence that sticks is one practitioner narrative on a Saturday, then CIS as the override wherever it conflicts with what is already shipped and understood.

Security guidance is not one authoritative stack. The home-server path in this series exists because someone kept notes while building a Debian box and wanted **one** ordered story—SSH before firewall, shell snippets for config edits, backups before every file change, and a **Danger Zone** for sysctl you might break. Honest scope beats fake completeness: not a Linux course, not physical security, not every LSM nuance—AppArmor and SELinux often sit in the "later" pile.

Picture opening a CIS PDF on page one and encountering dozens of controls before you have a working SSH key, a tested `sshd` reload, or outbound mail for alerts. You skip “low value” rows, implement random hardening from blog tabs, and three months later Lynis emails a report nobody reads. Learn-first is not anti-compliance—it is recognizing that **implementation order** and **audit catalogue** answer different questions.

## Stake: infrequent task, scattered sources

The "why yet another guide" argument is really about **documentation design**:

- Infrequent task (you install a server once a year).
- Scattered articles disagree on order and defaults.
- Basics get skipped because they feel boring (who remembers `AllowGroups` until prod?).

A single ordered write-up teaches while it configures. Checklists elsewhere—[OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) is a catalogue you argue with, not magic compliance dust. Here the artefact is a path you can follow on a Saturday.

Community-maintained guides keep evolving (CrowdSec, Docker versus UFW, WIP sections for AIDE and ClamAV). A static PDF cannot do that. A living document can, which is why "home Linux server" still starts with a walkthrough even when individual steps get disagreed with.

## Mechanism: practitioner path versus CIS catalogue

Good practitioner material repeatedly sends you to [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/): exhaustive, industry-trusted, distribution-specific. CIS organizes controls by section (filesystem, services, network, logging, access control) with severity levels and audit procedures. It assumes change control, named owners, and evidence collection—not a solo admin on a kitchen-table Mini PC.

The recommended sequence:

1. Work through a **practitioner guide** first — learn the moves, get a working server, understand tradeoffs (lockout, Docker paths, ban tools).
2. Then apply CIS so **their** recommendations **trump** anything that conflicts.

That order matters for two audiences:

- **At home:** CIS PDFs are dense. The walkthrough gets you to "reasonably safe and understood" with recovery and alerts wired.
- **At work:** Auditors speak CIS control IDs. A blog-style guide does not replace a benchmark sign-off. It gives mental models so the benchmark rows are not magic spells.

Compliance conversations should sound like "aligned to CIS Distribution X Benchmark vY, with a practitioner path for implementation order"—not "we read a long markdown doc."

## Ordering tables: what comes before what

Practitioner order is **dependency-aware**. CIS order is **catalogue-complete**. Mapping them avoids doing audit work on a box that cannot email you when it breaks.

| Phase | Practitioner focus | Typical CIS themes (varies by benchmark) | Why order matters |
| --- | --- | --- | --- |
| 0 | Threat model, recovery, snapshots | Asset context, change control | Lockout beats marginal controls |
| 1 | Users, SSH keys, sudo, sshd hardening | Access, authentication, sshd settings | Second session open during reload |
| 2 | Outbound alerts (msmtp/exim), test mail | Logging and monitoring | Silent host rots |
| 3 | Updates, unattended-upgrades | Patch management | Open ports mean less if CVEs linger |
| 4 | UFW/nftables, fail2ban/crowdsec | Network, host firewall | Exposure map includes Docker FORWARD |
| 5 | Docker publish policy, DOCKER-USER | Often lagging or silent on compose | Benchmarks trail real stacks |
| 6 | Auditing (auditd, Lynis, AV) | Logging, integrity | Detection after prevention basics |
| 7 | Danger Zone sysctl, hidepid, GRUB | Kernel parameters, boot loader | Console required for rollback |

When CIS is silent on Docker publishing versus UFW, practitioner notes on packet paths still apply—benchmarks lag real stacks. When CIS **conflicts** with something you chose (e.g., a service CIS wants disabled that you require), document the exception with benchmark section ID and compensating control.

## Drift: why manual first still wins once

**Drift** is the slow divergence between “what I hardened in week one” and “what the box runs today”—`apt upgrade` reopens suggestions, someone edits `sshd_config`, a compose file adds `--publish`, a package installs a new systemd socket on `0.0.0.0`.

Manual first is not Luddite. It is how you notice that `hidepid=2` broke something on your systemd version, or that your ISP blocks outbound SMTP on port 25. Automation encodes decisions you already tested; it does not discover them for you.

| Drift source | What breaks | Manual-first lesson | CIS-second pass |
| --- | --- | --- | --- |
| Package upgrade | New default config snippets | Read `ucf`/`dpkg` prompts | Re-audit affected sections |
| Ad hoc SSH edit | Weak ciphers return | Diff `/etc/ssh` after changes | SSH section re-scan |
| New container publish | WAN exposure | External `curl`/`nc` probe | Document exception or fix |
| Cron job as root | Unexpected listeners | `ss -tlnp` habit | Service hardening rows |

After the moves are understood, Ansible (or any config management) fights drift—see the companion post on encoding the same order in playbooks. CIS second pass is the **gap analysis**: export Lynis or OpenSCAP hints, walk benchmark sections, mark NA vs fail vs compensating.

## Build: a Saturday path, then benchmark sweep

**Saturday (practitioner):**

1. Snapshot VM or use throwaway metal.
2. Principles: why the box exists, recovery path, alert email test.
3. SSH with keys, groups, non-default port if desired—keep one known-good session.
4. Firewall defaults; if Docker is present, loopback bind or `DOCKER-USER` before calling network “done.”
5. Ban tool (Fail2Ban or CrowdSec) with verified test ban.
6. Backups and note where secrets live.

**Following weekend (CIS):**

1. Download the matching CIS PDF for your distro/version.
2. Work section by section; for each control: implement, mark NA with reason, or document exception.
3. Store evidence (command output, config snippets) where your future self or auditor expects it.

Verification crosses both phases:

```bash
# examples—not a complete CIS audit
sudo sshd -t && sudo systemctl status ssh
sudo ufw status verbose    # plus external probe if Docker publishes
sudo fail2ban-client status || sudo cscli decisions list
echo test | mail -s "host alert path" you@example.com
```

## Practitioner path and audit path: lens table

| Lens | Practitioner guide | CIS benchmark |
| --- | --- | --- |
| Goal | Learn + ship a home/at-home server | Measurable hardening baseline |
| Order | Logical sequence (SSH, then network, …) | Control catalogue |
| Risk tone | Calls out lockout and Danger Zone | Assumes change control |
| Updates | Community edits over time | Versioned releases |
| Docker/compose | Discusses FORWARD vs INPUT | May be incomplete |
| Success | You can recover and get alerts | Evidence per control ID |

When they disagree, CIS wins for **policy**. When CIS is silent on a modern stack behavior, practitioner verification (second-machine probes, bouncer tests) still applies.

## Limits

CIS is not a substitute for threat modeling your actual services. Passing rows does not prove containers are not published to the WAN. Benchmark versions pin to distro releases—upgrading Ubuntu without upgrading the benchmark PDF leaves you in ambiguous territory.

Learn-first does not mean “ignore CIS forever.” It means not letting catalogue density block the basics that make CIS implementation honest: alerts, recovery, and understanding why a control exists before toggling it.

## Sources

- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- Related: [Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/), [Ansible: encode the hardening you already ran](/me/blog/ansible-after-manual-hardening/), [Sysctl: the Danger Zone knobs (and hidepid)](/me/blog/danger-zone-sysctl-and-hidepid/)
