# Claude Project Instructions

## About This Project
- **App Name:** Team App
- **Stack:** React 19 + Vite 8, Firebase (Auth, Firestore, Hosting, Storage), React Router DOM v7, jsPDF + jspdf-autotable + html2canvas + react-to-print (PDF/print features), Plain CSS (no Tailwind, no component library)
- **Editor:** VSCode
- **Terminal:** PowerShell — always write terminal commands in PowerShell syntax
- **Commands:** `npm run dev`, `npm run build`, `firebase deploy`
- **GitHub Repo:** https://github.com/FalconChase/team-app
- **Firebase Console:** https://console.firebase.google.com/project/team-app-98520/overview
- **Hosting URL:** https://team-app-98520.web.app
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

---

## Rules for Claude — Read and Follow Every Single One

### 1. At the start of every session
- Fetch and read this file first before doing anything else
- Read the session summary the user pastes — treat it as absolute ground truth for what was already fixed
- Fetch all relevant files fresh from GitHub before writing any code:
  `https://raw.githubusercontent.com/FalconChase/team-app/refs/heads/main/[filepath]`
- Never rely on files seen in a previous thread — always re-fetch from GitHub
- Wait for the user to describe what they want → fetch relevant files → then write code

### 2. THE MOST IMPORTANT RULE — No second-guessing, no looping
- **GitHub is always the source of truth.** Always fetch fresh before touching any file.
- **Session summary says it's fixed? Trust it. Do not re-investigate or overwrite it.**
- **Only change what was asked.** Everything else stays byte-for-byte identical to what GitHub returned.
- **Always deliver a full file rewrite** — even for the smallest one-line change. Never deliver partial patches or inline diffs. The user replaces the whole file every time.
- **Never base a rewrite on a version from earlier in the conversation** if a newer fetch exists. Always use the most recently fetched version as the base.
- **If multiple things are broken, fix ALL of them in one pass.** Fetch → identify all issues → apply all fixes → deliver once.
- **Do not ask clarifying questions about things already in the session summary.**

### 3. During the session
- One fix or feature at a time — do not bundle unrelated changes
- Do not rewrite things that weren't asked to change
- Do not suggest new scope, new dependencies, or future features unless asked
- If something is ambiguous, ask ONE focused question before proceeding
- Always use `import.meta.env.VITE_*` for environment variables — never hardcode secrets
- Terminal is PowerShell — never use bash-only syntax

### 4. Code delivery rules
- **Always deliver a full file rewrite** — no exceptions, even for tiny fixes
- Deliver as a downloadable file (not pasted inline) since files are almost always over 100 lines
- After delivering the file, always follow up with:
  - What changed (specific lines/sections)
  - Why it changed
  - Any risks or side effects
  - Which folder to place the file in

### 5. Step-by-step confirmation flow — follow this after every fix
After delivering a fixed file, Claude must walk the user through every step and wait for confirmation before moving to the next. Do not skip steps. Do not bundle steps.

**Step 1 — Test locally:**
> "Replace the file and run `npm run dev`. Does the fix work? Tell me what you see."

Wait for user response.
- If broken → user describes the issue → fix it → repeat Step 1
- If working → move to Step 2

**Step 2 — Push to GitHub:**
> "Good. Push it to GitHub now before anything else:"
> ```powershell
> git add .
> git commit -m "[filled-in message]"
> git push
> ```
> "Confirm when done."

Wait for user confirmation.

**Step 3 — Deploy to Firebase:**
> "Now deploy it live:"
> ```powershell
> firebase deploy
> ```
> "Confirm when done."

Wait for user confirmation.

**Step 4 — Verify live app:**
> "Check the live app at https://team-app-98520.web.app — does everything look correct?"

Wait for user confirmation.
- If broken on live → investigate → fix → restart from Step 1
- If confirmed working → move to Step 5

**Step 5 — Session summary:**
Output the filled-in session summary block (see template below) so the user can copy it for the next thread.

### 6. After a successful update
- Ask if the user wants a team announcement drafted
- Keep it concise, plain language, no technical jargon
- Format: what's new, what it does, why it matters to the team
- Should feel like an internal update message, not a changelog

---

## How to Start a New Thread

Paste this exact block at the start of every new thread:

```
Read my instructions first:
https://raw.githubusercontent.com/FalconChase/team-app/main/CLAUDE_INSTRUCTIONS.md

Session summary from last thread:
[paste summary here]

What I want to work on today:
[describe the fix or feature]
```

---

## Session Summary Template

Claude must output this at the end of every session, fully filled in:

```
COMPLETED THIS SESSION:
- [every fix or feature completed, be specific]

STILL BROKEN / NEXT UP:
- [anything not yet fixed, or what comes next]

KEY FILES TOUCHED:
- [filepath] — [what changed]
```