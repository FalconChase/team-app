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

## Connected External Tools
The team app integrates with external tools embedded as iframes in the Tools tab. These are separate apps with their own repos and deployment pipelines.

### Weather Tool
- **URL:** `https://weather-tool.web.app`
- **Repo:** `https://github.com/FalconChase/weather-tool`
- **Stack:** React 19 + Vite, TypeScript, Tailwind CSS (via Vite build — NOT CDN), Firebase Hosting
- **Integration:** Team app sends project data via `postMessage` to the weather tool iframe
- **postMessage origin:** `https://team-app-98520.web.app`
- **Message type:** `PROJECT_AUTOFILL`
- **Fields sent:** `contractId`, `projectName`, `contractor`, `location`
- **Fix guide:** See `docs/TAILWIND_FIX_GUIDE.md` in the weather tool repo

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

### 6. Weather tool — Tailwind rules (NEVER violate these)
The weather tool uses Tailwind CSS processed by Vite at build time. These rules are permanent and must never be changed:

- **NEVER remove** `@tailwind base`, `@tailwind components`, `@tailwind utilities` from the top of `index.css` in the weather tool — removing these breaks all styles
- **NEVER add** `<script src="https://cdn.tailwindcss.com">` to `index.html` — the CDN is redundant and conflicts with the Vite build
- **ALWAYS build before deploying** the weather tool: `npm run build && firebase deploy` — never `firebase deploy` alone
- If styles appear broken, check `docs/TAILWIND_FIX_GUIDE.md` before making any changes

## How to Start a New Thread
1. Paste this URL to Claude:
   `https://raw.githubusercontent.com/FalconChase/team-app/main/CLAUDE_INSTRUCTIONS.md`
2. Say: "Read my instructions first"
3. Describe what you want to work on today