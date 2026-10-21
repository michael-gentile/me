---
title: "Ansible: encode the hardening you already ran"
date: 2026-09-27
tags:
  - infrastructure
  - security
summary: "After I walked users, SSH, UFW, Fail2Ban, mail, and audits by hand, Ansible was how the box stopped drifting on the next apt upgrade. Same order, encoded—with links to each topic in this series."
---

The third home-server install exposes the same ceiling as the first: packages reopen ports, someone "just tweaks" `sshd_config`, and Lynis stops mailing reports. Manual hardening on a throwaway VM teaches the order—users and SSH, UFW, Fail2Ban, outbound mail, audits—but it does not stop drift after the first `apt upgrade`. Ansible encodes that same sequence so the box does not slide back to defaults; it does not replace threat modeling, Docker exposure probes, or Danger Zone sysctl tested one key at a time.

Maintainers of community playbooks say the obvious: read tasks, do not treat playbooks as compliance, put secrets in Ansible Vault. Same spirit as learn-first, CIS-second—encode choices already tested; benchmarks and threat models still trump a green playbook run.

Picture a playbook that “fixes” SSH and UFW while compose on the same host still publishes Grafana on `0.0.0.0:3000`. Automation green-lights; the exposure map unchanged. Ansible helps when it replays **decisions you already verified**, including the gaps playbooks usually leave (Docker `DOCKER-USER`, CrowdSec sharing policy, sysctl one-liners).

## Stake: automation fights drift, not ignorance

**Drift** is configuration sliding away from intent: defaults return, hand edits accumulate, services appear that nobody added to the inventory. Ansible’s strength is **idempotent convergence**—re-run the playbook and the host returns to declared state.

Weak automation applies unknown tasks from the internet and calls it hardened. Strong automation mirrors the manual path you walked once: bootstrap users, SSH, firewall, mail, updates, audits—then custom roles for everything the upstream playbook skipped.

## When automation helps (and when it does not)

| Helps | Does not replace |
| --- | --- |
| Re-applying `sshd_config` after ad hoc edits | Choosing whether CrowdSec shares signals |
| Resetting UFW defaults after package hooks | Probing published ports from another network |
| Ensuring Lynis/cron/mail reports stay scheduled | CIS gap analysis and exception paperwork |
| Standardizing Fail2Ban jails across clones | Testing `hidepid=2` on your systemd version |
| Vault-backed secrets instead of plain git | Threat modeling before `apt install` |

Workflow that scales: walk the steps once on a throwaway VM, note what broke, fix compose and firewall paths, **then** point playbooks at the second VM with fixes in variables or local roles.

## Two-stage runs mirror “do not lock yourself out”

Two-stage run is the pattern commonly seen:

1. **Requirements / bootstrap playbook** — run as root with password once: sudo, groups (`sshusers`, `sudousers`, `suusers`), new admin user, passwordless sudo for that user, SSH public key installed.
2. **Main hardening playbook** — run as the new user on the **new SSH port** configured in step one.

After the first successful run you should use the key and `-e ansible_ssh_port=...` for repeatability. That mirrors keeping a second session open while `sshd` reloads.

