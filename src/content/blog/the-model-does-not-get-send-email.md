---
title: "The model does not get send_email"
date: 2026-07-28
tags:
  - llm
  - architecture
summary: "Tool-calling is the model emitting JSON. Your process decides whether to run it. Weather can pass a gate. Email and delete cannot, even if the model asked."
---

Excessive agency: the model's text becomes a command. Least privilege and approval live in *your* code, because a sterner system prompt doesn't stop HTTP. The tools in this write-up are mocked. Nothing is sent or deleted.

## The model proposes, the process disposes

On the APIs this post cares about, a "tool call" is a JSON object the model sampled: a name and an arguments blob. OpenAI-style it looks like `function.name` plus `function.arguments` as a string. Other vendors flatten it. Either way, it's a *proposal*. HTTP to the mail server happens only if your process parses that object, checks a gate, and then makes the call.

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

Three user sentences: weather in Hamilton; email my summary to the whole department; please delete my account. Weather should be allowed. Email and delete should stop at the gate even if the model requested them.

Change the wording ("get rid of my profile"). The model may still request `delete_account`. The gate must not care about wording. It cares about the tool name, which is the whole reason the gate lives in Python after `json.loads` and not in a paragraph that says "please don't delete accounts."

If `json.loads` throws, that's a block. Don't retry the model until it emits a call you were about to refuse. A second sample can be a different proposal. Invalid JSON isn't a hint to keep asking.

## Allowlist, not a denylist you hope is complete

The snippet above denies two names and allows weather. A denylist fails open the day someone adds `send_slack` or `close_ticket` to the schema and forgets the gate. An allowlist is the other way around: the process will execute only names you listed, and everything else prints `gate: unknown tool; not executed`.

Dangerous tools shouldn't be in the model's schema at all if the product can live without them. A schema the model can see is a menu. If `send_email` isn't on the menu, the model can still *write* that it wants to send mail. Your process never sees a callable.

When email has to exist, put it behind a human. Preview the payload: recipients, subject, body, as text, not as a rendered HTML pane. Name the people. A rubber-stamp "Approve" on a collapsed JSON blob is how you get a department-wide send, which is the horror version of "email my summary to the whole department" actually firing.

I'd fail a design that binds `send_email` to the model with no second step. The model never calls a tool directly. Your process does.

## Read-only is still a privilege

`get_weather` is a toy. `get_employee_record` is not. Least privilege applies to the allowlist, not only to the deny list. A recreation clerk's session shouldn't be able to fetch HR rows even if the model asked politely and the JSON was valid.

The identity that matters is the one your app already authenticated (SSO, session cookie). Don't take `user_id` from the model's arguments and pass it to the database. The model is untrusted input. So is anything it copied from the user message.

## Sources

- Tool-calling as JSON the application may refuse to execute
- OWASP excessive agency as a product control, not a prompt
