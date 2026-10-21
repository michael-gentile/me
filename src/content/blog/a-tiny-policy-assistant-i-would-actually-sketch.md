---
title: "Policy CLI: a tiny assistant I would actually sketch"
date: 2026-08-23
tags:
  - ai
summary: "A weekend CLI: fake logins, two made-up notes on disk, retrieval that respects audience, and a send_email button that never fires. Offline on purpose."
---

The trade-off a weekend security sketch accepts is toy fidelity versus teachable shape: real sign-in and embeddings cost time, and a runnable CLI with fake logins still shows where identity lives, where ACL runs before similarity, and where `send_email` dies in Python—not in a system prompt. We glued three earlier notes into one offline assistant: [untrusted webpages](/me/blog/the-webpage-is-untrusted-input/), [nearest versus allowed chunks](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), and [tool gates](/me/blog/the-model-does-not-get-send-email/). Two made-up files on disk, keyword overlap instead of vectors, extractive answers instead of a chat model. A live model can sit in the same slots later; it does not replace the slots.

Below: the toy boundaries, example runs, code we would keep, a control table mapped to OWASP ideas, and what we would not mistake for production.

## The toy and its boundaries

Two people, two notes.

- **guest** may see the shared kitchen file. They may not see household rent.
- **me** (owner) may see the private household file.

The kitchen note is the usual invented shared file: sourdough starter fed every Sunday, fridge inventory on Saturdays, a couple of pantry lines. The household note says rent is due on the 1st, and that only the owner may quote that date.

```text
user → app → notes (filtered by audience)
         → optional model → app → text
                    → email (never bound to the model)
```

Whoever typed the question versus the app. The app versus the notes. The app versus a hosted model if you add one. The app versus send-email. Auth is fake—`guest` and `me` are strings in a dictionary. That shows *where* the mapping lives. It is not real sign-in, and we would be embarrassed if someone shipped the dictionary as authorization.

## Runs that show the controls working

The CLI takes a user and a question. ACL is looked up from the user. The client cannot pass `acl=private`.

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

Guest's starter question retrieves only shared notes, cites `[kitchen]`, and the feed day is in the file. The same user's rent question never sees the household file—the score against kitchen is junk and the app **does not** call a model. It prints `Not in the notes.` Owner's rent question may retrieve household, cites `[household]`, and quotes the 1st. France is ungrounded on purpose. Email never leaves the process.

Fluency is not what kept rent from the guest. The audience filter did—and that is the part we would keep even if a live model sat in the extractive slot later.

## Code we would keep

**Audience is not a retrieval argument the browser sets.**

```python
USERS = {
    "guest": "shared",
    "me": "private",
}

allowed_acl = USERS[user]
corpus = [doc for doc in docs if doc["acl"] == allowed_acl]
```

If retrieve also accepted `allowed_acl=None`, or if the CLI took `--acl private`, you would have a toy that demonstrates the failure mode. Authorization belongs in the app that already decided who signed in.

**Ungrounded means skip generation.** Offline, that is a keyword-overlap threshold we wrote down (`0.4`). It will be wrong on some phrasing. The rule is still: low score, no completion, no citation theatre. Live mode would use cosine the same way. The number changes; the skip does not.

**Dangerous tools are a Python `if`.**

```python
if any(marker in question.lower() for marker in ("email", "send this", "mail this")):
    return "gate: send_email requires approval; not executed"
```

In a version with tool-calling JSON, the gate still keys off the **tool name** after parse, not the user's wording. Invalid JSON is a block, not a retry-until-it-fires. Nothing is sent. Print is the whole “email API.”

Every turn appends a JSON line: user, question, document ids, answer, timestamp. That log is now a sensitive store of its own. Retention is a product decision. “We log for safety” without a retention sentence is how you grow a second leak.

Answers are printed as text. No `innerHTML`. A chat pane that assigns model output to the DOM is a [related bug](/me/blog/the-webpage-is-untrusted-input/).

## Controls, named in one table

Same catalogue as the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/), used as a table we can argue with—not a score.

| Idea | Where it shows up | What the toy actually does |
| --- | --- | --- |
| Prompt injection | User text shares a process with retrieved notes | Retrieved text never gets tools; email is not bound to a completion |
| Sensitive info | Private vs shared | ACL before retrieve; guest's rent question is a miss, not a redaction |
| Improper output handling | The answer | `print`, not markup |
| Excessive agency | "email this" | Gate in the process; approval text; no send |
| Vector / retrieval weaknesses | Nearest chunk vs allowed chunk | Audience filter first; threshold skip |
| Misinformation | Fluent false feed day | Refuse if ungrounded; citation required or refuse |
| Unbounded consumption | Huge pastes | Not built. A `max` on question length would go here |

The citation rule is an eval in miniature: if the extractive (or live) string does not contain the document id, treat it as ungrounded and refuse. A fluent paragraph with no id is an answer you cannot audit.

## What we would not put in production

**Auth is a dictionary.** A caller who can pick `user=me` is the owner. Real authorization happens in whatever already authenticated the session.

**Keyword overlap is not a retriever.** It was enough to show ACL and skip without a vendor bill. A real index still needs metadata filters at query time, not “we embedded the ACL into the prompt.”

**The threshold is a guess.** `0.4` let Sunday feed through and France die. A paraphrase of the starter line could miss. That is the leftover of every skip rule. Freeze questions and watch the skip rate. Do not pretend the first number is science.

**Logs.** Questions about rent and kitchen habits, with usernames, on disk. The control that made the demo auditable is also a record you now have to protect.

**No human UI for the email gate.** A print statement is not an approval workflow. Preview the payload. Name the recipients. We would be embarrassed to ship print-as-approval.

We would still ship this *shape*: identity in the app, retrieval in-scope, refuse when empty, cite or stop, tools behind the process, text out, a log you can read on a bad day. We would not ship the dictionary, the overlap scorer, or print-as-approval as if they were the production versions of those ideas.

## Sources

- [Prompt injection: the webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Notes assistant: a control matrix before the prompt](/me/blog/controls-i-would-require/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