Generate ed25519 keys before disabling password authentication:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_homelab -C "homelab-admin"
```

## Ordering table: manual topic → playbook area

Main playbooks usually map to the manual path. Use this as a coverage checklist—not every upstream role implements every row.

| Order | Manual topic | Playbook area | Automation caveat |
| --- | --- | --- | --- |
| 1 | Principles, recovery | (rarely encoded) | Document in README/inventory |
| 2 | Users, groups, sudo | Bootstrap / requirements | Run once; protect inventory |
| 3 | SSH hardening, pwquality | SSH role | `sshd -t` handler; test port |
| 4 | UFW default deny, limits | Network role | **Docker publish not automatic** |
| 5 | Fail2Ban / PSAD | Network IDS role | CrowdSec often manual |
| 6 | msmtp / outbound mail | Mail role | Verify SMTP port with provider |
| 7 | unattended-upgrades, apticron | Updates role | Reboot policy separate |
| 8 | ClamAV, rkhunter, auditd | Auditing role | CPU/disk on small VPS |
| 9 | Lynis + email report | Audit role | Score is snapshot only |
| 10 | Docker DOCKER-USER, loopback binds | **Custom tasks** | Compose lives outside role |
| 11 | CrowdSec agent + bouncer | **Custom or absent** | Policy on sharing |
| 12 | Danger Zone sysctl, hidepid | **Manual / tagged** | One key per VM test |

CrowdSec, Docker `DOCKER-USER`, panic passwords, and Danger Zone sysctl are usually **manual** or custom roles. Automation covers the common path, not every optional section of a long guide.

## Mechanism: idempotency versus judgment

Ansible excels at:

- Ensuring `sshd_config` lines match policy after someone "just fixed something quick."
- Re-applying UFW defaults when a package install opens ports.
- Scheduling ClamAV and rkhunter consistently.

Ansible does not replace:

- Threat modeling before package installs.
- Verifying container exposure from another host (`nc`, `curl` from laptop on cellular).
- Choosing CrowdSec telemetry with eyes open.
- Testing sysctl one key at a time before templating `/etc/sysctl.d`.

**Idempotency** means the second run should change nothing if the world matches the playbook. It does not mean the playbook is correct—only that it is stable. A stable wrong rule is worse than drift you notice because Lynis emailed.

Use `--check` (dry run) for initial trust, then diff mode on critical files:

```bash
ansible-playbook --check --diff -i hosts.yml main-playbook.yml
```

Handlers should reload services only when files change; always include manual `sshd -t` validation in your runbook even if the role already does.

## Variables, inventory, and drift detection

`group_vars/variables.yml` (or equivalent) holds SSH port, user name, mail relay settings for msmtp, allowed outbound mail port, and related knobs. Change them before running against production. A stable IP or DNS name helps so automation does not strand you after network edits.

Passwords and SMTP credentials should not live in plain text in git long term. Vault or your secret store is the adult option:

```bash
ansible-vault create group_vars/secrets.yml
ansible-playbook --ask-vault-pass -i hosts.yml main-playbook.yml
```

Drift detection beyond Ansible:

- Periodic Lynis mail whether or not playbook ran
- `ansible-playbook` on a schedule from a trusted runner (not from the host alone)
- Git diff on your local `roles/` when upstream updates—community playbooks change jail names and package lists

When CIS second pass marks a control, encode it in a named task with a comment citing benchmark ID so exceptions are searchable.

## Build: minimal run pattern

```bash
# after editing inventory and group_vars
ansible-playbook --inventory hosts.yml --ask-pass requirements-playbook.yml
ansible-playbook --inventory hosts.yml --ask-pass main-playbook.yml
# later runs: key + non-default port
ansible-playbook --inventory hosts.yml -e ansible_ssh_port=YOUR_PORT \
  --key-file /path/to/key main-playbook.yml
```

Post-run verification (manual, not optional):

```bash
# from control node
ansible all -m ping
ansible all -a "sudo ufw status verbose"
ansible all -a "sudo fail2ban-client status sshd" 2>/dev/null || true
# from laptop on another network: probe published ports if any
```

Add custom tasks for Docker when compose publishes ports—example task shape:

```yaml
# illustrative local role fragment
- name: Insert DOCKER-USER allowlist for admin IP
  ansible.builtin.iptables:
    chain: DOCKER-USER
    source: "{{ admin_home_ip }}/32"
    jump: RETURN
    action: insert
    rule_num: 1
  when: docker_publish_restrict | default(false)
```

Keep compose `ports` bound to `127.0.0.1` in git when the proxy lives on the host—that is the first choice before iptables complexity.

## Limits

Playbooks age like sysctl lists: new distro releases change package names, defaults, and socket units. Blind `--upgrade` on roles can lock you out or ban your own IP if jail regexes shift.

Automation without learn-first produces hosts nobody can debug when SSH fails. CIS without automation produces audit binders and drifting production. The series order is deliberate: principles → manual path → CIS gap → Ansible convergence.

Do not treat a green playbook run as penetration test success. Treat it as “declared state matches”—then still probe exposure from outside.

## Sources

- [Ansible documentation](https://docs.ansible.com/)
- Related: [Home Linux: principles before packages](/me/blog/principles-before-packages-linux-server/), [Docker: UFW is not your exposure map](/me/blog/docker-ufw-is-not-your-exposure-map/), [CIS benchmarks: learn the box first](/me/blog/learn-first-cis-second/)
