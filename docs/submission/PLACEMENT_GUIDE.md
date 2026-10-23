# DawnPatch submission package

Copy DEV_POST.md into DEV. Use the title in POST_TITLE.txt. The YouTube demo and all website screenshot URLs are already filled with public repository URLs. LOCAL_PREVIEW.md uses the same screenshot files locally.

## Screenshot order

1. 01-dawnpatch-workbench.png — What I Built, before the feature list; also suitable as the cover.
2. 02-sketchwild-before.png — Demo, after introducing the controlled five-minute regression.
3. 03-sketchwild-after.png — Demo, after explaining the developer-assisted correction.
4. 05-verification-checks.png — Demo, after the eight passing browser steps.
5. 04-reviewed-source-diff.png — How I Built It, after the six-step workflow.
6. 06-investigation-report.png — The Lazy Payoff, after the evidence-review handoff.
7. 07-sentry-issues.png — Monitoring and Debugging with Sentry, immediately above Prize Categories.
8. 08-sentry-connection-trace.png — the same Sentry section, after the Issues screenshot.

The first six PNGs are frames from the real website recording. The two Sentry PNGs were supplied from the real dashboard. Preserve the distinction between a connection test and model inference timing.

## Demo

https://youtu.be/6MC6XOIzUgU

The synchronized local video is docs/demo/DawnPatch-SketchWild-1080p-synced.mp4. It has small, speech-aligned bottom captions with a subtle backdrop.

## Categories and remaining evidence

Eight categories are listed. Entire still needs an accessible recorded-session URL; see ENTIRE_SESSION_STEPS.md. Sentry screenshots demonstrate errors and the 11.31 ms connection check, while model-span delivery and token metrics remain unverified. The article states those limits. TRACK_AUDIT.md checks all twenty categories.

Before publishing, preview all images and links and attach the real Entire session URL if entering that category. Keep the developer-assisted repair description. Code changes and docs are published to the linked repository; a historical successful Actions run is linked, and the latest push triggers fresh CI.

Challenge: https://dev.to/challenges/hacktoberfest-week3-2026-10-19
