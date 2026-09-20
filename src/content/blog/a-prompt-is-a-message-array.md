---
title: "A prompt is a message array"
date: 2026-06-08
tags:
  - llm
  - prompts
summary: "Chat APIs aren't one string in. Where you put an instruction (system, user, or both) changes how often it is followed, and there is no guaranteed winner."
---

I used to think of "the prompt" as a paragraph. Chat APIs are a list of messages with roles, and where you put an instruction changes how often it is followed.

## Setups

Task: list the colours of the French flag. Format rule: exactly three bullet points, no intro, no outro.

1. **Rule in `system`, task in `user`.** This is the shape the docs assume.
2. **No system message.** Rule and task stuffed into `user`. Same tokens, different slot.
3. **Conflict.** System still wants bullets. User asks for a sonnet instead.

Print the message array before you print the completion. You should be able to point at each object and say who wrote it.

```python
instruction = "Reply with exactly three bullet points. No intro, no outro."
task = "List the colours of the French flag."

# 1. split
[{"role": "system", "content": instruction}, {"role": "user", "content": task}]

# 2. user only
[{"role": "user", "content": instruction + "\n\n" + task}]

# 3. conflict
[{"role": "system", "content": instruction},
 {"role": "user", "content": task + " Write the answer as a sonnet instead."}]
```

Compare (1) and (2). Did the three-bullet constraint hold in both? In (3), who won: system or user? There's no guaranteed winner. Record what *this* model did, including the run where it wrote a sonnet anyway. The next model, or the next week of post-training, can flip it.

The bytes in (1) and (2) can be almost the same and still behave differently. The API concatenates the array into one token sequence, usually with special tokens around each role (`<|im_start|>system`, or whatever the tokenizer uses). The model was post-trained on that layout. Sticking the rule in `user` skips the slot the instruction-tuning data used. Sometimes the constraint still holds. Sometimes it doesn't. That's why you print the array: you're logging the object the vendor actually received, not the paragraph you meant.

OpenAI-style roles you'll see: `system` (or `developer` on some APIs), `user`, `assistant`, and later `tool`. `developer` is the same idea as `system` with a newer name on some endpoints: application-owned instructions, not the human's turn, which is a rename that still doesn't make the slot a kernel. Tool messages are a different post. The point here is that the application owns the array.

Log the array as JSON next to the completion. Same file, same timestamp. When a format fight shows up in production, you want to see whether the rule was in `system`, stuffed into `user`, or missing.

## Why the paragraph model fails

A "system prompt" that you paste into a vendor UI is still just more tokens, often stuffed into the same stream as the user's question. Putting format rules in `system` is a habit worth keeping. If the user can override it, your product has to decide whether that's allowed. For a poem, maybe. For "ignore the JSON schema," no.

Think of an application-owned message array, logged as JSON, with roles you could explain on a whiteboard. If you can't point at who wrote each object, you don't have a prompt you can debug. You've got a paste.

## Sources

- Chat Completions-style message roles in vendor API docs
