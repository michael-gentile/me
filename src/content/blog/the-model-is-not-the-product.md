---
title: "The model is not the product"
date: 2026-05-18
tags:
  - llm
summary: "Three different things get sold as AI: a next-token model, a vendor product, and the application you actually have to design."
---

People say "the AI" the way they used to say "the computer." It collapses three layers that don't share a threat model, which is how a slide about a next-token function turns into a plan for a staff chatbot that answers questions about park hours.

## Layers

**Model.** A statistical function. Input: tokens. Output: a probability distribution over the next token, sampled into more tokens. It doesn't have a website, a memory, or a department. Weights are a frozen compressed prior over training text, not a live database. After training, it doesn't automatically know this year's amendment, so "when is Cedar closed" is not a fact the matrices own unless that sentence was in the crawl.

**Product.** ChatGPT, Copilot, Gemini, a vendor "assistant." The product wraps a model with a UI, system prompts, retrieval, tools, logging, billing, and safety filters. Two products can share a model family and behave differently. When a slide says "the AI knows your policies," they mean this wrapper, or the next layer.

**Application.** What you build: a policy assistant, a service-desk draft tool, a retrieve-then-generate chatbot over a document set. The application owns authentication, which documents are in scope, which tools may fire, and what a human must approve. Policy lives here, or it doesn't live anywhere, which is the part that decides whether a recreation user ever sees an HR payday.

## One message, traced

Take a parks question typed in a browser, "When is staff payday?", and walk it through the same six steps a vendor demo skips.

1. **Client:** browser or app collects user text (and maybe files, prior turns).
2. **Application:** attaches a system prompt, retrieved chunks, tool schemas, user identity. This is where you'd look up that the caller is recreation-only, and where you'd refuse to retrieve HR notes.
3. **API:** HTTP call with a message array. Billing is usually tokens in plus tokens out. Input is cheaper than output on most price sheets. A long retrieved handbook in the prompt is an input bill. A rambling answer is an output bill. Caps belong on both.

4. **Model:** text is tokenized, run through the network, next tokens are sampled until a stop condition. The matrices don't know who the caller is unless you put that in the prompt.
5. **Tokens out:** detokenized back into text (and maybe tool-call JSON).
6. **UI:** streamed or pasted into a page. If you assign that string to `innerHTML`, you just inherited an output-handling problem, even if the answer was "not in the notes."

Two products can share a model family and disagree. Same weights, different system prompt, different retrieval, different tool allowlist, different logging. The slide that names the model is naming layer 4. The threat model lives in 2 and 6: who got to retrieve, and what the page did with the string.

When a slide says "the AI knows your policies," ask which layer they mean. If they mean the weights, last Tuesday's amendment isn't in there unless it was in the crawl. If they mean retrieval, that's the application: which PDFs, which ACL, which citation. Treating a chatbot product as a knowledgeable employee is how you skip the diagram.

Fluent sentences aren't approvals, citations, or records of decision. They're sampled tokens that look like an answer. The application still has to decide whether recreation users can even see the HR chunk, and whether that string is safe to put in a page.

## What the model doesn't have

- **Persistent truth.** A new session with an empty context doesn't remember last Tuesday unless the application stored it.
- **Private memory** unless you give it conversation history, retrieval, or a profile store.
- **A boundary between instructions and data** unless you design one. To the model, it's all tokens.
- **Intent.** It's very good at continuing text that *looks like* a helpful answer, which is why a leading question about a fake bylaw gets a fluent fake citation. That's not knowing what you meant, and it's not knowing whether the answer is allowed.

When someone asks for "something that answers questions about our policies," they're asking for an application: retrieval, access control, logging, and a path for exceptions. The model is one component.

## Sources

- Vendor API docs for the message-array view of a call
- Writing on LLMs as token predictors wrapped by applications (Simon Willison and others)
