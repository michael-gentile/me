---
title: "Ansible after manual hardening"
date: 2026-09-27
tags:
  - linux
  - security
summary: "Encode the same order you ran by hand: users and SSH, UFW, Fail2Ban, mail, audits. Automation fights drift once you understand the steps — with links to each topic in this series."
---

Manual hardening teaches. Automation keeps you from drifting back to defaults after the first `apt upgrade`. Public Ansible playbooks that mirror the home-server hardening sequence are a common next step — typically tested on recent Debian, with variables in `group_vars/` and inventory in `hosts.yml`.

Whoever maintains them will say the obvious: read tasks, do not treat playbooks as compliance, put secrets in Ansible Vault. Same spirit as [Learn first, CIS second](/me/blog/learn-first-cis-second/): encode choices you already tested; benchmarks and threat models still trump a green playbook run.

## How typical playbooks map to the manual path

Two-stage run is the pattern I have seen:

1. **Requirements / bootstrap playbook** — run as root with password once: sudo, groups (`sshusers`, `sudousers`, `suusers`), new admin user, passwordless sudo for that user, SSH public key installed.
2. **Main hardening playbook** — run as the new user on the **new SSH port** you configured.

After the first successful run you should use the key and `-e ansible_ssh_port=...` for repeatability. That mirrors "do not lock yourself out" — second session open while you reload `sshd`.

### What main usually encodes (and where I wrote about it)

| Playbook area | Manual topic | Note in this series |
| --- | --- | --- |
| SSH, groups, pwquality | SSH server, basics | [Principles before packages](/me/blog/principles-before-packages-linux-server/) |
| UFW default deny, SSH limit | Network | [UFW said deny; Docker published anyway](/me/blog/docker-ufw-is-not-your-exposure-map/) — **Docker publish rules are rarely automatic**; add tasks or compose loopback binds yourself |
| PSAD + Fail2Ban | Network IDS | [CrowdSec or Fail2Ban](/me/blog/crowdsec-or-fail2ban-for-a-home-box/) — many playbooks ship Fail2Ban, not CrowdSec |
| msmtp / mail | Outbound alerts | Alerts as a control in principles post |
| unattended-upgrades, apticron | Automatic updates | Security patches without you remembering |
| ClamAV, rkhunter, auditd | Auditing | Detection, not prevention — logs and scans |
| Lynis + email report | Lynis audit | A numeric "score" is a snapshot; your mileage varies |

CrowdSec, Docker `DOCKER-USER`, panic passwords, and Danger Zone sysctl are usually **manual** or custom roles. Automation covers the common path, not every optional section of a long guide.

## Variables that matter

`group_vars/variables.yml` (or equivalent) holds SSH port, user name, mail relay settings for msmtp, allowed outbound mail port, and related knobs. Change them before you run against production. A stable IP or DNS name helps so you do not automate yourself off the map after network edits.

Passwords and SMTP credentials should not live in plain text in git long term. Vault or your secret store is the adult option.

## Idempotency versus understanding

Ansible excels at:

- Ensuring `sshd_config` lines match policy after someone "just fixed something quick."
- Re-applying UFW defaults when a package install opens ports.
- Scheduling ClamAV and rkhunter consistently.

Ansible does not replace:

- Threat modeling ([principles post](/me/blog/principles-before-packages-linux-server/)).
- Verifying container exposure from another host ([Docker/UFW post](/me/blog/docker-ufw-is-not-your-exposure-map/)).
- Choosing CrowdSec telemetry ([CrowdSec post](/me/blog/crowdsec-or-fail2ban-for-a-home-box/)).
- Testing sysctl one key at a time ([Danger Zone post](/me/blog/danger-zone-sysctl-and-hidepid/)).

My workflow: walk the steps once on a throwaway VM, note what broke, then point playbooks at the second VM with fixes in variables or local roles.

## Series index (six angles)

1. [UFW said deny; Docker published anyway](/me/blog/docker-ufw-is-not-your-exposure-map/)
2. [Principles before packages on a Linux box](/me/blog/principles-before-packages-linux-server/)
3. [Learn first, CIS second](/me/blog/learn-first-cis-second/)
4. [CrowdSec or Fail2Ban on a home box](/me/blog/crowdsec-or-fail2ban-for-a-home-box/)
5. [Danger Zone: sysctl by consensus and hidepid](/me/blog/danger-zone-sysctl-and-hidepid/)
6. This post — automation layer

Cross-domain rhymes if you came from the LLM posts: allowlists beat deny lists, dashboards lie when the real path bypasses the control, humans (or mail) must close the loop when automation bans your coffee-shop IP.

## Minimal run pattern

```bash
# after editing inventory and group_vars
ansible-playbook --inventory hosts.yml --ask-pass requirements-playbook.yml
ansible-playbook --inventory hosts.yml --ask-pass main-playbook.yml
# later runs: key + non-default port
ansible-playbook --inventory hosts.yml -e ansible_ssh_port=YOUR_PORT \
  --key-file /path/to/key main-playbook.yml
```

Generate ed25519 keys before you disable password authentication.

## Sources

- [Ansible documentation](https://docs.ansible.com/)
- Related posts in this series (links above)
