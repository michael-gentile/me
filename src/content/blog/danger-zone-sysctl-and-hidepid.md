---
title: "Sysctl and hidepid in the Danger Zone"
date: 2026-09-26
tags:
  - infrastructure
  - security
summary: "Kernel sysctl tunables and hidepid on /proc can improve hardening or brick login and networking. Good guides label that risk explicitly and still document options like hidepid=2 for multi-user hosts."
---

Some hardening steps do not belong in the happy path because a typo or a wrong value can leave a box that does not boot, does not network, or does not let you in. Practitioner write-ups quarantine that material under a **Danger Zone**: sysctl hardening, GRUB passwords, disabling root login, umask changes, orphaned software cleanup. The tone is repeated **proceed at your own risk**, and that honesty is worth a post by itself because too many guides paste `sysctl` blocks like scripture.

## Sysctl: consensus, not mastery

The kernel sysctl sections I trust open with a disclaimer: settings merged from multiple reputable sites because **documentation for individual keys is thin**. Test with `sysctl -w key=value`, confirm services survive, then persist in `/etc/sysctl.conf` or a drop-in under `/etc/sysctl.d/`.

That is **consensus hardening**, not first-principles engineering, which is reasonable for a homelab if you accept rollback via console or snapshots. Some keys reduce spoofing and SYN-flood pain, but a wrong `rp_filter` or TCP tweak can break legitimate asymmetric routing or odd VPN setups, so I would not skip the whole block blindly and I would not apply it as a single batch without testing.

My bar: change one knob at a time on a VM clone, run your real workload (SSH, Docker publish, mail outbound), then promote. Same discipline as [Learn first, CIS second](/me/blog/learn-first-cis-second/): benchmarks may mandate kernel parameters your ISP's network cannot tolerate.

Treat bundled sysctl lists as a **menu**, not a batch paste — especially if Ansible will apply them later ([automation post](/me/blog/ansible-after-manual-hardening/)).

## hidepid=2 on /proc (basics, not Danger Zone — but same theme)

**Securing /proc** often sits in the basics, not the Danger Zone, but the tradeoff fits here: mount `proc` with `hidepid=2` so users only see their own processes. Other users' PIDs and command lines vanish — good on a shared shell host, bad if your monitoring assumes everyone can `ps` everything.

Some systemd versions and distros break when `hidepid` is enabled. Read your release notes and test on a VM before you append to `/etc/fstab` and reboot.

Steps are blunt: backup `fstab`, add:

```text
proc     /proc     proc     defaults,hidepid=2     0     0
```

reboot, verify login and services. Hardening that hides observability is still hardening — you just traded attacker recon for admin visibility.

## GRUB and root login (brief)

Password-protect GRUB and disable root SSH login are classic recommendations with **lockout** as the residual risk. They belong in the Danger Zone because recovery requires console access or provider rescue mode — tie back to [Principles before packages](/me/blog/principles-before-packages-linux-server/) and the "how do I get back in?" question.

## When I would touch this on a blog VPS

For a single-user VPS running this static site and nothing else, I might skip aggressive sysctl entirely and focus on SSH, updates, firewall truth (including [Docker](/me/blog/docker-ufw-is-not-your-exposure-map/)), and backups.

For a shared dev jump box where multiple people have shells, `hidepid=2` becomes interesting. For sysctl, enable or skip per role with tags in config management rather than one global file for every host.

## Sources

- Related: [Learn first, CIS second](/me/blog/learn-first-cis-second/), [Principles before packages on a Linux box](/me/blog/principles-before-packages-linux-server/)
