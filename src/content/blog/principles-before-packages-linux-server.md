---
title: "Home Linux: principles before packages"
date: 2026-09-23
tags:
  - infrastructure
  - security
summary: "I kept reaching for Fail2Ban and UFW before I had named threat model, recovery, and how alerts leave a home Linux box. This post is the opening move practitioner guides insist on."
---

Copy-paste hardening on a home Linux box fails the same way enterprise stacks fail when controls arrive before the model: Fail2Ban and UFW get installed, the host feels safer, and nobody can say why the box matters, how to get back in after a bad SSH edit, or whether security mail ever leaves the host. Long practitioner guides open on those sentences, not package names. Tools without a named threat model, recovery path, and alert channel become performance art—you might still never know the box was used as a relay.

The classic home-lab use case is deliberately narrow: desktop-class hardware, one NIC, consumer router, dynamic WAN, SSH from unknown places. Datacenter hardening is a different book, but the **questions** still apply when the same patterns move to a VPS.

**Threat model** here means a short list of assets (photos, git mirrors, LAN services), actors (roommates, internet scanners, physical thief), and outcomes you care about (confidentiality, availability, integrity)—not a 40-page PDF. **Recovery path** is how you regain root or console access when SSH hardening locks you out. **Alert channel** is any path that proves "something happened" reaches a human inbox or phone without logging into the box.

## Four choices precede every `apt install`

Not a checklist filed once. Concrete choices:

- **Why** is this host being secured? Internet-facing SSH from a friend's Wi‑Fi is a different beast than a LAN-only file share mounted on a desktop that gets malware.
- **How much** security versus **how much** convenience? Key-only SSH, 2FA, and a non-default port are friction on every login.
- **Physical access** in scope? A stolen tower with unencrypted disks is a threat model item, not a footnote.
- **Recovery if locked out?** Disable root login, password-protect GRUB, tight `AllowGroups` — all good until the console is the only path back.

Packages come after the sentences that would fit on a one-page threat model.

### Worked example: two hosts, two models

**Host A — LAN file server, no inbound from WAN.** Threats: ransomware on a Windows laptop mapping the share, accidental deletion, disk failure. Controls: backups off-box, snapshots, maybe full-disk encryption because the tower sits in a shared space. Fail2Ban on SSH matters less if SSH is not exposed. UFW default deny still helps when Docker publishes ports you forgot about.

**Host B — VPS with SSH on 22/tcp worldwide.** Threats: credential stuffing, stolen laptop keys, botnet relay if a web app is misconfigured. Controls: key-only auth, non-root sudo, automatic security updates with mail, outbound mail that works, maybe Fail2Ban or CrowdSec with a ban list you actually read. Recovery: provider console or serial, not "walk to the basement."

Same Linux packages appear in both blog posts; the **order** and **emphasis** differ because the models differ. Write which host you are before copying a tutorial.

## Alerts are a control, not email nostalgia

Serious checklists insist the server must **send mail** (or another channel) for security alerts. Unattended upgrades, Fail2Ban, Lynis reports — they only help if someone reads them. Common paths are Exim4 with provider SMTP, or msmtp for relay-only setups.

The **process** must deliver signal: cron, apticron, or Lynis attaching a report. If outbound 587 is blocked on a VPS plan, fix that before tuning SSH ciphers. A silent host is a host that can rot.

"Test message arrives in the inbox" belongs next to "SSH with keys works" as a launch criterion.

### Verification steps for outbound alerts

1. From the host, send a test message through the same transport your tools will use (`msmtp`, `sendmail`, provider API wrapper).
2. Confirm receipt on a mailbox you check when not at the keyboard—not an alias that forwards to `/dev/null`.
3. Trigger a synthetic alert: Fail2Ban ban on a test IP, or a Lynis run mailed by cron. Read the body; ensure hostname and timestamp are correct.
4. Block outbound 587 on purpose in a lab (iptables REJECT) and confirm your monitoring notices failed mail—otherwise upgrades can fail silently for months.

**Limits:** SMTP from residential IPs is often blocked; you may need a relay with auth. Some providers rate-limit or require SPF/DKIM on the From domain. Push notifications (ntfy, healthchecks.io ping on cron failure) are valid alert channels if email is unreliable—pick one that works, not one that sounds enterprise.

## Panic credentials when destruction is the win

Some guides cover a **secondary / panic password** via `pamduress`: log in with the duress password and a script runs — wipe data, burn CPU, make the stolen machine useless. The narrative is physical theft, no disk encryption, attacker brute-forces a weak **decoy** password trained to be given up.

Deploying this on a shared team server needs legal and ops review. For a home box holding the only copy of photos and tax PDFs, it is an honest answer to "what if they take the metal?" **Failed** confidentiality on purpose so integrity and availability also fail for the thief.

Document the script. Test on a VM. If the real password and panic password differ by one character, the wrong one gets used once.

### Limits of duress and wipe scripts

- Legal jurisdiction: destroying data on a stolen laptop may be fine; destroying shared infrastructure is not.
- Backups: if panic wipes the only copy and backups were on the same disk, the thief wins anyway—encryption plus off-site backup beats drama scripts.
- False triggers: fat-finger on login should not nuke the array; separate mechanisms and clear training matter.

## FireJail shrinks blast radius before a VM farm

**FireJail** shows up in many basics sections: wrap risky apps so a compromise does not own the whole userland. It is not per-user VM isolation, but the design rhyme is **smaller blast radius**. On a home server that runs one odd binary not trusted enough for bare metal, FireJail is a middle step before containers or a dedicated machine.

**Verification:** run the app inside FireJail with `--net=none` if it should not phone home; confirm it still works. Inspect `/proc/1/root` from inside the jail—you should not see the full host tree. **Limits:** FireJail is not a kernel hypervisor; kernel bugs and misconfigured profiles still escape. Use it to contain known-risky userland, not as compliance "segmentation."

## Order of operations that matches practitioner guides

1. Principles and recovery (including how to get back in if SSH changes go wrong).
2. Outbound mail or another alert channel that works.
3. SSH — keys, groups, hardening — with a second session open while `sshd` reloads.
4. Updates and only then the network stack (Docker publishing if ports are exposed).

The long guides stay long because Linux installs are rare; the principles section is short because it has to stick.

### SSH hardening with a safety wire

Before `systemctl reload sshd`:

- Open a second terminal with an existing session. Do not close the first until the second proves key login works.
- Keep `PasswordAuthentication yes` until key login succeeds once; then flip to `no`.
- Document provider console access (VPS) or physical keyboard (home) in the same note as your threat model.

If you use `AllowUsers` or `AllowGroups`, verify membership with `id` before reload—a typo becomes a truck roll or a support ticket.

## What "done" looks like without a package shopping list

Done is not "installed Lynis." Done is:

- One page that states assets, actors, and acceptable tradeoffs.
- A tested recovery path written down.
- Proof that alerts leave the box.
- SSH that survives your own mistakes because you tested with two sessions.
- Updates automatic or scheduled with failure visible.

Then Fail2Ban, UFW, auditd, or Ansible playbooks are implementations of a model you can explain to future-you.

## Sources

- Related: [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/), [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [CrowdSec or Fail2Ban for a home box](/me/blog/crowdsec-or-fail2ban-for-a-home-box/)
