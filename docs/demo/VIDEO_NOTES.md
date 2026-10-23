# DawnPatch / SketchWild testing video

Recorded October 23, 2026. Website viewport only, 1920×1080. English ElevenLabs narration, normalized audio, selectable captions and an SRT sidecar. Long CPU inference waits and recording/setup troubleshooting are omitted. Actual outcomes are preserved.

Main file: `DawnPatch-SketchWild-1080p.mp4` (approximately 3 minutes 15 seconds).

## What the video demonstrates

- A deliberately introduced mission-duration regression in an isolated SketchWild checkout (`799f5640f570b08fc41c15f2883400bdf6105f02`). This is not a discovered upstream defect.
- Real Chromium reproduction: five minutes incorrectly displays six mission cards.
- Local Gemma 3:4b / Mastra attempts that did not produce an applicable correction. The no-change safeguard rejected unchanged source proposals. This is explained in the narration, without showing setup troubleshooting.
- An explicitly labeled **developer-assisted correction**, submitted through DawnPatch's correction form. Its comparison changes from `>=` to `<=` in `src/Challenges.tsx`.
- Independent sandbox build and replay of the same eight recorded steps. The candidate passes, including the twenty-minute and courtyard regression checks.
- Baseline/candidate evidence, source diff and verification checks. No PR was published, and the upstream checkout was not patched.

Verified run: `1781753e-da72-495d-b892-76b52fcedab0`.

The healthy upstream control (`ae105a4de74cfc0aafe668638f8ede155ce631e8`) passed all eight steps and returned `not_reproduced`, with no proposed patch. Control run: `3051c7b6-723b-4c67-8fdb-31ca32c7197b`.

This is a real browser-testing and developer-assisted repair demonstration. It must not be described as a successful autonomous Gemma repair. SketchWild's live image-feedback backend was outside this frontend filter test.

## Validation and artifacts

- TypeScript and production bundle passed.
- Eleven core/transport tests passed, including cancellation, unchanged-edit rejection, source policy and exact patch validation.
- Seven browser tests passed, including connection recovery, all three reference fixtures, correction provenance/replay, desktop review, schedules and settings.
- Runtime dependency audit reported zero vulnerabilities.
- The raw footage, edit manifest and run JSON remain in ignored `.dawnpatch/demo-production/` for review.
- Narration transcript: `DawnPatch-SketchWild-narration.md`.
- Captions: `DawnPatch-SketchWild.srt`.
- The ElevenLabs API key is not part of the product, recording, transcript or repository.

The older `dawnpatch-local-demo.webm` is a separate historical reference-fixture demonstration.

Automatic Entire shell hooks remain temporarily paused to prevent terminal pop-ups during recording. Their original project configuration is preserved in `.dawnpatch/hooks-before-recording.json`.

A second version, `DawnPatch-SketchWild-1080p-subtitled.mp4`, has small 26 px bottom captions with an approximately 27% opacity backdrop sized to each line. The original selectable-caption edition remains unchanged.

## Subtitle synchronization correction

The initial captions estimated timing by dividing each narration section into equal blocks. They have been replaced with 71 phrase captions aligned to all 469 spoken words in the final edited audio using ElevenLabs forced alignment. Caption starts lead the aligned first word by 40 ms; ends are held up to 120 ms after speech, bounded by the next phrase. No caption overlaps remain. The short, 26 px bottom caption style and subtle backdrop are preserved.

`DawnPatch-SketchWild-1080p-synced.mp4` is the corrected burned-caption export. The existing `-subtitled.mp4`, the main selectable-caption MP4, and the SRT sidecar are also updated. Encoded audio hashes match the previous narration exactly; the full corrected video decoded without errors. Timing checks are in `DawnPatch-SketchWild-caption-timing.json`. Previous versions are preserved in ignored `.dawnpatch/demo-production/captions-before-sync/`.

Alignment API documentation: https://elevenlabs.io/docs/api-reference/forced-alignment/create
