---
title: "UFW said deny; Docker published anyway"
date: 2026-09-22
tags:
  - linux
  - security
summary: "Published container ports bypass UFW INPUT. A green firewall UI is not a complete map of what the internet can reach."
---

I treat `sudo ufw status` like a dashboard widget: useful, not sufficient. Any serious home-server hardening path spends real ink on **Docker and UFW** because the failure mode is quiet. Default deny on incoming, no allow rule for 8080, and nginx is still reachable because Docker DNAT put the packet on `FORWARD`, not `INPUT`.

Same class of mistake as trusting similarity without an ACL: the control you looked at was never on the path the traffic took. I wrote about that for RAG in [The nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/). Here the retriever is your firewall status line and the leak is bridge networking.

## What actually happens

Rootful Docker Engine on a bridge network installs its own iptables/nftables rules for NAT and publishing. A run like:

```bash
docker run --publish 8080:80 nginx
```

binds the container's port 80 to **every** host address on 8080 unless you narrow it. UFW mostly manages `INPUT`. Published ports are handled in Docker chains and `FORWARD`. So `sudo ufw deny 8080/tcp` can leave the service world-visible anyway.

Good write-ups are explicit: **do not assume** a UFW deny makes a published port unreachable. They also warn that `ufw status` does not show Docker-created rules, so it is not a complete picture of exposure.

Host network mode, macvlan, ipvlan, rootless, Swarm, and native nftables backends differ. The mental model still holds: ask which path a packet takes before you celebrate a deny rule.

## Safe defaults I would actually use

1. **Do not publish** if only other containers need the service. Put them on a user-defined network and talk to `container_name:internal_port`.

2. **Bind to loopback** when only the host (or a reverse proxy on the host) should connect:

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

Docker Engine releases **before 28.0.0** may still expose loopback-published ports to the same L2 segment. Upgrade before you treat loopback binding as a guarantee.

3. **Filter in `DOCKER-USER`** when something must be reachable from outside but not from everywhere. User rules belong in `DOCKER-USER`, not at the tail of `FORWARD` where Docker's accept rules already won. If IPv6 is enabled, mirror policy in `ip6tables` or you fixed IPv4 and left v6 open.

4. **Verify from another machine**, not from `ufw status` on the box. `curl` from a laptop on a different network, or a cheap VPS probe. Green on the server is not proof.

## How this fits the rest of the stack

Typical order is SSH-first, then basics, then network. Docker on a home server (Plex, a blog stack, an agent playground) is common. UFW-first thinking breaks the day someone `--publish`es without reading the Docker section.

If you run containers on the same machine that holds backups or SSH keys, this is not optional. It is the difference between "I hardened the host" and "I hardened the host except the thing I actually run."

## Sources

- Docker documentation on [packet filtering and Docker](https://docs.docker.com/engine/network/packet-filtering-firewalls/) (iptables/nftables interaction)
- Related: [The nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)
