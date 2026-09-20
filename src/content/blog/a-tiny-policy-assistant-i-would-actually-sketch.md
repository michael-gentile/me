---
title: "A tiny policy assistant"
date: 2026-08-23
tags:
  - llm
  - architecture
summary: "A weekend CLI: fake logins, two made-up policy notes, retrieval that respects audience, and a send_email button that never fires. Offline on purpose."
---

I got tired of five separate notes, so I glued them into one weekend CLI. Fake logins, two made-up policy files, and a send_email button that never sends. Who is asking, which notes they may see, whether the answer is grounded, and whether "send this by email" is allowed to become a send.

There's no ChatGPT or Claude key in this sketch. The traces below are from an **offline** assistant: keyword overlap instead of embeddings, extractive sentences instead of a chat model, gates in Python. A live model can sit in the same slots later. It doesn't replace the slots, which is the whole reason Alex's payday dies in Python and not in a paragraph.

## The toy

Two people, two notes.

- **Alex** works in recreation. They may see pool hours. They may not see payroll.
- **Sam** works in HR. They may see pay dates.

The recreation note is the usual invented parks file: Cedar closed Mondays, Harbour open including Mondays, Ridge closed until 1 November, resident admission $4.50. The HR note says staff are paid on the 15th and the last business day of the month, and that only HR may quote those dates.

```text
user → app → notes (filtered by audience)
         → optional model → app → text
                    → email (never bound to the model)
```

Whoever typed the question vs the app. The app vs the notes. The app vs a hosted model if you add one. The app vs send-email. Auth is fake. `alex` and `sam` are strings in a dictionary. That shows *where* the mapping lives. It isn't SSO, and I'd be embarrassed if someone thought the dictionary was the production version.

## The runs

The CLI takes a user and a question. ACL is looked up from the user. The client can't pass `acl=hr`.

```text
# offline assistant
# users: {'alex': 'recreation', 'sam': 'hr'}

$ --user alex 'Is Cedar Pool open Mondays?'
The Recreation Department runs three indoor pools: Cedar, Harbour, and Ridge. Cedar Pool hours: weekdays 6:00–21:00, weekends 8:00–18:00. Closed Mondays. Harbour Pool hours: daily 7:00–20:00 including Mondays. Ridge Pool is closed for construction until 1 November. [recreation]

$ --user alex 'When is staff payday?'
Not in the notes.

$ --user sam 'When is staff payday?'
HR payroll calendar: staff pay dates are the 15th and the last business day of the month. Only HR staff may quote pay dates to employees. [hr]

$ --user alex 'What is the capital of France?'
Not in the notes.

$ --user alex 'Email this summary to the whole department.'
gate: send_email requires approval; not executed
```

Alex's Monday question retrieves only recreation, cites `[recreation]`, and the hours are in the note. The same user's payday question never sees the HR file, so the score against recreation is junk and the app **does not** call a model. It prints `Not in the notes.` Sam's payday question is allowed to retrieve HR, cites `[hr]`, and quotes the 15th. France is ungrounded on purpose. Email never leaves the process.

Fluency isn't what made Alex miss payday. The audience filter did, which is the part I'd keep even if a live model sat in the extractive slot later.

## Code I would keep

**Audience isn't a retrieval argument the browser gets to set.**

```python
USERS = {
    "alex": "recreation",
    "sam": "hr",
}

allowed_acl = USERS[user]
corpus = [doc for doc in docs if doc["acl"] == allowed_acl]
```

If the retrieve function also accepted `allowed_acl=None`, or if the CLI took `--acl hr`, you'd have a toy that demonstrates the failure mode. Authorization belongs in the app that already decided who signed in.

**Ungrounded means skip generation.** Offline, that's a keyword-overlap threshold I wrote down (`0.4`). It'll be wrong on some phrasing. The rule is still: low score, no completion, no citation theatre. Live mode would use cosine the same way. The number changes. The skip doesn't.

**Dangerous tools are a Python `if`.**

```python
if any(marker in question.lower() for marker in ("email", "send this", "mail this")):
    return "gate: send_email requires approval; not executed"
```

In a version with tool-calling JSON, the gate still keys off the **tool name** after parse, not the user's wording. Invalid JSON is a block, not a retry-until-it-fires. Nothing is sent. Print is the whole "email API."

Every turn appends a JSON line: user, question, document ids, answer, timestamp. That log is now a sensitive store of its own. Retention is a product decision. "We log for safety" without a retention sentence is how you grow a second leak.

Answers are printed as text. No `innerHTML`. A chat pane that assigns model output to the DOM is a different bug.

## Controls, named

Same catalogue as the OWASP LLM list, used as a review table, not a score.

| Idea | Where it shows up | What the toy actually does |
| --- | --- | --- |
| Prompt injection | User text shares a process with retrieved notes | Retrieved text never gets tools; email is not bound to a completion |
| Sensitive info | HR vs recreation | ACL before retrieve; Alex's payday is a miss, not a redaction |
| Improper output handling | The answer | `print`, not markup |
| Excessive agency | "email this" | Gate in the process; approval text; no send |
| Vector / retrieval weaknesses | Nearest chunk vs allowed chunk | Audience filter first; threshold skip |
| Misinformation | Fluent false hours | Refuse if ungrounded; citation required or refuse |
| Unbounded consumption | Huge pastes | Not built. A `max` on question length would go here |

The citation rule is an eval in miniature: if the extractive (or live) string doesn't contain the document id, treat it as ungrounded and refuse. A fluent paragraph with no id is an answer you can't audit.

## What I wouldn't put in production

**Auth is a dictionary.** A caller who can pick `user=sam` is Sam. Real authorization happens in whatever already authenticated the session.

**Keyword overlap isn't a retriever.** It was enough to show the ACL and the skip without a vendor bill. A real index still needs metadata filters at query time, not "we embedded the ACL into the prompt."

**The threshold is a guess.** `0.4` let Monday hours through and France die. A paraphrase of Cedar's hours could miss. That's the leftover of every skip rule. You freeze questions and watch the skip rate. You don't pretend the first number is science.

**Logs.** Questions about pay and hours, with usernames, on disk. The control that made the demo auditable is also a record you now have to protect.

**No human UI for the email gate.** A print statement isn't an approval workflow. Preview the payload. Name the recipients. I'd be embarrassed to ship print-as-approval.

I'd still ship this *shape*: identity in the app, retrieval in-scope, refuse when empty, cite or stop, tools behind the process, text out, a log you can read on a bad day. I wouldn't ship the dictionary, the overlap scorer, or the print-as-approval as if they were the production versions of those ideas.
