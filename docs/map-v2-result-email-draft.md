# The MAP v2 result email (DRAFT for review)

Status: draft only. Not connected, not scheduled, no automation enabled.
Sender name and address: pending owner decision (not set here).
Colours: pending owner decision. Do not apply the Creator Access Hub palette as DDD.

## Merge fields

Placeholders in [brackets] map to fields the app already sends to the CRM webhook.
Legacy fields keep their names; v2 fields are inside `result`.

| Placeholder | Webhook field |
|---|---|
| [First name] | `firstName` |
| [Priority] | `result.priorityLabel` (same text as legacy `primaryStage` for v2) |
| [Stage] | `result.stageLabel` |
| [Avenue] | `result.avenueLabel` |
| [Next action] | `result.immediateAction` |
| [Plan timeframe] | `result.planHorizon` |
| [Step 1] [Step 2] [Step 3] | `result.planSteps[0..2]` |
| [Creator path name] / [Creator path link] | `result.creatorPath.label` / `result.creatorPath.url` (may be empty) |
| [Resource 1 name] / [Resource 1 link] | `result.resources[0].name` / `.url` (may be empty) |
| [Resource 2 name] / [Resource 2 link] | `result.resources[1].name` / `.url` (may be empty) |

Rules: only show the creator path and resource blocks when those fields are present.
If `result.spend` is `free_only`, never show a resource block.
Legacy rows without `assessmentVersion` must keep using the old template.

---

**Subject:** [First name], your MAP: [Priority]

**Preview text:** One clear next step, based on your answers.

---

Hi [First name],

Thanks for taking The MAP. Here's what your answers showed.

**Your priority right now: [Priority]**
Stage: [Stage]. Avenue: [Avenue].

This isn't a label for you. It's the one thing that, once handled, makes the rest easier.

**Your next action**
[Next action]

**Your short plan**
[Plan timeframe]:
1. [Step 1]
2. [Step 2]
3. [Step 3]

You don't need to buy anything to do this. Start with what you already have.

*(Show only if a creator path is present)*
**Want to see what others on your avenue are doing?**
Explore the [Creator path name] path: [Creator path link]

*(Show only if resources are present and spend is not free_only)*
**Optional, if you want structured support**
These matched your answers. They're optional, and your plan works without them.
- [Resource 1 name]: [Resource 1 link]
- [Resource 2 name]: [Resource 2 link]

If something in your result doesn't sound like you, reply and tell me. I read these.

💜 Elleni
The MAP by Diamond Digital Diva

---

Footer (legal, unchanged wording from the current CRM template): unsubscribe link and mailing address.
