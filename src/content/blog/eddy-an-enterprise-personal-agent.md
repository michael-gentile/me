---
title: "Eddy: an enterprise personal agent"
date: 2026-09-24
tags:
  - ai
summary: "Muse, OpenClaw, and Grok Bot all give an agent a computer. What if that computer lived in your cloud, under SSO, with connectors to your systems? A conceptual sketch of Eddy—and what security would have to look like."
---

Every enterprise that watches Muse or Grok Bot eventually asks the same question: if each staffer gets a dedicated agent computer, why does that computer have to live in a vendor’s cloud with connectors you cannot fully scope? Consumer agents proved the shape—chat, harness, browser, tools—but the hard part is Jordan in operations drafting a ServiceNow ticket without Riley in finance’s payroll note ever entering the retrieval set. **Eddy** is a conceptual sketch for that answer: one named agent per Entra identity, VM in *your* cloud, SSO on the way in, connectors that act as the user with a strict subset of permissions.

Picture Jordan in Teams asking Eddy to turn a thread into a draft ticket, while Riley’s Eddy never sees finance APIs beyond what Riley’s groups allow. I wrote about the consumer pattern in Muse’s per-user VM; this note is the enterprise wiring—your identity, your systems, your kill switch. Staff already live in Teams, email, ServiceNow, and SharePoint; many shops have Azure or VMware capacity sitting warm. Below: the loop every product shares, how Eddy would differ from Muse, OpenClaw, and Grok Bot, what spinning a VM per user looks like, controls that have to exist before a pilot, and jobs worth trying first.

## One loop hides behind every brand

Strip the logos and the architecture repeats:

```text
  chat (Teams / Slack / app)
         |
         v
  harness (agent loop, tools, memory, skills)
         |
         v
  computer (browser, shell, filesystem)
         |
         +---> connectors / MCP / APIs
         |
         v
  approval / review agent (before risky egress)
```

The model samples the next step. The harness decides whether a tool runs. The computer is where browsing and files happen. Connectors reach real systems. A separate review path—Sentinel on Muse, Auto-review on Grok Bot, allowlists on OpenClaw—owns send, buy, and delete-class actions. The model proposes; the process disposes.

| | Muse | OpenClaw | Grok Bot |
| --- | --- | --- | --- |
| Computer | Per-user Meta Secure VM | Your machine, VPS, or isolated cell | Cursor-hosted cloud computer (user-scoped; a person’s Bots share it) |
| Model | Muse Spark | Bring your own | Grok / Cursor stack |
| Gate | Sentinel + credential surrogates | Allowlists, sandbox, operator policy | Auto-review + allow/block lists |
| Enterprise today | Consumer product + connectors | Self-host; one trust boundary per Gateway | Teams/Enterprise: SSO, SCIM, network controls, recording; no customer-owned VM |

Muse proved per-user isolation at consumer scale. OpenClaw is explicit that one Gateway is one trust boundary—hostile multi-tenancy means separate cells, not a shared agent. Grok Bot adds team admin knobs (SSO, SCIM, Network Controls, action recording) while the computer still lives in someone else’s cloud. Eddy is the thought experiment where the computer is yours.

## Eddy is one agent per identity, not one bot for the company

Eddy is Jordan’s agent, and Riley’s, and every other staffer’s—**one Eddy per Entra identity**, not one shared bot for the whole corporation. Jordan talks to Eddy in Teams the way people talk to Muse in WhatsApp. Eddy has a persistent workspace on a VM the org provisions. An org policy pack lands in that workspace (allowed tools, tone, citation rules, “never invent policy”). Jordan can add prefs. Optional specialist sub-agents under the same user computer—inbox triage, ServiceNow drafts—get tighter tool allowlists, same idea as Grok Bot’s specialist Bots sharing one box.

Connectors I would wire first, all scoped by group membership the app looks up after SSO:

- Exchange / Graph mail and calendar (read by default; send behind approval)
- SharePoint / OneDrive sites the user’s groups already grant
- ServiceNow (create draft tickets; publish behind approval)
- Finance APIs read-only unless a second approver exists
- Internal wiki / policy corpus with the same audience ACLs as the tiny policy assistant sketch

Eddy does not get a standing “IT admin” identity. Eddy acts as Jordan, with a **subset** of Jordan’s permissions, enforced at the connector proxy—not as a sentence in a system prompt.

## The lifecycle is the product, not the idle VM

Idle cloud capacity is the substrate. What staff experience is provision, wake, and teardown:

```text
  first Teams message to Eddy
            |
            v
  control plane: create or wake VM
            |
            v
  gold image boot (Linux + browser + agent runtime)
            |
            v
  SSO access broker (only inbound path)
            |
            v
  mount encrypted home (workspace, memory)
            |
            v
  start runtime cell + review agent
            |
            v
  register connectors (surrogate tokens only)
```

**Gold image.** Hardened Linux, browser, agent harness. No corp credentials baked in, no personal password-manager profile. Signed and rebuilt on a schedule so image drift does not become the incident.

**Provision.** Azure VM, OpenShift Virtualization, or VMware—whatever you already run. First login creates the box; later logins wake a hibernated one. Community measurements of Muse-class free boxes land around 2 vCPUs and 8 GB RAM with a chunky home disk. That class is boring infrastructure, which is the point. Hibernate when idle. Pool hosts. Destroy on SCIM offboarding.

