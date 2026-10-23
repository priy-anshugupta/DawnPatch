# Add an Entire agent-session link

## Current project state

Entire status: enabled; branch main; checkpoint remote origin. However, entire session list --json returned zero sessions and entire checkpoint list --json returned zero checkpoints. Codex hooks are currently empty because automatic shell hooks were paused during video recording to prevent terminal pop-ups. There is no recorded Entire session link to copy yet.

## Capture real work and get a link

1. Open PowerShell in the DawnPatch repository.

```powershell
cd "C:\Users\priya\Documents\Priyanshu My Projects\Hacktoberfest w2"
entire login
entire enable -y --agent codex
```

2. Complete the sign-in in the browser. Enabling Codex restores the capture hooks. In Codex, review the hooks and approve the ones belonging to your installed Entire CLI so they can capture activity. This reverses the temporary hook pause; enabling it may bring back the console-popup behavior seen earlier.
3. Use a focused agent session for a real DawnPatch change. Let Entire capture that work, then commit and push the reviewed change and its checkpoint. Installation alone does not capture past conversations.
4. Check that a session and checkpoint exist:

```powershell
entire session list
entire checkpoint list
```

5. Sign in at https://entire.io/, open the connected DawnPatch repository, find the recorded session, and copy its shareable page URL. Review the session before sharing: this project conversation included API credentials, so do not publish unchecked historical transcripts.
6. Open the copied link while signed out to check the judges can access it.
7. Replace the Entire entry’s pending link text in post.md with the actual URL. You can also add:

```markdown
## My Agent Session

[View the DawnPatch development session on Entire](PASTE_ACTUAL_ENTIRE_SESSION_URL)
```

Official workflow: https://entire.io/blog/sharing-sessions-is-the-new-social-coding
CLI reference: https://github.com/entireio/cli/blob/main/README.md
