---
title: "Tailscale: a private mesh for agent hosts"
date: 2026-10-17
tags:
  - infrastructure
  - ai
  - security
summary: "Agent hosts need private reach without WAN ports. Tailscale’s WireGuard mesh, DERP fallback, and grants make that path concrete—plus a Hermes Desktop remote-gateway setup."
---

Every always-on agent host eventually hits the same ceiling: a laptop on untrusted Wi-Fi needs to reach a home GPU box, an MCP server, or a dashboard, and the old answers—port forwards, a reverse proxy on a public VPS, or an SSH tunnel that dies when the laptop sleeps—put services on paths they should never own. [Tailscale](https://tailscale.com/) is a WireGuard mesh that gives each device a stable private address and encrypts traffic end to end, so the home router never has to accept inbound WAN connections for that agent port.

Picture a coffee-shop laptop and a Mini PC tagged `tag:hermes` on the LAN. The laptop should open `http://100.x.y.z:9119` (or a MagicDNS name) as if both machines shared a private network. Without a mesh, someone stands up NGINX on a VPS solely to hairpin that traffic; that proxy then needs patches, certificates, and monitoring forever. With a tailnet, both sides dial out to coordination, negotiate a direct UDP path when NAT allows, and fall back to encrypted relays when it does not—still without DNAT on the house firewall.

That split—coordination for keys and policy, WireGuard for packets—is why agent fleets show up in Tailscale’s [secure AI agent connectivity](https://tailscale.com/use-cases/secure-ai-agent-connectivity) notes and in DIY setups that refuse to bind dashboards to `0.0.0.0` on the public WAN. Below: how a tailnet works, what “no open ports” actually means, how grants carve who may talk to whom, what changes when it is not just one person, why multi-agent hosts like the shape, and a concrete [Hermes Agent](https://hermes-agent.nousresearch.com/) remote-gateway path.

## What sits on a tailnet

A *tailnet* is a private Tailscale network. Install the client on a laptop, a phone, a home server, a VPS. Sign in with the same identity provider (GitHub, Google, Microsoft, Okta, and so on). Each machine gets a WireGuard keypair whose private key never leaves that node, a Tailscale IPv4 (and usually IPv6) in the `100.64.0.0/10` CGNAT range that survives LAN DHCP churn, and a MagicDNS name such as `home-gpu` or `home-gpu.tail-xxxx.ts.net`.

Traffic between nodes is encrypted end to end. A classic corporate VPN often climbs every packet to a concentrator and sends it back down. Tailscale’s mesh prefers a direct path between the two machines that are talking. The coordination server (`login.tailscale.com` in the hosted product) is a shared drop box for public keys, peer lists, and policy—not a place agent HTTP bodies land.

## Coordination proposes; nodes dispose of ciphertext

[Tailscale’s control and data plane docs](https://tailscale.com/docs/concepts/control-data-planes) draw a clean line. The *control plane* holds the device registry, authentication, peer public keys, packet filters computed from the ACL/grants file, DERP region maps, and admin console state. Clients keep a long-lived connection here so policy updates and peer discovery stay fresh. The *data plane* lives on each device: WireGuard encryption, routing, NAT traversal, failover when a path dies. Packet forwarding happens between peers.

[How Tailscale works](https://tailscale.com/blog/how-tailscale-works) is still the right mental model: WireGuard tunnels between endpoints, plus a coordination server that publishes “here is this peer’s public key and where it thinks it can be reached.” Impersonating a node means stealing that node’s private key. The coordination service never holds it.

## How a connection forms when NAT fights back

[Connection types](https://tailscale.com/docs/reference/connection-types) are about performance. Every path still uses WireGuard; none of them hand plaintext to a relay.

```text
1. Both already know each other’s public keys (from coordination).
2. They start talking through a DERP relay (easy path; works almost everywhere).
3. In parallel they try NAT traversal: discover external endpoints, punch UDP holes
   (STUN/ICE-flavoured tricks Tailscale documents as DISCO).
   DISCO here is Tailscale’s own UDP discovery protocol—not the Linux `disco` package and not a separate product you install; it runs inside the client while peers hunt for a direct path.
4. If a direct UDP tunnel comes up, they upgrade and stop paying DERP latency.
5. If both sides sit behind hard NAT, they may try a peer relay in the tailnet.
6. If that fails too, they stay on DERP. Still WireGuard end-to-end.
```

[DERP](https://tailscale.com/docs/reference/derp-servers) means Designated Encrypted Relay for Packets. DERP servers forward already-encrypted WireGuard datagrams (and discovery packets). They cannot decrypt traffic because they never see private keys ([encryption overview](https://tailscale.com/docs/concepts/tailscale-encryption)). Clients pick a home DERP by latency; the coordination service shares those choices so peers know where to find each other.

```text
laptop ──WireGuard (direct)──► home-gpu (tag:hermes)
   │                                │
   └── DERP relay only if NAT blocks direct

coordination (login.tailscale.com): keys + policy
                                    not Hermes chat bytes
```

Hard NAT (per-destination port mappings that outsiders cannot predict) is when a LAN demo falls back to relay. The tunnel still exists. Throughput and latency just look more like a TURN-style path than a LAN.

## The “no open ports” claim, precisely

People say “Tailscale means no open ports.” The precise claim is narrower: there is no port-forward on the home router and no public IP attached to the agent box for inbound SSH/HTTP. Devices behind CGNAT and hotel firewalls can still join. Discovery and fallback use outbound connections and relays.

Services still listen. Hermes binds `:9119`. SSH may listen on the Tailscale interface. `tailscale serve` can publish a local port to the *tailnet* only. Those are listeners on a private overlay, not WAN DNAT rules. Scan the public IP of the house and the agent port is not there.

[Funnel](https://tailscale.com/docs/features/tailscale-funnel) is the exception: it can expose something to the public internet through Tailscale’s edge. Serve without Funnel stays tailnet-local. For agent dashboards, Serve (or a bind to the Tailscale IP) with Funnel left off is the default unless public exposure is deliberate.

## Grants instead of a flat LAN

Default is deny. Membership in the tailnet does not mean everything may talk to everything unless policy says so. Older ACLs are network-layer allow lists. Newer grants are the preferred shape: sources, destinations, protocols/ports, and optional application capabilities in one place ([grants vs ACLs](https://tailscale.com/docs/reference/grants-vs-acls), [grants syntax](https://tailscale.com/docs/reference/syntax/grants)).

[Tags](https://tailscale.com/docs/features/tags) give non-user devices an identity: `tag:hermes`, `tag:mcp`, `tag:ci`. Auth keys can mint tagged nodes for servers so they are not owned by a human’s laptop session. Then grants speak in tags:

```json
{
  "tagOwners": {
    "tag:hermes": ["autogroup:admin"]
  },
  "grants": [
    {
      "src": ["autogroup:member"],
      "dst": ["tag:hermes"],
      "ip": ["tcp:9119"]
    },
    {
      "src": ["tag:hermes"],
      "dst": ["tag:mcp"],
      "ip": ["tcp:8080"]
    }
  ]
}
```

A stern system prompt does not replace a grant that never routes TCP to the MCP port. Who may reach what is decided in the policy file before the chat UI feels friendly.

## What changes when it is not just one person

On a Personal plan, MagicDNS is on by default. Useful patterns include laptop to home GPU, phone to NAS, an exit node so coffee-shop traffic egresses from home, a subnet router so the tailnet can reach a printer that cannot run Tailscale itself, and Serve for a dashboard on `https://home-gpu.tail-xxxx.ts.net` without Funnel.

At company scale the WireGuard mesh is the same. What changes is identity and audit: company IdP (Okta, Entra, Google Workspace), device posture checks, [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh) so SSH auth follows the tailnet identity instead of a pile of `authorized_keys` files, optional session recording, and policy groups. Pricing tiers talk about PAM, AI security, and ephemeral CI nodes. The product surface grows; the packet path is still WireGuard between nodes.

## Why agent fleets care about identity on the wire

One laptop running a chat UI is fine on localhost. Three workers, an MCP filesystem server, a browser box, and a scheduler are not. Without a mesh, each hop invents credentials. With a mesh:

- Each agent host (or each [tsnet](https://tailscale.com/blog/tsnet-reach-tailscale-without-root)-embedded binary) is a node with a Tailscale identity.
- MCP HTTP endpoints bind to Tailscale IPs or localhost + Serve; grants decide which agent tags may dial which ports.
- Peer identity can be checked via Tailscale’s LocalAPI `whois` instead of trusting a shared bearer token that leaked into a log.
- Blast radius shrinks with a policy edit: revoke a tag, remove a grant, disable a node in the admin console.

Community tools lean on that pattern. [cmesh](https://github.com/somoore/cmesh) is one example of delegation over the mesh with inbound policy; fleet TUIs probe agents over SSH after `tailscale status`. Tailscale’s own agent page adds MCP-as-node and tsnet as first-party language. The network layer does not replace tool gates inside the agent process. What it buys is a dashboard that is not sitting on the open internet while those gates get designed.

## What I’d wire: Tailscale + Hermes

[Hermes Agent](https://hermes-agent.nousresearch.com/) (Nous Research) is a self-hosted agent runtime with a Desktop app that can attach to a backend on another machine. Official Desktop docs call that backend a running `hermes serve` process and recommend Tailscale for trusted-network username/password auth ([Connecting to a remote backend](https://hermes-agent.nousresearch.com/docs/user-guide/desktop)).

### Put both machines on the same tailnet

On the Hermes host and on the laptop (Linux example; macOS/Windows use the app or package for the OS):

```bash
# Linux (official install script; prefer your distro package if you have one)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Approve the device in the admin console if policy requires it. On the Hermes host:

```bash
tailscale ip -4
tailscale status
```

Copy the `100.x.y.z` address (or the MagicDNS name). Tag the host `tag:hermes` in the admin console / policy if using the grant example above.

### Auth for a non-loopback dashboard

Non-loopback binds require an auth provider. For Tailscale-only reachability, username/password is what the docs call out for trusted networks. On the Hermes host, in `~/.hermes/.env` (mode `600`):

```bash
# Prefer a hash in production; plaintext password is the docs' quick path
export HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
export HERMES_DASHBOARD_BASIC_AUTH_PASSWORD='choose-a-strong-password'
export HERMES_DASHBOARD_BASIC_AUTH_SECRET="$(openssl rand -base64 32)"

# Persist those three into ~/.hermes/.env, then:
chmod 600 ~/.hermes/.env
```

A stable `HERMES_DASHBOARD_BASIC_AUTH_SECRET` keeps Desktop sessions valid across restarts. Without it the signing key rotates on boot and sign-in is required again every time.

Hash instead of plaintext password when possible:

```bash
python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"
# set HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH=... and omit the plaintext password
```

### Bind the backend to the Tailscale IP

Official guidance: bind to the machine’s Tailscale IP so only the tailnet path is intended, then point Desktop at `http://<that-ip>:9119`.

```bash
TS_IP="$(tailscale ip -4)"
hermes serve --host "$TS_IP" --port 9119
```

Keep that process up (`systemd`, `tmux`, or another supervisor). Messaging gateways (Telegram, Discord, and so on) are a separate long-running process if used; Desktop talks to `hermes serve`, not to the messaging gateway.

Alternative shape from the [web dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard) docs: `hermes dashboard --host 0.0.0.0 --port 9119 --no-open` (or the Tailscale IP) with the same auth env. Desktop’s remote path is documented against `hermes serve` first; use one backend story and stick to it so Host-header / peer-IP checks stay boring.

Check the gate from the laptop (on the tailnet):

```bash
curl -s "http://${TS_IP}:9119/api/status" | jq '.auth_required, .auth_providers'
# want: true  and  ["basic"]  (among providers)
```

### Point Hermes Desktop at the remote gateway

On the laptop: Settings → Gateways → add Remote gateway. URL `http://100.x.y.z:9119` (or MagicDNS). Sign in with the basic-auth user. Save, test HTTP and WebSocket if the UI offers it, then select that connection. Multi-gateway fleets are described in [Connecting Desktop to Many Hermes Instances](https://hermes-agent.nousresearch.com/docs/user-guide/multi-connection-desktop).

### Optional: Serve + hermes-tailscale plugin

[hermes-tailscale](https://hermes-agent.nousresearch.com/docs/plugins/hermes-tailscale) is a community Desktop plugin: roster from `tailscale status --json`, copy SSH lines, Taildrop, and `tailscale serve --bg` for the local port (default 9119) without Funnel. Install path is under `~/.hermes/desktop-plugins/hermes-tailscale/`. It shells to the local Tailscale CLI; no Tailscale API token. The plugin’s own docs warn that a successful Serve check only proves *something* listens on the port, not that it is Hermes.

Serve-from-loopback pattern (tailnet HTTPS name, still needs dashboard auth):

```bash
# On the host: dashboard on loopback, then publish to the tailnet only
hermes dashboard --host 127.0.0.1 --port 9119 --no-open
tailscale serve --bg 9119
```

Set `dashboard.public_url` to the exact `https://….ts.net` origin Serve prints if the dashboard docs ask for it. Do not turn on Funnel unless public exposure is intended.

### Grants that match the setup

In the Tailscale ACL/grants editor, prefer something narrow over sharing every port with everyone on the tailnet:

```json
{
  "grants": [
    {
      "src": ["autogroup:member"],
      "dst": ["tag:hermes"],
      "ip": ["tcp:9119"]
    }
  ]
}
```

SSH to the box can be a second grant on port 22, or Tailscale SSH rules if that feature is enabled. Agent tool permissions inside Hermes stay Hermes’ problem. The mesh only decides who may open the TCP path.

## Limits and what still sits outside

- Funnel vs Serve: Serve is tailnet-local; Funnel is public. Agent dashboards almost never want Funnel by accident.
- Bind address and Host header: loopback binds reject remote Desktop. Binding `0.0.0.0` or the Tailscale IP with auth on is the documented path; mismatched Host headers show up as WebSocket failures after a green status probe.
- Coordination dependency: peers need the control plane for key/policy updates. DERP maps are cached so brief outages are survivable, but it is still a cloud control plane for the hosted product. Headscale is the self-hosted coordination alternative if that bothers you (out of scope here).
- DERP days: hard NAT means relay latency. Fine for chat control planes; measure before streaming huge artifacts across the mesh.
- Over-broad grants: a tag on every server and `ip: ["*"]` recreates a flat LAN. Start from one port.
- Auth on the dashboard: Tailscale is not a substitute for Hermes’ auth gate on a non-loopback bind. Use both layers.

## What’s next

Run `tailscale status` and `hermes serve` on a box you already own, then point Desktop at the Tailscale IP before touching Funnel or public OAuth. The mesh is the network identity layer; tool gates and approval still live in the agent process.

## Sources

- [How Tailscale works](https://tailscale.com/blog/how-tailscale-works)
- [Control and data planes](https://tailscale.com/docs/concepts/control-data-planes)
- [Connection types](https://tailscale.com/docs/reference/connection-types)
- [DERP servers](https://tailscale.com/docs/reference/derp-servers)
- [Tailscale encryption](https://tailscale.com/docs/concepts/tailscale-encryption)
- [Grants vs ACLs](https://tailscale.com/docs/reference/grants-vs-acls) · [Grants syntax](https://tailscale.com/docs/reference/syntax/grants) · [Tags](https://tailscale.com/docs/features/tags)
- [Secure AI agent connectivity](https://tailscale.com/use-cases/secure-ai-agent-connectivity)
- [Tailscale SSH](https://tailscale.com/docs/features/tailscale-ssh) · [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve) · [Funnel](https://tailscale.com/docs/features/tailscale-funnel)
- [Hermes Desktop (remote backend)](https://hermes-agent.nousresearch.com/docs/user-guide/desktop) · [Web dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard) · [Multi-connection Desktop](https://hermes-agent.nousresearch.com/docs/user-guide/multi-connection-desktop)
- [hermes-tailscale plugin](https://hermes-agent.nousresearch.com/docs/plugins/hermes-tailscale)
- Related: [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/)
