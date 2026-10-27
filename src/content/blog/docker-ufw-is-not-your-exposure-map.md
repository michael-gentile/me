---
title: "Docker: UFW is not your exposure map"
date: 2026-09-22
tags:
  - infrastructure
  - security
summary: "UFW can deny 8080 while Docker still publishes the port on FORWARD, not INPUT. A green `ufw status` is not a complete exposure map."
---

Every home server that runs rootful Docker eventually hits the same ceiling: the host firewall says one thing, and a published container port says another. `sudo ufw deny 8080/tcp` can sit in `INPUT` while a routine `docker run --publish 8080:80` installs NAT and forwarding rules so traffic never touches that deny. The status line stays green; the service stays world-visible. Treating `ufw status` like a complete exposure map is the quiet failure mode serious hardening guides spend ink on—and the fix is to ask which path a packet takes before celebrating any single control.

Picture a laptop on another network probing `:8080` after someone denied the port on the box. From the server, default deny on incoming looks correct. From the laptop, nginx still answers because Docker’s chains and `FORWARD` handled the publish, not UFW’s usual `INPUT` path. The control that looked green never sat on the wire the traffic used.

## Stake: two firewall stories on one kernel

Linux netfilter (iptables or nftables) classifies packets by **hook** and **chain**. **UFW** is a front end that mostly manages host-local policy on **`INPUT`**: traffic destined to the host itself (SSH, systemd-resolved on loopback, a process listening on the host’s IP). **Published container ports** are a different story: Docker programs NAT (typically **`PREROUTING`/`DNAT`**) so traffic to `host:8080` is redirected to a container IP on a bridge, then filtered on **`FORWARD`** as packets move between interfaces (WAN → `docker0` → veth).

So “deny 8080 on the firewall” and “publish 8080 with Docker” are not guaranteed to interact the way intuition suggests. A deny in UFW’s `INPUT` chain blocks packets **to the host stack on that port**. A published service is often reached **after DNAT**, with the accept/drop decision happening in Docker-managed **`FORWARD`** / **`DOCKER`** / **`DOCKER-USER`** chains. Green `ufw status` can coexist with a world-reachable container.

Rootful Docker Engine on a bridge network installs its own iptables/nftables rules for NAT and publishing. A run like:

```bash
docker run --publish 8080:80 nginx
```

binds the container’s port 80 to **every** host address on 8080 unless you narrow the bind address. Good write-ups are explicit: **do not assume** a UFW deny makes a published port unreachable. They also warn that `ufw status` does not enumerate Docker-created rules, so it is not a complete picture of exposure.

Host network mode, macvlan, ipvlan, rootless Docker, Swarm, and native nftables backends change details. The mental model still holds: trace the path—ingress interface, NAT, bridge, which chain drops or accepts—before you treat any one rule as proof of safety.

## Mechanism: INPUT versus FORWARD in one diagram

Think of three buckets:

| Path | Typical hook | Question it answers |
| --- | --- | --- |
| SSH to host | `INPUT` | May this packet reach `sshd` on the host? |
| Published `-p 8080:80` | `PREROUTING` → `FORWARD` | May this packet reach the container after DNAT? |
| Container → internet | `FORWARD` / `OUTPUT` | May this container egress (policy dependent)? |

**INPUT** = “is this for me (the host)?” **FORWARD** = “am I routing this between interfaces (including into a bridge)?” Docker publish is overwhelmingly a **FORWARD** problem after DNAT, which is why UFW-first thinking breaks the day someone `--publish`es without reading the Docker networking chapter.

Docker also inserts rules at the top of **`FORWARD`** and maintains a **`DOCKER-USER`** chain intended for administrator overrides that survive Docker restarts. User rules appended naively at the end of `FORWARD` may never run before Docker’s accept rules—another reason “I added an iptables rule” sometimes fails silently.

IPv6 is a separate table (`ip6tables` / nftables inet family). Fixing IPv4 policy while leaving v6 published or open is a common half-fix.

## Build: defaults that match how Docker routes

