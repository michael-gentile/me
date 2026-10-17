---
title: "A tiny policy assistant I would actually sketch"
date: 2026-08-23
tags:
  - ai
summary: "A weekend CLI: fake logins, two made-up notes on disk, retrieval that respects audience, and a send_email button that never fires. Offline on purpose."
---

This post is a weekend CLI that glues three earlier notes into one runnable toy: who is asking, which notes they may see, whether the answer is grounded, and whether "send this by email" is allowed to become a send. The pieces come from [The webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [The nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), and [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/). Fake logins, two made-up files on disk, and a send_email button that never sends.

There's no ChatGPT or Claude key in this sketch. The traces below are from an **offline** assistant: keyword overlap instead of embeddings, extractive sentences instead of a chat model, gates in Python. A live model can sit in the same slots later. It doesn't replace the slots, which is the whole reason a guest's rent question dies in Python and not in a paragraph.

## The toy

Two people, two notes.

- **guest** may see the shared kitchen file. They may not see household rent.
- **me** (owner) may see the private household file.

The kitchen note is the usual invented shared file: sourdough starter fed every Sunday, fridge inventory on Saturdays, a couple of pantry lines. The household note says rent is due on the 1st, and that only the owner may quote that date.

```text
user → app → notes (filtered by audience)
         → optional model → app → text
                    → email (never bound to the model)
```

Whoever typed the question vs the app. The app vs the notes. The app vs a hosted model if you add one. The app vs send-email. Auth is fake. `guest` and `me` are strings in a dictionary. That shows *where* the mapping lives. It isn't real sign-in, and I'd be embarrassed if someone thought the dictionary was the production version.

## The runs

The CLI takes a user and a question. ACL is looked up from the user. The client can't pass `acl=private`.

```text
# offline assistant
# users: {'guest': 'shared', 'me': 'private'}

$ --user guest 'Do I feed the starter on Sundays?'
Kitchen notes: sourdough starter is fed every Sunday. Fridge inventory day is Saturday. [kitchen]

$ --user guest 'When is rent due?'
Not in the notes.

$ --user me 'When is rent due?'
Household calendar: rent is due on the 1st. Only the owner may quote rent dates. [household]

$ --user guest 'What is the capital of France?'
Not in the notes.

$ --user guest 'Email this summary to everyone.'
gate: send_email requires approval; not executed
```

Guest's starter question retrieves only shared notes, cites `[kitchen]`, and the feed day is in the file. The same user's rent question never sees the household file, so the score against kitchen is junk and the app **does not** call a model. It prints `Not in the notes.` Owner's rent question is allowed to retrieve household, cites `[household]`, and quotes the 1st. France is ungrounded on purpose. Email never leaves the process.

Fluency isn't what made guest miss rent. The audience filter did, which is the part I'd keep even if a live model sat in the extractive slot later.

## Code I would keep

**Audience isn't a retrieval argument the browser gets to set.**

```python
USERS = {
    "guest": "shared",
    "me": "private",
}

allowed_acl = USERS[user]
corpus = [doc for doc in docs if doc["acl"] == allowed_acl]
```

If the retrieve function also accepted `allowed_acl=None`, or if the CLI took `--acl private`, you'd have a toy that demonstrates the failure mode. Authorization belongs in the app that already decided who signed in.

**Ungrounded means skip generation.** Offline, that's a keyword-overlap threshold I wrote down (`0.4`). It'll be wrong on some phrasing. The rule is still: low score, no completion, no citation theatre. Live mode would use cosine the same way. The number changes. The skip doesn't.

**Dangerous tools are a Python `if`.**

```python
if any(marker in question.lower() for marker in ("email", "send this", "mail this")):
    return "gate: send_email requires approval; not executed"
```

In a version with tool-calling JSON, the gate still keys off the **tool name** after parse, not the user's wording. Invalid JSON is a block, not a retry-until-it-fires. Nothing is sent. Print is the whole "email API."

Every turn appends a JSON line: user, question, document ids, answer, timestamp. That log is now a sensitive store of its own. Retention is a product decision. "We log for safety" without a retention sentence is how you grow a second leak.

Answers are printed as text. No `innerHTML`. A chat pane that assigns model output to the DOM is a [related bug](/me/blog/the-webpage-is-untrusted-input/).

## Controls, named

Same catalogue as the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/), used as a table I can argue with, not a score.

| Idea | Where it shows up | What the toy actually does |
| --- | --- | --- |
| Prompt injection | User text shares a process with retrieved notes | Retrieved text never gets tools; email is not bound to a completion |
| Sensitive info | Private vs shared | ACL before retrieve; guest's rent question is a miss, not a redaction |
| Improper output handling | The answer | `print`, not markup |
| Excessive agency | "email this" | Gate in the process; approval text; no send |
| Vector / retrieval weaknesses | Nearest chunk vs allowed chunk | Audience filter first; threshold skip |
| Misinformation | Fluent false feed day | Refuse if ungrounded; citation required or refuse |
| Unbounded consumption | Huge pastes | Not built. A `max` on question length would go here |

The citation rule is an eval in miniature: if the extractive (or live) string doesn't contain the document id, treat it as ungrounded and refuse. A fluent paragraph with no id is an answer you can't audit.

## What I wouldn't put in production

**Auth is a dictionary.** A caller who can pick `user=me` is the owner. Real authorization happens in whatever already authenticated the session.

**Keyword overlap isn't a retriever.** It was enough to show the ACL and the skip without a vendor bill. A real index still needs metadata filters at query time, not "we embedded the ACL into the prompt."

**The threshold is a guess.** `0.4` let Sunday feed through and France die. A paraphrase of the starter line could miss. That's the leftover of every skip rule. You freeze questions and watch the skip rate. You don't pretend the first number is science.

**Logs.** Questions about rent and kitchen habits, with usernames, on disk. The control that made the demo auditable is also a record you now have to protect.

**No human UI for the email gate.** A print statement isn't an approval workflow. Preview the payload. Name the recipients. I'd be embarrassed to ship print-as-approval.

I'd still ship this *shape*: identity in the app, retrieval in-scope, refuse when empty, cite or stop, tools behind the process, text out, a log you can read on a bad day. I wouldn't ship the dictionary, the overlap scorer, or the print-as-approval as if they were the production versions of those ideas.

## Sources

- Earlier notes: [The webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [The nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Controls I would require](/me/blog/controls-i-would-require/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
