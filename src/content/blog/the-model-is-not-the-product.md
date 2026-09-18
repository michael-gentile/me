---
title: "The model is not the product"
date: 2026-05-18
tags:
  - llm
summary: "Three different things get sold as AI: a next-token model, a vendor product, and the application you actually have to design."
---

People say "the AI" the way they used to say "the computer." It collapses three layers that don't share a threat model.

## Layers

**Model.** A statistical function. Input: tokens. Output: a probability distribution over the next token, sampled into more tokens. It doesn't have a website, a memory, or a department. Weights are a frozen compressed prior over training text, not a live database. After training, it doesn't automatically know this year's amendment.

**Product.** ChatGPT, Copilot, Gemini, a vendor "assistant." The product wraps a model with a UI, system prompts, retrieval, tools, logging, billing, and safety filters. Two products can share a model family and behave differently. When a slide says "the AI knows your policies," they mean this wrapper, or the next layer.

**Application.** What you build: a policy assistant, a service-desk draft tool, a retrieve-then-generate chatbot over a document set. The application owns authentication, which documents are in scope, which tools may fire, and what a human must approve. Policy lives here, or it doesn't live anywhere.

## One message, traced

1. **Client:** browser or app collects user text (and maybe files, prior turns).
2. **Application:** attaches a system prompt, retrieved chunks, tool schemas, user identity.
3. **API:** HTTP call with a message array. Billing is usually tokens in plus tokens out. Input is cheaper than output on most price sheets. A long retrieved handbook in the prompt is an input bill. A rambling answer is an output bill. Caps belong on both.

4. **Model:** text is tokenized, run through the network, next tokens are sampled until a stop condition.
5. **Tokens out:** detokenized back into text (and maybe tool-call JSON).
6. **UI:** streamed or pasted into a page. If you assign that string to `innerHTML`, you just inherited an output-handling problem.

Two products can share a model family and disagree. Same weights, different system prompt, different retrieval, different tool allowlist, different logging. The slide that names the model is naming layer 4. The threat model lives in 2 and 6.

When a slide says "the AI knows your policies," ask which layer they mean. If they mean the weights, last Tuesday's amendment is not in there unless it was in the crawl. If they mean retrieval, that is the application: which PDFs, which ACL, which citation. Treating a chatbot product as a knowledgeable employee is how you skip the diagram.

Nothing in that path is understanding in the human sense. It's conditioned generation. Fluent sentences aren't approvals, citations, or records of decision.

## What the model doesn't have

- **Persistent truth.** A new session with an empty context doesn't remember last Tuesday unless the application stored it.
- **Private memory** unless you give it conversation history, retrieval, or a profile store.
- **A boundary between instructions and data** unless you design one. To the model, it's all tokens.
- **Intent.** It's very good at continuing text that *looks like* a helpful answer. That's not the same as knowing what you meant, or whether the answer is allowed.

When someone asks for "something that answers questions about our policies," they're asking for an application: retrieval, access control, logging, and a path for exceptions. The model is one component.

## Sources

- Vendor API docs for the message-array view of a call
- Writing on LLMs as token predictors wrapped by applications (Simon Willison and others)
