Meet DawnPatch. A local repair workbench that turns a reported browser bug into evidence you can review.

For this test, we are using Sketch Wild, an outdoor sketchbook application. The bug is a deliberately reversed comparison in an isolated test copy. Choosing a five minute budget incorrectly leaves longer missions visible. The original repository stays unchanged. We will also check the twenty minute budget and the location filter, so a partial fix cannot pass.

In Dawn Patch, I start a local repository investigation. The report describes the behavior we need: the selected time is a maximum budget, and shorter missions must remain available. This gives the repair agent a clear requirement, rather than just saying that a screen is broken.

Next, I record the browser steps and the expected results. These checks cover the five minute limit, all six missions within twenty minutes, and the four missions available in a courtyard. The exact same steps will run against both copies. The selected engine is local Gemma, coordinated through Mastra, with source edits kept in an isolated workspace.

Local Gemma attempted the repair through Mastra. Its proposals repeated the existing code, so Dawn Patch rejected them. The model did not solve this case autonomously. I supplied a reviewed correction next, and the workbench verified it independently. The long local processing wait is removed from this edit.

Here is the developer assisted correction. The time budget is a maximum, so the duration comparison must include missions at or below it. Dawn Patch labels the correction clearly and applies it only to an isolated copy.

The corrected candidate has now passed verification. This is a developer assisted result, with independent browser evidence. The original repository has not been changed or published.

On the corrected website, five minutes now shows exactly one mission. Twenty minutes restores all six, including shorter tasks. Choosing the courtyard keeps four eligible missions. These checks confirm that the fix preserves the location filter as well as the time boundary.

Back in Dawn Patch, the evidence view preserves the baseline and candidate captures from real Chromium runs. The comparison slider helps review what changed. The pass or fail result comes from the recorded assertions, rather than from how a screenshot looks.

The patch is small: one comparison changes in the mission filter. Dependencies, credentials, mission content, and configuration remain untouched. The source diff is available for review and export.

The checks confirm a failing baseline, a successful isolated build, and a passing candidate replay. The same eight recorded steps ran before and after the change. Broader application behavior still needs its own tests.

That is Dawn Patch: reproduce, repair, verify, and review. This demonstration shows a real Sketch Wild test with a clearly labeled developer assisted correction, rather than claiming an autonomous fix that the model did not produce.
