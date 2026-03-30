# Claude Project Instructions

## About This Project
- **App Name:** Team App
- **Stack:** React 19 + Vite 8, Firebase (Auth, Firestore, Hosting, Storage), React Router DOM v7, jsPDF + jspdf-autotable + html2canvas + react-to-print (PDF/print features), Plain CSS (no Tailwind, no component library)
- **Editor:** VSCode
- **Commands:** npm run dev, npm run build, firebase deploy
- **GitHub Repo:** https://github.com/FalconChase/team-app
- **Owner:** FalconChase

## Project Structure
```
teamapp/
├── src/
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── App.css
│   ├── App.jsx
│   ├── firebase.js
│   ├── index.css
│   ├── main.jsx
│   └── theme-variables.css
├── public/
├── .env (local only, never pushed)
├── .gitignore
├── firebase.json
├── firestore.rules
├── storage.rules
├── vite.config.js
└── package.json
```

## About The App
- An ERP-style organizational management platform — people/department ERP, not traditional business ERP
- Core goal: interconnect department-wide data so it correlates across the whole organization, eliminating data silos
- Long-term vision: a scalable, company-agnostic framework adoptable by any organization or industry, with the ability to incorporate external tools over time
- Currently in early/baby stage — deployed and running on free-tier Firebase, being tested on one real team first
- The immediate focus is always one feature or fix at a time — do not suggest or introduce scope beyond what is asked
- Departments, roles, and members are configurable, not hardcoded
- Key output: unified cross-department data with exportable PDF reports for management

## Rules for Claude

### 1. At the start of every session
- Read this file first
- Wait for me to describe the change I want first
- Then ask me for the relevant current code before writing anything
- Fetch files using raw GitHub URLs in this format:
  `https://raw.githubusercontent.com/FalconChase/team-app/main/[filepath]`
- **After fetching any raw file, always verify it is the latest version** by asking me to run:
  ```powershell
  git log --oneline -1
  ```
  Then compare the commit hash and message against what GitHub shows. If anything looks off, wait 2-3 minutes and re-fetch before proceeding.

### 2. During the session
- I work in iterations — each conversation is usually one update, feature, or fix
- Do not rewrite things I didn't ask to change
- Do not suggest expanding scope, adding new dependencies, or future features unless asked
- If something is ambiguous, ask one focused clarifying question before proceeding
- Always use `import.meta.env.VITE_*` for environment variables — never hardcode keys or secrets

### 3. Code delivery rules
- **Always deliver the full rewritten file as a downloadable file** — regardless of how many lines it is
- Exception: if the change is a small isolated snippet under 100 lines with no surrounding context needed, paste inline — but still keep explanation brief
- After delivering code always follow up with:
  - What changed
  - Why it changed
  - Any risks or side effects
  - Short instruction on what to do with it (e.g. replace whole file, merge specific section, etc.)

### 4. At the end of every session
Always provide ready-to-copy git commands with a filled-in commit message:
```bash
git add .
git commit -m "describe exactly what changed"
git push
```
Then immediately ask me to run:
```powershell
git log --oneline -1
```
And paste the output here so I can confirm the commit hash matches what GitHub received. This is the CDN-proof way to verify a push landed correctly — do not skip this step.

### 5. After a successful update
- When I confirm the update is working, ask if I want a team announcement drafted
- Keep it concise, plain language, no technical jargon
- Format: what's new, what it does, why it matters to the team
- Should feel like an internal update message, not a changelog

### 6. Code change safety rules
- **Always prefer surgical edits** — identify the exact lines to change and deliver only those diffs, not a full rewrite
- **Full rewrites require explicit permission** — never rewrite an entire file unless I specifically ask for it
- **If surgical edits aren't practical** (e.g. too many scattered changes, structural conflict), stop and tell me:
  - Why surgical edits won't work
  - What a rewrite would affect
  - Give me the option to proceed or trade off features before touching anything
- **Before any edit**, confirm which section/block is being changed and why — one focused clarification if needed
- **Never silently remove or simplify existing features** to accommodate a new change — flag the conflict and let me decide

### 7. Conversation length warning
- Monitor thread length conservatively — warn early, before context degradation actually happens
- Warn at natural pause points only — **never interrupt mid-fix or mid-explanation**
- If a fix is in progress, finish it cleanly first, then warn immediately after
- Use this warning:
  > ⚠️ **This thread is getting long.** Consider starting a new session and pasting the instructions URL to keep things sharp.
- If the thread is extremely long and a new task is about to start, warn proactively before even beginning it

### 8. Session handoff prompt
- If I say anything like "let's continue in a new thread" or "start a fresh session", generate a ready-to-paste handoff prompt containing:
  - What we were working on
  - What was completed and confirmed working
  - What is still pending or in progress
  - Any important decisions, constraints, or context I'd need to carry over
- Format it so I can paste it directly into a new thread after the instructions URL

### 9. ⚡ CDN LAG AWARENESS — NON-NEGOTIABLE POWER RULE
- GitHub's raw CDN can serve stale/cached file content for 1-5 minutes after a push
- **Never treat a raw URL fetch alone as proof that code is current — ever**
- This rule cannot be skipped, assumed, or shortcut for any reason
- The only CDN-proof verification methods are:
  1. **Commit hash check** — ask me to run `git log --oneline -1` and compare the hash to GitHub's commit history
  2. **GitHub file view** — the non-raw GitHub file view (github.com/FalconChase/team-app/blob/main/...) updates immediately after a push, unlike raw URLs
- If I fetch a raw file and something looks outdated or inconsistent with what I'd expect, flag it immediately — do not proceed with potentially stale code
- If the raw content doesn't match what was reportedly just pushed, say so clearly and ask me to wait 2-3 minutes before re-fetching
- **This rule protects every other rule — stale code breaks everything downstream**

## How to Start a New Thread
1. Paste this URL to Claude:
   `https://raw.githubusercontent.com/FalconChase/team-app/main/CLAUDE_INSTRUCTIONS.md`
2. Say: "Read my instructions first"
3. Describe what you want to work on today