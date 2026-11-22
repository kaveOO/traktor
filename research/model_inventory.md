# Model inventory: OpenCode environment

**Environment:** OpenCode v2.3.2, run on 2026-11-20.
**How models were discovered:** the `opencode models` CLI listed 88 model IDs, and the OpenCode `models` tool listed 76 for the current account. The extra 12 are older or alias IDs.
**How models were called:** each model ran as an OpenCode subagent with an explicit `model` override, used the same prompt file and wrote its own output file.
**Evidence:** a model counts as executed only if its output file exists. The raw outputs are archived outside the repo. Failure messages below are quoted from the provider, with billing URLs removed.
**Privacy:** no credentials were read or printed. A shell attempt to read the OpenCode config was blocked by the permission system, so no config was inspected.

## Summary

|                                                                     | Count                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model IDs listed by CLI                                             | 88                                                                                                                                                                                                                                                                       |
| Model IDs attempted                                                 | 72                                                                                                                                                                                                                                                                       |
| **Successfully executed (stage 1 independent brainstorm)**          | **40**                                                                                                                                                                                                                                                                   |
| Failed: OpenCode Go weekly usage limit reached mid-run              | 1 in stage 1 (`hy4`), plus 4 stage-2 panelists with no output (minimax-m3, glm-5.3, step-5-preview, grok-4.7). hy4-preview, mimo-v2.6-pro and qwen4-max wrote their critique before the error, so they count as executed (15 panelists total, see cross_model_debate.md) |
| Failed: no OpenCode pay-as-you-go balance                           | 22 (every paid `opencode/*` model attempted)                                                                                                                                                                                                                             |
| Failed: deprecated                                                  | 3                                                                                                                                                                                                                                                                        |
| Failed: blocked by account privacy setting (region)                 | 3                                                                                                                                                                                                                                                                        |
| Failed: blocked by account privacy setting (trains on data)         | 3                                                                                                                                                                                                                                                                        |
| Failed: network (ECONNRESET ×2), then aborted by user               | 1                                                                                                                                                                                                                                                                        |
| Not attempted separately (alias, or same model on another provider) | listed at the bottom                                                                                                                                                                                                                                                     |

## Capability notes

The **Capabilities** column is coarse and based on the model family. It was **not benchmarked**, so treat it as an assumption.

The **Demonstrated** column is what this run actually proved. "tools" means the model read a file and wrote a Markdown file through OpenCode tools, which shows instruction-following, tool use and long-form reasoning on this task. "web" means it also called web tools on its own initiative.

## Full table

