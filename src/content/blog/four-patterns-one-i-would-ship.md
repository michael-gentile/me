---
title: "Four prompt patterns, one parks excerpt"
date: 2026-06-13
tags:
  - llm
  - prompts
summary: "Zero-shot, few-shot, JSON, and a rubric against the same invented parks policy. Which output would I put in front of a staff member?"
---

Would I put this output in front of a person who has to act on it? I ran four patterns against the same invented parks excerpt: hours to dusk, fires only in designated grills, dogs leashed, gatherings of 25+ need a permit, no recreational drones without approval, no alcohol unless a special-occasion permit is posted.

## Patterns

**Zero-shot.** Task plus excerpt. Often fine, often sloppy. It will summarize. It will also invent a tone, skip a rule, or bury the permit threshold.

**Few-shot.** One example of the shape you want. Watch whether the model copies the example's *content* instead of the excerpt's. If your example mentioned a curfew and the excerpt doesn't, a sloppy few-shot will grow a curfew.

A concrete pair. Excerpt has no curfew. Bad example:

```text
Example excerpt: parks close at 22:00.
Example answer: {"risks": ["after-hours use"]}
```

The model now has "22:00" in its recent tokens. A real excerpt that only says "hours to dusk" can still grow a 22:00 curfew because the example wasn't empty of facts, which is the embarrassing run: you asked for a shape and you got a closing time you invented. The example should use invented names and no overlapping rules, or you skip few-shot.

**JSON.** Schema in the system message. Valid JSON is a pass. Invalid JSON is a failed pattern, not a near miss. If you need a machine to consume the answer, this is the only one of the four that even pretends to be an interface.

Sketch of the schema I'd actually send for this excerpt:

```json
{
  "type": "object",
  "required": ["hours", "permits", "risks"],
  "properties": {
    "hours": { "type": "string" },
    "permits": { "type": "array", "items": { "type": "string" } },
    "risks": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}
```

Empty arrays if the excerpt has nothing for that field. Fail the run if `json.loads` throws, if a required key is missing, or if a risk names a curfew that isn't in the excerpt.

**Rubric then answer.** Score coverage, then list risks, don't invent. Cheap substitute for chain-of-thought theatre. If the model invents a rule that isn't in the excerpt, that's a miss, however tidy the rubric looks.

Skip "think step by step" as a default. It's slower, leakier into the user-visible answer, and often worse for extraction. The chain shows up as "First I notice the hours... Therefore..." in the JSON string, or as a preamble before the object. Your parser then has extra text to strip, or `json.loads` throws. If you need a rubric, ask for scores as fields, not as a monologue.

| Pattern | When I would use it |
| --- | --- |
| Zero-shot | Drafts a human will rewrite. Not a system of record. |
| Few-shot | Shape matters and you will audit that the example is empty of facts. |
| JSON | Anything another program will parse. Fail the run if `json.loads` throws. |
| Rubric then answer | Review notes. Still check for invented rules. |

The one I'd actually use for "summarize this policy into risks" is JSON with a coverage list, plus a grounded instruction: only fields supported by the excerpt, empty array if none. Zero-shot is what I type into a chat window. I wouldn't hang a workflow on it.

## Shipping test

Would I put this in front of a staff member without a rewrite? Invented curfews fail that test, even if the prose is nicer.

## Sources

- Common prompt-pattern names as used in API cookbooks, applied to one excerpt