**1. Do not publish** if only other containers need the service. Put them on a user-defined network and talk to `container_name:internal_port`. No host port, no DNAT, no extra WAN exposure.

**2. Bind to loopback** when only the host (or a reverse proxy on the host) should connect:

```bash
docker run \
  --publish 127.0.0.1:8080:80 \
  --publish '[::1]:8080:80' \
  nginx
```

Compose equivalent:

```yaml
services:
  web:
    image: nginx
    ports:
      - "127.0.0.1:8080:80"
      - "[::1]:8080:80"
```

Docker Engine releases **before 28.0.0** may still expose loopback-published ports to the same L2 segment in some setups. Upgrade before you treat loopback binding as a guarantee on shared L2 (some VPS “private” networks behave like LAN segments).

**3. Filter in `DOCKER-USER`** when something must be reachable from outside but not from everywhere—allow your home `/32`, Tailscale CGNAT range, or office egress, drop the rest. Place rules in **`DOCKER-USER`**, not after Docker’s terminal accept in `FORWARD`. Mirror policy for IPv6 if v6 is enabled on the host.

Example sketch (adjust interfaces and CIDRs; test on a clone):

```bash
# allow established
iptables -I DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
# allow from a trusted source to published ports
iptables -I DOCKER-USER -s 203.0.113.50/32 -j RETURN
# drop everything else hitting DOCKER-USER
iptables -A DOCKER-USER -j DROP
```

Persist with your distro’s supported method (iptables-persistent, nftables includes, or Ansible tasks)—Docker recreates its chains on restart; **`DOCKER-USER`** is the stable seam documented in Docker’s packet-filtering guides.

**4. Verify from another machine**, not from `ufw status` on the box alone.

## Verification: the second machine is the test

On the server, these are useful but insufficient:

```bash
sudo ufw status verbose
sudo iptables -L DOCKER-USER -n -v
sudo ss -tlnp | grep 8080
docker ps --format '{{.Ports}}'
```

They tell you what the host **believes**. They do not prove what the internet or your coffee-shop Wi‑Fi can reach.

From a **different network** (laptop on cellular, friend’s house, cheap VPS probe):

```bash
# expect connection refused or timeout if locked down
nc -vz YOUR_PUBLIC_IP 8080
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://YOUR_PUBLIC_IP:8080/
```

Run the same checks **before and after** policy changes. If loopback bind is the intent, the public probe should fail while `curl http://127.0.0.1:8080/` on the host succeeds. If `DOCKER-USER` allowlists one IP, probe from that IP (success) and from another (failure).

Document the probe command in your runbook next to the compose file. Green on the server is not proof.

## Docker publishing belongs in the network chapter

Typical hardening order is SSH-first, then basics, then network. Docker on a home server (Plex, a blog stack, an agent playground) is common, and UFW-first thinking breaks the day someone `--publish`es without reading the Docker section.

If containers run on the same machine that holds backups or SSH keys, publishing policy is not optional. It is the difference between "hardened the host" and "hardened the host except the thing I actually run." Ansible playbooks that reset UFW defaults but never touch compose publish lines recreate this gap on every run unless you add tasks or enforce loopback binds in inventory.

## Limits

Rootless Docker, CNI plugins, and Kubernetes netpol are different implementations of the same lesson: **the tool that owns the datapath owns the exposure map.** UFW is one lens; Docker is another. Swarm ingress and published NodePorts add yet another.

`DOCKER-USER` does not help if you `--network host` and the process listens on `0.0.0.0`. macvlan/ipvlan can put containers on the LAN like physical NICs—UFW on the host may not see that traffic the way you expect.

No single checklist row replaces a probe from outside. Treat exposure as a property of the **path**, not of one green status command.

## Sources

- Docker documentation on [packet filtering and Docker](https://docs.docker.com/engine/network/packet-filtering-firewalls/) (iptables/nftables interaction)
- Related: [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), [CrowdSec vs Fail2Ban: shared bans on a home box](/me/blog/crowdsec-or-fail2ban-for-a-home-box/)
