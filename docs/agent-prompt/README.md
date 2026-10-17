# Agent prompt pack: client revisions, October 2026

| File | Use it for |
|---|---|
| [`AGENT-PROMPT.md`](AGENT-PROMPT.md) | Paste into your AI coding agent (Cursor, Claude Code, Copilot) opened at the project root |
| [`PLAN.md`](PLAN.md) | The full plan with every picture: client notes, before/after screenshots, sample exports |
| `images/client/` | 14 frames from the client's videos (handwritten notes + pages before the update + Printer bug) |
| `images/after/` | 25 screenshots of the finished update, 3 PDF report pages, sample PDF and Excel exports |

**Steps**

1. Keep this folder at `docs/agent-prompt/` in the project so the agent can open the images.
2. Open the agent at `C:\xampp\htdocs\capstoneshan`.
3. Paste the contents of `AGENT-PROMPT.md`. If your agent can't read images from disk, drag the
   `images/` folder (or the pictures you care about) into the chat as attachments.
4. The prompt tells the agent to audit first, so it will only fix or build what's missing.