| Provider     | Model                         | Accessible            | Capabilities (assumed, by family)              | Execution status                                                                            |
| ------------ | ----------------------------- | --------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| claude-agent | claude-opus-5                 | Yes                   | Reasoning, coding, long context, tools, vision | ✅ Stage 1 done · Stage 2 panelist                                                          |
| claude-agent | claude-fable-5-1              | Yes                   | Reasoning, coding, long context, tools         | ✅ Stage 1 done · Stage 2 panelist                                                          |
| claude-agent | claude-fable-5                | Yes                   | Reasoning, coding, long context, tools         | ✅ Stage 1 done                                                                             |
| claude-agent | claude-sonnet-5               | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| claude-agent | claude-opus-4-8               | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done                                                                             |
| claude-agent | claude-opus-4-7               | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done                                                                             |
| claude-agent | claude-opus-4-6               | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done                                                                             |
| claude-agent | claude-sonnet-4-6             | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done                                                                             |
| claude-agent | claude-haiku-4-5-20251001     | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| claude-agent | opus / sonnet / haiku / fable | Alias                 | (aliases of the versioned IDs above)           | ⏭ Not run separately (alias)                                                                |
| opencode-go  | qwen4-max                     | Yes                   | Reasoning, coding, tools                       | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | qwen3.8-max                   | Yes                   | Reasoning, coding, tools                       | ✅ Stage 1 done                                                                             |
| opencode-go  | qwen3.8-flash                 | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode-go  | qwen3.7-plus                  | Yes                   | Reasoning, tools                               | ✅ Stage 1 done                                                                             |
| opencode-go  | kimi-k3.1-pro                 | Yes                   | Reasoning, long context, tools                 | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | kimi-k3                       | Yes                   | Reasoning, long context, tools                 | ✅ Stage 1 done                                                                             |
| opencode-go  | kimi-k2.7-code                | Yes                   | Coding, tools                                  | ✅ Stage 1 done                                                                             |
| opencode-go  | gpt-6-luna                    | Yes                   | Reasoning, coding, tools, vision               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | gpt-5.6-luna                  | Yes                   | Reasoning, coding, tools                       | ✅ Stage 1 done                                                                             |
| opencode-go  | grok-4.7                      | Yes                   | Reasoning, tools                               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | claude-haiku-5-5              | Yes                   | Fast, tools, vision                            | ✅ Stage 1 done                                                                             |
| opencode-go  | glm-5.3                       | Yes                   | Reasoning, coding, tools                       | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | glm-5.3-flash                 | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode-go  | minimax-m3                    | Yes                   | Reasoning, long context, tools                 | ✅ Stage 1 done (also used web tools to verify sources on its own) · Stage 2 panelist       |
| opencode-go  | minimax-m3.1-flash            | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode-go  | mimo-v2.6-pro                 | Yes                   | Reasoning, tools                               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | mimo-v2.6-flash               | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode-go  | step-5-preview                | Yes                   | Reasoning, tools                               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | hy3                           | Yes                   | Reasoning, tools                               | ✅ Stage 1 done                                                                             |
| opencode-go  | hy4-preview                   | Yes                   | Reasoning, tools                               | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode-go  | hy4-flash-free                | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode-go  | hy4                           | Yes (until quota hit) | Reasoning, tools                               | ❌ Ran long, then failed: "OpenCode Go weekly usage limit reached". No output file          |
| opencode-go  | longcat-2.0                   | Yes                   | Reasoning, tools                               | ✅ Stage 1 done                                                                             |
| opencode-go  | beam-free                     | Yes                   | Tools                                          | ✅ Stage 1 done                                                                             |
| opencode-go  | gemini-4-argon                | Unstable              | Reasoning, long context, vision                | ❌ ECONNRESET twice; stopped at user's request                                              |
| opencode-go  | deepseek-v4-pro               | No                    | Reasoning, coding                              | ❌ "model is hosted outside Europe and the United States", account region privacy setting   |
| opencode-go  | deepseek-v4.1-flash           | No                    | Fast                                           | ❌ Region privacy setting (same message)                                                    |
| opencode-go  | longcat-2.5-free              | No                    | n/a                                            | ❌ Region privacy setting (same message)                                                    |
| opencode-go  | muse-spark-1.3-contributor    | No                    | n/a                                            | ❌ "model trains on request data", account training privacy setting                         |
| opencode-go  | muse-spark-1.2-contributor    | No                    | n/a                                            | ❌ Training privacy setting (same message)                                                  |
| opencode-go  | iceman-contributor-free       | No                    | n/a                                            | ❌ Training privacy setting (same message)                                                  |
| opencode-go  | mimo-v2.5-pro                 | No                    | n/a                                            | ❌ "Model mimo-v2.5-pro has been deprecated"                                                |
| opencode-go  | mimo-v2.5                     | No                    | n/a                                            | ❌ Deprecated                                                                               |
| opencode     | big-pickle (free)             | Yes                   | Tools                                          | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode     | deepseek-v4.1-flash-free      | Yes                   | Fast, coding, tools                            | ✅ Stage 1 done · Stage 2 panelist                                                          |
| opencode     | flint-40b-free                | Yes                   | Tools                                          | ✅ Stage 1 done                                                                             |
| opencode     | iceman-free                   | Yes                   | Tools                                          | ✅ Stage 1 done                                                                             |
| opencode     | mimo-v2.6-flash-free          | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode     | nemotron-3.5-lightning-free   | Yes                   | Fast, tools                                    | ✅ Stage 1 done                                                                             |
| opencode     | nemotron-3.5-super-vl-free    | Yes                   | Tools, vision                                  | ✅ Stage 1 done                                                                             |
| opencode     | tidepool-alpha-free           | Yes                   | Tools                                          | ✅ Stage 1 done (its file header says "model withheld per product policy")                  |
| opencode     | claude-opus-5-5               | No                    | Reasoning, coding, vision                      | ❌ "Insufficient balance. This request is pay-as-you-go, billed to OpenCode Models credits" |
| opencode     | claude-fable-5-2              | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | claude-sonnet-5-5             | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | claude-haiku-5-5              | No                    | n/a                                            | ❌ Insufficient balance (ran via opencode-go instead)                                       |
| opencode     | gpt-6.2-sol                   | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-6.2-astra                 | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-6-luna                    | No                    | n/a                                            | ❌ Insufficient balance (ran via opencode-go instead)                                       |
| opencode     | gpt-5.6-terra                 | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.5-pro                   | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.5                       | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.4-mini                  | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.4-nano                  | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.3-codex                 | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gpt-5.3-codex-spark           | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gemini-4-neon                 | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gemini-4-hydrogen             | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gemini-3.8-flash              | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gemini-3.5-flash-lite         | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | gemini-3.1-pro                | No                    | n/a                                            | ❌ "Model gemini-3.1-pro has been deprecated"                                               |
| opencode     | grok-4.7                      | No                    | n/a                                            | ❌ Insufficient balance (ran via opencode-go instead)                                       |
| opencode     | grok-build-0.1                | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | mistral-large-4               | No                    | n/a                                            | ❌ Insufficient balance                                                                     |
| opencode     | muse-ember-1.0                | No                    | n/a                                            | ❌ Insufficient balance                                                                     |

## Not attempted separately (named, not skipped silently)

These IDs on the paid `opencode` provider are the **same model** already executed via `opencode-go`. All 22 paid `opencode/*` attempts failed with _Insufficient balance_, so these would fail the same way. They were not called again:
`opencode/kimi-k3`, `opencode/kimi-k2.7-code`, `opencode/minimax-m3`, `opencode/glm-5.3`, `opencode/glm-5.3-flash`, `opencode/qwen3.8-flash`, `opencode/deepseek-v4-pro`, `opencode/deepseek-v4.1-flash`.

These free duplicates on `opencode` are the same model as one already run on `opencode-go`: `opencode/beam-free`, `opencode/hy4-flash-free`, `opencode/longcat-2.5-free` (the opencode-go copy of the last one is region-blocked).

The `claude-agent` aliases `opus`, `sonnet`, `haiku` and `fable` point at the versioned IDs listed above.

## How to unlock the remaining models (user decision, not changed by the agent)

- Top up OpenCode pay-as-you-go credits: unlocks 22 `opencode/*` models, including claude-opus-5-5, gpt-6.2-sol/astra, gemini-4-neon/hydrogen and mistral-large-4.
- Account privacy: set region to "Global" for the deepseek / longcat-2.5 Go models. Allowing "paid endpoints that train on request data" unlocks muse-spark and iceman-contributor.
