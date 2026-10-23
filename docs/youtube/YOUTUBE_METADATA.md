# Title

DawnPatch: From Bug Report to Verified Patch | Local AI Demo

# Description

DawnPatch turns a reported website bug into browser evidence, a source diff, and a candidate you can review. This desktop demo shows the complete investigation and verification workflow running locally.

Built with local Gemma 3:4b through Ollama, a typed Mastra workflow, and Playwright browser testing, DawnPatch helps maintainers reproduce a problem and check whether a proposed change actually improves it.

IN THIS DEMO
• Reproduce a controlled mission-filter regression in SketchWild.
• Define eight browser steps covering time limits and the location filter.
• Run local Gemma analysis and validate proposed edits.
• Submit a developer-reviewed correction in an isolated source copy.
• Build the candidate, replay the same assertions, and inspect the evidence.

The regression was deliberately introduced in an isolated test checkout. The successful correction shown is developer-assisted after the model's proposals were rejected; DawnPatch independently verifies it. The original target repository is unchanged. Long inference waits are edited out.

CHAPTERS
00:00 Meet DawnPatch and the SketchWild bug
00:31 Set up a local repository investigation
00:49 Define browser steps and assertions
01:11 Local Gemma and Mastra analysis
01:31 Submit a reviewed correction
01:45 Review the verified candidate
01:57 Test the corrected SketchWild website
02:15 Compare browser evidence
02:31 Inspect the source diff
02:44 Review verification checks
02:59 Results and takeaways

CODE AND PROJECT
DawnPatch: https://github.com/priy-anshugupta/DawnPatch
SketchWild test target: https://github.com/priy-anshugupta/sketchwild

Built for the Hacktoberfest Open-Source AI Challenge, Week 3: Slow and Steady.
https://dev.to/challenges/hacktoberfest-week3-2026-10-19

TECHNOLOGY
React • TypeScript • Vite • Express • SQLite • Ollama • Gemma 3:4b • Mastra • Playwright • Chromium • Docker

DawnPatch also includes a Temporal workflow backend with a separately tested worker-recovery path. The recorded investigation uses the local queue.

English narration generated with ElevenLabs. Captions are aligned to the final voice narration.

#DawnPatch #Gemma #Hacktoberfest

# Tags

DawnPatch, local AI, Gemma, Gemma 3, Gemma 3 4b, Ollama, Mastra, Playwright, browser testing, bug reproduction, bug verification, web development, developer tools, TypeScript, React, open source, open weight models, AI agent, human in the loop, software testing, regression testing, local LLM, Hacktoberfest, Hacktoberfest 2026, SketchWild, ElevenLabs, Temporal

# Pinned comment

Source code: https://github.com/priy-anshugupta/DawnPatch

This demo shows a developer-assisted correction with automated browser verification. DawnPatch preserves the failing baseline, source diff, and results so the next review starts with evidence.

What would you automate first: reproducing a bug, collecting evidence, or replaying regression checks?