**Network.** Put the VM in an untrusted VNet. Default-deny egress. Allowlist approved SaaS and private endpoints (Graph, ServiceNow, approved model inference). No path to the open internet unless a change board said so. NVIDIA’s Secure Agent Workspace reference design is blunt about this: the access broker is the trust boundary; the endpoint is a presentation surface.

**Secrets.** Vault or Key Vault holds Graph tokens and API keys. A credential proxy on the egress path swaps surrogates for real credentials after the review agent allows the call—same idea as Muse’s authd/Sentinel split. The runtime cell never sees the real token, so a prompt-injected “exfiltrate my OAuth secret” has nothing to steal.

**Persistence.** I would default Eddy to a **persistent per-user** home disk so memory compounds (how Muse and Grok Bot feel useful), with hibernate for cost. Ephemeral-per-session VMs are the stricter residual-risk option when the threat model hates durable agent state. Say which one you picked when you write the threat model down.

**Kill switch.** SSO revoke drops the broker session. Control plane can power off or wipe the VM in an incident. Drill it once before go-live.

## Controls have to survive a table argument

| Control | What it actually does | Residual risk |
| --- | --- | --- |
| SSO + SCIM offboarding | Identity is Entra/Okta; revoke kills the broker and tears down the box | Stale Graph consent if app registrations aren’t cleaned |
| One user per VM | No shared agent process across staff | Host compromise still a blast radius; patch the gold image |
| Separate Gateways / cells for separate trust boundaries | OpenClaw’s rule: don’t co-host hostile tenants on one agent | Ops cost; people will ask to “just share one” |
| Credential proxy + short-lived scopes | Model never holds Graph tokens | Proxy is a concentrated trust point; audit it |
| Default-deny egress + DLP/CASB | Outbound only to allowlisted hosts; inspect uploads | Allowlist creep; DLP misses paraphrases |
| Human approval for send / write / pay | Dangerous tools are not bound to the model | Rubber-stamping when the UI hides the payload |
| Review agent (Sentinel / Auto-review twin) | Second policy path before egress | Another model; false allows under pressure |
| Quarantine untrusted mail/wiki text | Dual-step: summarize without tools, then decide | Cost; summarizer can still distort |
| Routed inference to approved endpoints | Residencies and “which model saw this” are answerable | Shadow connectors if someone pastes into a public chat UI |
| SIEM of proposals, approvals, tool calls | You can explain a bad Tuesday | Logs become a sensitive store; retention vs eDiscovery |

Prompt injection through email and SharePoint is the enterprise version of treating every message Eddy reads as untrusted input: once Eddy can click and send, architecture—not a stern system prompt—owns the blast radius. Credential surrogates and approval gates reduce damage but do not make the model “safe.”

Over-broad Graph consent is how pilots die quietly. If the connector asks for `Mail.ReadWrite` across the tenant when Jordan only needed drafts in one mailbox, you have built a lateral-move machine with a friendly name.

## A pilot should prove audience boundaries, not demos

Concrete jobs I would want in a pilot, all gated:

- Draft a ServiceNow ticket from a Teams thread, with a link back to the messages, and wait for Jordan to hit publish.
- Pull a brief from SharePoint sites Jordan’s group can already read; refuse sites outside that ACL; cite document IDs.
- Propose meeting times across calendars; create the invite only after approval.
- Overnight research pack that stays inside the egress allowlist and lands as a markdown file in Jordan’s Eddy home for morning review.
- Translate a long policy PDF into a staff FAQ **without** promoting visitor-blog text into rules.

The upside is cutting the latency of busywork, and every workspace carrying the same org policy pack. Judgment stays with the human. Eddy does not run the company. Eddy is a staffer-shaped computer that already knows which SharePoint sites Jordan may touch, if you wired the ACL correctly.

A single shared corporate bot is the wrong default. Shared state plus tool authority across operations and finance collapses the audience boundary the Jordan/Riley walk-through keeps teaching. One Eddy per identity keeps the blast radius mapped to a person you can offboard.

## I would not turn the key without this checklist

1. Per-user VM (or equivalent strong isolation), gold image, hibernate, SCIM destroy.
2. Credential proxy; no long-lived secrets in the runtime cell.
3. Default-deny egress with a written allowlist.
4. Approval UI that shows the exact payload (recipient, body, ticket fields) before send/write.
5. No `send_email` / publish / pay tool bound directly to model output.
6. Frozen eval set: Jordan cannot retrieve finance payroll; Riley can; injection in a fake email does not fire a send.
7. SIEM fields for who approved what, and a kill switch drill once before go-live.

If I were to guess, Microsoft is likely cooking something very similar to Muse or Grok Bot, but for their enterprise Copilot product.

## Sources

- [Muse: a personal agent with its own computer](/me/blog/muse-and-the-personal-agent/) (prior note on this site)
- [How We Built Safety Into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse) (Meta AI Research)
- [OpenClaw security](https://docs.openclaw.ai/gateway/security) and [multi-tenant hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)
- [Grok Bot overview](https://docs.x.ai/grok-bot/overview), [security](https://cursor.com/docs/grok-bot/security), [Teams and Enterprise](https://cursor.com/docs/grok-bot/teams)
- [NVIDIA Secure Agent Workspace reference architecture](https://docs.nvidia.com/enterprise-reference-architectures/secure-agent-workspace-reference-design/latest/reference-architecture.html)
- Related: [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Prompt injection: the webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/)
