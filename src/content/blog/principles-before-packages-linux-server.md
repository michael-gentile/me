---
title: "Principles before packages on a Linux box"
date: 2026-09-23
tags:
  - linux
  - security
summary: "Before Fail2Ban or UFW, name your threat model, recovery path, and how alerts leave the machine. Practitioner guides start there for a reason."
---

Copy-paste hardening is seductive. The long home-server guides are full of snippets for lazy editors, but the good ones open with **identify your principles** because tools without a model become performance art. You installed CrowdSec. You feel safer. You might still never know the box was used as a relay.

That line rhymes with enterprise breach stories: intrusion without vandalism, data copied, disk left unchanged. The parallel to LLM work is not perfect, but the habit is the same as [Threat-model the chatbot first](/me/blog/threat-model-the-chatbot-before-the-prompt/): draw the picture before you buy the next control.

## Questions to answer before you install anything

Not a checklist you file once. Concrete choices:

- **Why** are you securing this host? Internet-facing SSH from a friend's Wi‑Fi is a different beast than a LAN-only file share mounted on a desktop that gets malware.
- **How much** security versus **how much** convenience? Key-only SSH, 2FA, and a non-default port are friction you feel on every login.
- **Physical access** in scope? A stolen tower with unencrypted disks is a threat model item, not a footnote.
- **Recovery if you lock yourself out?** Disable root login, password-protect GRUB, tight `AllowGroups` — all good until you're staring at a console you can't pass.

The classic home-lab use-case is deliberately narrow: desktop-class hardware, one NIC, consumer router, dynamic WAN, SSH from unknown places. Datacenter hardening is a different book, but the **questions** still apply when you promote the same patterns to a VPS.

## Alerts are a control, not email nostalgia

Serious checklists insist the server must **send mail** (or another channel) for security alerts. Unattended upgrades, Fail2Ban, Lynis reports — they only help if someone reads them. Common paths are Exim4 with provider SMTP, or msmtp for relay-only setups.

Same separation as [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/): the **process** must deliver signal. Here the process is cron, apticron, or Lynis attaching a report, not a chatbot calling an API. If outbound 587 is blocked on your VPS plan, fix that before you tune SSH ciphers. A silent host is a host that can rot.

I would treat "test message arrives in my inbox" as a launch criterion, next to "I can SSH with keys."

## Panic credentials (when destruction is the win)

Some guides cover a **secondary / panic password** via `pamduress`: log in with the duress password and a script runs — wipe data, burn CPU, make the stolen machine useless. The narrative is physical theft, no disk encryption, attacker brute-forces a weak **decoy** password you were trained to give up.

I would not deploy this on a shared team server without legal and ops review. For a home box holding the only copy of photos and tax PDFs, it is an honest answer to "what if they take the metal?" It is the opposite of silent exfiltration: **failed** confidentiality on purpose so integrity and availability also fail for the thief.

Document the script. Test on a VM. If your real password and panic password differ by one character, you will use the wrong one once.

## Cheap sandboxing before you reach for a VM farm

**FireJail** shows up in many basics sections: wrap risky apps so a compromise does not own the whole userland. It is not [Eddy's](/me/blog/eddy-an-enterprise-personal-agent/) per-user VM, and not [Muse's](/me/blog/muse-and-the-personal-agent/) appliance story, but the design rhyme is **smaller blast radius**. On a home server that runs one odd binary you do not trust enough for bare metal, FireJail is a middle step before containers or a dedicated machine.

## Order of operations I keep

1. Principles and recovery (including how you get back in if SSH changes go wrong).
2. Outbound mail or another alert channel that works.
3. SSH — keys, groups, hardening — with a second session open while you reload `sshd`.
4. Updates and only then the network stack ([UFW and Docker](/me/blog/docker-ufw-is-not-your-exposure-map/) if you publish ports).

Packages come after the sentences you would put in a one-page threat model. The long guides stay long because Linux installs are rare; the principles section is short because it has to stick.

## Sources

- Related: [Threat-model the chatbot first](/me/blog/threat-model-the-chatbot-before-the-prompt/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/)
