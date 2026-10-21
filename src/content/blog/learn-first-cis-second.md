---
title: "CIS benchmarks: learn the box first"
date: 2026-09-24
tags:
  - infrastructure
  - security
summary: "I wanted one ordered home-server story before CIS PDFs trumped my choices. That learn-first, CIS-second sequence is deliberate, not a compromise."
---

When I started hardening a home Debian box, CIS distribution benchmarks and a dozen blog posts all looked authoritative and they disagreed on order. What helped was one practitioner narrative I could follow on a Saturday, then CIS as the override wherever it conflicted with what I had already shipped and understood. This post explains why that sequence stuck and how it differs from an audit-only path.

Security guidance splinters across blog posts, distro wikis, and vendor PDFs; the home-server path I follow in this series exists because someone kept notes while building a Debian box and wanted **one** ordered story—SSH before firewall, shell snippets for config edits, backups before every file change, and a **Danger Zone** for sysctl you might break. It is also explicit about what it is not (not a Linux course, not physical security, not every LSM nuance—AppArmor and SELinux often sit in the "later" pile), because honest scope beats fake completeness.

## Why one long guide still wins for learners

The "why yet another guide" argument is really about **documentation design**:

- Infrequent task (you install a server once a year).
- Scattered articles disagree on order and defaults.
- Basics get skipped because they feel boring (who remembers `AllowGroups` until prod?).

A single ordered write-up teaches while it configures. That matches how I use checklists elsewhere — [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) is a catalogue you argue with, not magic compliance dust. Here the artefact is a path you can follow on a Saturday.

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

When they disagree, CIS wins for policy. When CIS is silent on Docker publishing versus UFW, [Docker: UFW is not your exposure map](/me/blog/docker-ufw-is-not-your-exposure-map/) in this series still applies—benchmarks lag real stacks.

## Manual steps versus automation

After you understand the moves, Ansible (or any config management) fights drift — covered in [Ansible: encode the hardening you already ran](/me/blog/ansible-after-manual-hardening/).

Manual first is not Luddite. It is how you notice that `hidepid=2` broke something on your systemd version, or that your ISP blocks outbound SMTP. Automation encodes decisions you already tested.

## Sources

- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- Related: [Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/), [Ansible: encode the hardening you already ran](/me/blog/ansible-after-manual-hardening/)
