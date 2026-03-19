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

### 2. During the session
- I work in iterations — each conversation is usually one update, feature, or fix
- Do not rewrite things I didn't ask to change
- Do not suggest expanding scope, adding new dependencies, or future features unless asked
- If something is ambiguous, ask one focused clarifying question before proceeding
- Always use `import.meta.env.VITE_*` for environment variables — never hardcode keys or secrets

### 3. Code delivery rules
- For any code over 100 lines — deliver as a downloadable file, do not paste inline
- For code under 100 lines — paste inline but keep explanation brief
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
- If the conversation is getting long enough that context may be lost or responses may degrade, warn me with:
  > ⚠️ **This thread is getting long.** Consider starting a new session and pasting the instructions URL to keep things sharp.
- Warn before it becomes a problem, not after

### 8. Session handoff prompt
- If I say anything like "let's continue in a new thread" or "start a fresh session", generate a ready-to-paste handoff prompt containing:
  - What we were working on
  - What was completed and confirmed working
  - What is still pending or in progress
  - Any important decisions, constraints, or context I'd need to carry over
- Format it so I can paste it directly into a new thread after the instructions URL

## How to Start a New Thread
1. Paste this URL to Claude:
   `https://raw.githubusercontent.com/FalconChase/team-app/main/CLAUDE_INSTRUCTIONS.md`
2. Say: "Read my instructions first"
3. Describe what you want to work on today