---
title: "Uber ADR: sensor the agent session"
date: 2026-10-13
tags:
  - ai
  - security
summary: "Uber’s ADR closes the gap EDR leaves on coding agents: parse the session (prompt → tools), triage cheaply, then spend LLM judgment on the suspicious slice. Notes on the open Sensor, Bench, and Detector."
---

On a laptop running Cursor or Claude Code, classic EDR often sees a file write and a network call. The user prompt that started the turn, the agent’s plan, and which MCP tool ran with which arguments usually never show up. [A control matrix, including leftover risk](/me/blog/controls-i-would-require/) assumes you can see what happened. That assumption breaks when the endpoint only logs outcomes.

[Uber’s ADR](https://github.com/uber/ADR) (Agentic AI Detection and Response) is aimed at that hole. The MLSys 2026 paper is [on arXiv](https://arxiv.org/abs/2605.17380). Sensor, Discovery, ADR-Bench, and the Detector are open; Explorer and full Prevention are not.

## What EDR misses

EDR watches outcomes. ADR rebuilds the agent session, then runs expensive LLM judgment only on sessions triage flags. For coding agents on MCP, the production pitch is observe the session and escalate the suspicious ones.

Their paper’s example is the one I keep: the user asks to summarize a Jira ticket; the agent reads SSH keys and fires an HTTP request. EDR sees a read and a POST. The Sensor transcript is what shows the mismatch.

## What the Sensor records

The open [ADR Sensor](https://github.com/uber/ADR/tree/main/Sensor) is a Python library (`adr-sensor` on PyPI). It is not an LLM gateway. It reads each product’s local caches and folds them into one `AgentEvent` shape: `session_id`, `timestamp`, `chat_history`, `tools`, `model`.

From their support table, the ones I care about first are Cursor (`state.vscdb` SQLite), Claude Code (JSONL under `~/.claude/projects/`, including subagent transcripts with `parent_session_id`), Codex CLI, GitHub Copilot CLI (`~/.copilot/session-state/`), and Gemini CLI journals. Cline, Warp, opencode, Claude Desktop, DeepSeek Harness, and Antigravity are in there too. Default lookback is 14 days by file mtime. On Claude Code, top-level tool argument strings and tool results stop at 1,000 characters; a bad line is skipped and the rest of the file still counts. So the detector gets a usable causal chain, clipped payloads, and no live intercept. Export is JSON/JSONL or OTLP toward a collector or SIEM.

## Cheap triage, expensive judgment

Ten thousand sessions a day makes “run a strong reasoning model on every event” a bill. ADR’s Detector splits the work:

1. **Triage.** Cheap model, high recall. Doubt means escalate. Their open Detection config uses `gpt-4o` here. `config_detector.yaml` can opt into a structured contract (`BENIGN_EXIT` / `ESCALATE`); free-form triage is the default.
2. **Reasoning.** A deeper agent on the escalated sessions. In the OSS Detection tree that agent is `claude-sonnet-4-6` through Claude CLI, with MCP context providers for source-code inspection (`get_source_code`), threat intelligence, and policy checks.

Offline, an Explorer red-teams the detector and drops hard examples into threat intel for Tier 2. That engine is in the paper and missing from the public zip. Prevention (inline credential hooks) is mostly “stay tuned” in the README. Cloning the repo gets you Sensor, Bench, and Detector research code, not Uber’s full production stack.

## Production and bench numbers

Uber’s write-up covers about ten months: more than 7,200 hosts, more than 10,000 agent sessions a day, hundreds of credential exposures across 26 categories, and a shift-left prevention layer they report at 97.2% precision (206 blocked across 212 unique credentials).

On ADR-Bench they chase precision for SOC reasons: zero false positives on their reported run, about two-thirds of attacks caught, better F1 than baselines whose false-positive rates they say make incident response unusable. The open [Detection](https://github.com/uber/ADR/tree/main/Detection) tree ships ADR-Bench (`tasks.json`: 304 scenarios, 261 benign / 43 malicious), 134 MCP server definitions, and runnable `adr` vs `llamafirewall` detectors. Their README calls the benchmark a research artifact for isolated environments: synthetic credentials, emulated vulnerable MCP servers, pinned deps with known CVEs that only make sense under that threat model.

AgentDojo in the paper (all attacks caught, three false alarms on 93 tasks) is a public prompt-injection check next to the enterprise-shaped bench. I would keep those scores on separate slides.

## What is in the zip

| Piece | In the open repo? | Job |
| --- | --- | --- |
| Discovery | Yes | Inventory agents, IDE extensions, local runtimes, MCP servers on an endpoint |
| Sensor | Yes | Parse local agent logs → unified session schema |
| ADR-Bench + Detector | Yes (research) | Dual-agent detection, baselines, figure scripts |
| Explorer | No | Offline evolutionary red team → threat intel |
| Prevention | Not fully | Block credential leaks before they leave |

If you install one thing, put the Sensor on a machine that already runs Cursor or Claude Code. The normalized session is the thing worth staring at.

## Keeping the harness

ADR detects, and in Uber’s production it also prevents some leaks. You still need the harness around the model.

Least-privilege tools and human gates stay in the app, same as [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/). Catching a bad session after the tool ran helps. Keeping `send_email` off the model costs less.

Sensor output is another sensitive document store: prompts, reasoning, tool args. Who can read them, how long they live, and which region they sit in belong on the threat model next to the LLM vendor.

Zero false positives on a bench is a SOC choice. They miss some attacks rather than drown analysts. Residual risk is that missed third, plus model-on-model detection that drifts when you swap triage or reasoning models.

Uber prefers cache parsers over a network LLM/MCP gateway because a gateway loses environmental context and fights streaming. That matches coding agents with fat local state. For a customer-facing support agent you own end to end, I might still start with a gateway. Write down which topology you picked.

Without prompt → tools → outcome, agent risk is mostly file and network noise. The open Sensor makes that chain concrete for coding tools a lot of us already run. The two-tier Detector is how they keep the LLM bill from eating the SOC. I would read the paper, run the Sensor once on a laptop I own, and keep the habits in [A control matrix, including leftover risk](/me/blog/controls-i-would-require/). The Detection package’s “not for production” warning is doing real work.

## Sources

- [uber/ADR](https://github.com/uber/ADR) (GitHub)
- [ADR: An Agentic Detection System for Enterprise Agentic AI Security](https://arxiv.org/abs/2605.17380) (arXiv abs/2605.17380)
- [Sensor README](https://github.com/uber/ADR/blob/main/Sensor/README.md)
- [Detection README](https://github.com/uber/ADR/blob/main/Detection/README.md)
- Earlier notes: [A control matrix, including leftover risk](/me/blog/controls-i-would-require/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/)
