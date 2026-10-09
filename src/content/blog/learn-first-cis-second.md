---
title: "Learn first, CIS second"
date: 2026-09-24
tags:
  - infrastructure
  - security
summary: "One ordered practitioner path for learning and copy-paste, then CIS benchmarks to trump your choices. That sequence is deliberate, not a compromise."
---

Security guidance splinters across blog posts, distro wikis, and vendor PDFs. The home-server hardening path I follow in this series exists because someone kept notes while building a Debian box and wanted **one** narrative: SSH before firewall, shell snippets for config edits, backups before every file change, and a **Danger Zone** for sysctl you might break.

It is also explicit about what it is not: not a Linux course, not physical security, not every LSM nuance (AppArmor and SELinux often sit in the "later" pile). Honest scope beats fake completeness.

## Why one long guide still wins for learners

The "why yet another guide" argument is really about **documentation design**:

- Infrequent task (you install a server once a year).
- Scattered articles disagree on order and defaults.
- Basics get skipped because they feel boring (who remembers `AllowGroups` until prod?).

A single ordered write-up teaches while it configures. That matches how I use checklists elsewhere — [OWASP LLM Top 10 as a checklist](/me/blog/owasp-llm-top-10-as-a-checklist/) is a catalogue you argue with, not magic compliance dust. Here the artefact is a path you can follow on a Saturday.

Community-maintained guides keep evolving (CrowdSec, Docker versus UFW, WIP sections for AIDE and ClamAV). A static PDF cannot do that. A living document can, which is why I still start there for "home Linux server" even when I disagree with a step.

## CIS is the override, not the onboarding

Good practitioner material repeatedly sends you to [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/): exhaustive, industry-trusted, distribution-specific. The recommended sequence:

1. Work through a **practitioner guide** first — learn the moves, get a working server, understand tradeoffs.
2. Then apply CIS so **their** recommendations **trump** anything that conflicts.

That order matters for two audiences:

- **You at home:** CIS PDFs are dense. If you start there, you may never finish SSH hardening before frustration wins. The walkthrough gets you to "reasonably safe and understood."
- **You at work:** Auditors speak CIS control IDs. A blog-style guide does not replace a benchmark sign-off. It gives you mental models so the benchmark rows are not magic spells.

I would not tell a compliance team "we read a long markdown doc." I would tell them "we aligned to CIS Distribution X Benchmark vY, and we used a practitioner path for implementation order."

## Practitioner path vs audit path

| Lens | Practitioner guide | CIS benchmark |
| --- | --- | --- |
| Goal | Learn + ship a home/at-home server | Measurable hardening baseline |
| Order | Logical sequence (SSH, then network, …) | Control catalogue |
| Risk tone | Calls out lockout and Danger Zone | Assumes change control |
| Updates | Community edits over time | Versioned releases |

When they disagree, CIS wins for policy. When CIS is silent on Docker publishing versus UFW, the [Docker/UFW post](/me/blog/docker-ufw-is-not-your-exposure-map/) in this series still applies — benchmarks lag real stacks.

## Manual steps versus automation

After you understand the moves, Ansible (or any config management) fights drift — covered in [Ansible after manual hardening](/me/blog/ansible-after-manual-hardening/).

Manual first is not Luddite. It is how you notice that `hidepid=2` broke something on your systemd version, or that your ISP blocks outbound SMTP. Automation encodes decisions you already tested.

## Sources

- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- Related: [Principles before packages on a Linux box](/me/blog/principles-before-packages-linux-server/), [Ansible after manual hardening](/me/blog/ansible-after-manual-hardening/)
