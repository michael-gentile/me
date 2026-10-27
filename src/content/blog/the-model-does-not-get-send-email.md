---
title: "Tool calling: the model does not get send_email"
date: 2026-07-28
tags:
  - ai
summary: "I traced tool-calling until the only thing that actually runs HTTP is my process after JSON parse; this post is the allowlist gate that lets weather through and blocks email and delete even when the model asks."
---

The trade-off every tool-calling demo invites is convenience versus custody: the API makes it look as if the model “called” the mail server, and the only thing that actually runs HTTP is your process after it parses JSON. I traced that path on a minimal Python gate with mocked tools—weather may pass, email and delete stop even when the model asks—because least privilege cannot live in a sterner system prompt alone ([OWASP excessive agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/)). Nothing in this write-up is sent or deleted.

Below: what a tool call really is on the wire, allowlists versus denylists for names your code will ever execute, and why read-only tools still need session identity.

**Tool calling** (function calling) is a contract between your application and the model: you expose a schema of names and parameters; the model may emit a structured message choosing one. **Execution** is always your code's job. **Excessive agency** is the class of bugs where the product treats model output as authorization.

## The model proposes; your process executes

On the APIs this post cares about, a “tool call” is a JSON object the model sampled: a name and an arguments blob. OpenAI-style it is `function.name` plus `function.arguments` as a string. Other vendors flatten the shape. Either way it is a *proposal*. HTTP to the mail server happens only if your process parses that object, checks a gate, and then makes the call.

Ask the model to pick a tool as JSON only: `get_weather`, `send_email`, `delete_account`, or `none`. Then a gate in Python allows weather (mocked) and refuses to execute email or delete without approval.

```python
payload = json.loads(raw)
tool = payload.get("tool")
if tool in {"send_email", "delete_account"}:
    print(f"gate: {tool} requires approval; not executed")
    return
if tool == "get_weather":
    print("gate: would call get_weather(...) [mocked]")
```

Three user sentences: weather in Hamilton; email my summary to everyone on this list; please delete my account. Weather should be allowed. Email and delete should stop at the gate even if the model requested them.

Change the wording (“get rid of my profile”). The model may still request `delete_account`. The gate must not care about wording. It cares about the tool name—which is why the gate lives in Python after `json.loads`, not in a paragraph that says “please don’t delete accounts.”

If `json.loads` throws, that is a block. Do not retry the model until it emits a call you were about to refuse. A second sample is a different proposal. Invalid JSON is not a hint to keep asking.

### Worked example: streaming and partial JSON

Many SDKs deliver tool arguments in chunks. Your gate should run only on a **complete**, validated payload—either the vendor's "tool_calls finished" event or your own buffer once the JSON parses. Partial `{"tool":"send_emai` must not trigger half an SMTP session.

Pseudo-flow:

1. Accumulate assistant message until the transport marks the tool call complete.
2. `json.loads` the arguments string; on failure, log and return a tool error to the model without executing anything.
3. Normalize the tool name (case, aliases) in one function so every path uses the same allowlist.
4. Dispatch only if the name is allowlisted; otherwise return `error: unknown_tool` to the model.

Verification: unit tests feed malformed JSON, wrong tool names, and adversarial names (`send_email\n`). Expect zero side effects—mock SMTP and mock HTTP should never be called.

## Allowlist beats a denylist you hope is complete

The snippet above denies two names and allows weather. A denylist fails open the day someone adds `send_slack` or `close_ticket` to the schema and forgets the gate. An allowlist inverts that: the process executes only names you listed; everything else prints `gate: unknown tool; not executed`.

```python
ALLOWED = {"get_weather", "none"}

def dispatch(tool: str, args: dict) -> None:
    if tool not in ALLOWED:
        print(f"gate: unknown tool {tool!r}; not executed")
        return
    if tool == "get_weather":
        print("gate: would call get_weather(...) [mocked]")
```

Dangerous tools should not appear in the model’s schema at all if the product can live without them. A schema the model can see is a menu. If `send_email` is not on the menu, the model can still *write* that it wants to send mail. Your process never sees a callable.

When email has to exist, put it behind a human. Preview the payload: recipients, subject, body—as text, not as a rendered HTML pane. Name the people. A rubber-stamp “Approve” on collapsed JSON is how “email my summary to everyone” becomes a blast send.

I would fail a design that binds `send_email` to the model with no second step. The model never calls a tool directly. Your process does.

### Human-in-the-loop verification

Before any real send:

1. Render recipients as a sorted, deduplicated list—no BCC surprises hidden in args.
2. Show subject and plain-text body; reject HTML bodies from the model unless you sanitize with a known library and still display text.
3. Require an explicit action tied to the session user, not "the model said approve."
4. Log proposal hash, approver id, and sent message id for audit.

**Limits:** humans rubber-stamp. Rate-limit sends per session. Block external domains for internal assistants. Prompt injection can still trick the model into *proposing* a send; the gate plus human review stops execution, not intent.

## Read-only is still a privilege

`get_weather` is a toy. `get_private_note` is not. Least privilege applies to the allowlist, not only to the deny list. A guest session should not fetch household rent rows even if the model asked politely and the JSON was valid.

The identity that matters is the one your app already authenticated—session cookie, sign-in token. Do not take `user_id` from the model’s arguments and pass it to the database. The model is untrusted input. So is anything it copied from the user message.

### Worked example: IDOR via tool args

Bad pattern:

```python
def get_note(user_id: str, note_id: str):
    return db.notes.find(user_id=user_id, id=note_id)
```

The model sends `user_id: "admin"` because the user said "show admin's note." Good pattern:

```python
def get_note(session: Session, note_id: str):
    return db.notes.find(user_id=session.user_id, id=note_id)
```

Verification: integration tests with two sessions; assert cross-user `note_id` returns 404 or forbidden even when the model supplies another user's id in arguments.

## Schema design reduces temptation

- Split **read** tools from **write** tools across different agents or different deployments.
- Use narrow tools (`list_my_open_tickets`) instead of generic SQL.
- Version schemas; reject unknown tool names at the API gateway before they reach business logic.
- Cap argument size and array lengths so "email everyone" cannot embed ten thousand recipients in JSON without tripping validation.

## Observability and failure modes

Log every proposed tool name, allow/deny decision, and execution result (redact PII). Metrics: `tool_denied_total`, `tool_approval_pending`, `json_parse_errors`. Alerts on spikes in denied delete or send proposals—may indicate prompt injection campaigns.

**Limits of gates:** they do not stop a malicious **developer** from wiring `send_email` without a gate. Code review and feature flags matter. Gates also do not help if the allowlisted tool is itself too powerful (arbitrary shell). Shrink tools until the blast radius matches the product's trust level.

## Testing matrix (minimal)

| Input | Expected |
| ----- | -------- |
| Valid weather JSON | Mock weather invoked |
| `send_email` proposal | Denied, no SMTP |
| `delete_account` proposal | Denied, no API call |
| Invalid JSON | Denied, no retry loop |
| Unknown tool name | Denied |
| Weather with extra fields | Policy: strip or reject per schema |

Run the matrix in CI without network; mocks prove the gate, not the vendor API.

## Sources

- [OpenAI function calling](https://platform.openai.com/docs/guides/function-calling) (tool-calling as JSON the application may refuse to execute)
- [OWASP LLM06: Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/) (a product control, not a prompt)
- Related: [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/), [The webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/)
