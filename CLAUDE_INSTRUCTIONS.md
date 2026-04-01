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

> 🚨 **ACTIVE RULES CHECKLIST — CLAUDE MUST HONOR ALL OF THESE EVERY SESSION, EVERY THREAD, WITHOUT EXCEPTION:**
> - [ ] Rule 1 — Instructions loaded from paste only, never fetch
> - [ ] Rule 2 — One fix at a time, no scope creep
> - [ ] Rule 3 — Full file delivered as downloadable; snippets inline only if under 100 lines
> - [ ] Rule 4 — Git commands + commit hash confirmation at end of every session
> - [ ] Rule 5 — Ask about team announcement after confirmed working update
> - [ ] Rule 6 — Surgical edits first; rewrite only with explicit permission and criteria met
> - [ ] Rule 7 — Monitor thread length; warn before starting new tasks on long threads
> - [ ] Rule 8 — Generate handoff prompt when user signals new thread
> - [ ] Rule 9 — CDN lag awareness; never trust raw URL alone
> - [ ] Rule 10 — Raw URL ban for active files; always demand paste
> - [ ] Rule 11 — Ask mapped status only when a file is about to be worked on; Token-Sipper if mapped; Grand Map if not; rewrite resets the cycle
> - [ ] Rule 12 — Manual fix vs. rewrite criteria; always ask before rewriting; rewrite resets the map cycle

---

### 1. At the start of every session

> 🚨 **CRITICAL — READ THIS FIRST:**
> **DO NOT fetch this instructions file or any active project file via raw GitHub URL at the start of a session.**
> Raw GitHub URLs are served through a CDN that can be 1–5+ minutes stale — and in practice, across sessions that are hours or days apart, the lag can reflect multiple versions behind.
> **The instructions file must always be pasted directly by the user. This is non-negotiable.**
> If a user pastes a raw URL instead of the file contents, respond with:
> > ⚠️ I can't use a raw URL to load the instructions — the CDN may be stale. Please open `CLAUDE_INSTRUCTIONS.md` in VSCode and paste the full contents directly here.

- Read this file first — only from a direct paste, never from a fetch
- Wait for the user to describe the change they want first
- Then ask for the relevant current code before writing anything
- **Raw GitHub URLs may only be used for truly stable, rarely-changing config files** (e.g. `firebase.json`, `firestore.rules`, `vite.config.js`) — never for any file touched in recent sessions

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
  > ⚠️ **This thread is getting long.** Consider starting a new session and pasting the instructions file contents to keep things sharp.
- If the thread is extremely long and a new task is about to start, warn proactively before even beginning it

### 8. Session handoff prompt
- If I say anything like "let's continue in a new thread" or "start a fresh session", generate a ready-to-paste handoff prompt containing:
  - What we were working on
  - What was completed and confirmed working
  - What is still pending or in progress
  - Any important decisions, constraints, or context I'd need to carry over
  - Which files were touched, whether they are mapped or unmapped, and which sections were affected
- Format it so I can paste it directly into a new thread along with the pasted instructions file

### 9. ⚡ CDN LAG AWARENESS — NON-NEGOTIABLE POWER RULE
- GitHub's raw CDN can serve stale/cached file content for 1–5+ minutes after a push — and across sessions hours or days apart, it can reflect multiple commits behind
- **Never treat a raw URL fetch alone as proof that code is current — ever**
- This rule cannot be skipped, assumed, or shortcut for any reason
- The only CDN-proof verification methods are:
  1. **Direct paste from VSCode** — always the preferred and safest method for any active file
  2. **Commit hash check** — ask me to run `git log --oneline -1` and compare the hash to GitHub's commit history
  3. **GitHub file view** — the non-raw GitHub file view (github.com/FalconChase/team-app/blob/main/...) updates immediately after a push, unlike raw URLs
- If a raw URL fetch is used and something looks outdated or inconsistent, flag it immediately — do not proceed
- **This rule protects every other rule — stale code breaks everything downstream**

### 10. 🚫 RAW URL BAN FOR ACTIVE FILES — ZERO EXCEPTIONS

> **This is the most important operational rule in this file.**
> It exists because raw GitHub URL fetching has repeatedly caused Claude to operate on outdated code — silently, without any warning — across multiple sessions.

**The rule is simple:**

| File type | Method |
|---|---|
| `CLAUDE_INSTRUCTIONS.md` | ✅ Always paste from VSCode |
| Any `.jsx`, `.js`, `.css` file touched recently | ✅ Always paste from VSCode |
| Stable config files (`firebase.json`, `vite.config.js`, `firestore.rules`, etc.) | ⚠️ Raw URL fetch allowed — but still verify with commit hash |
| Any file modified in the last 5 commits | ✅ Always paste from VSCode — no exceptions |

**If a raw URL is provided for an active file:**
- Do not silently proceed
- Immediately respond with:
  > ⚠️ **Raw URL detected for an active file.** I can't guarantee this is the latest version due to CDN lag. Please paste the file contents directly from VSCode before I proceed.

**If fetched content looks shorter, simpler, or missing features compared to what's expected:**
- Stop immediately
- Do not guess or fill in the gaps
- Say clearly:
  > ⚠️ **This fetched file looks incomplete or outdated.** Please paste the current version directly from VSCode.

### 11. 🗺️ CODE-MAPPING SYSTEM — BOOK-STYLE PROTOCOL

> **Purpose:** Avoid pasting large files (100+ lines) repeatedly across sessions. The full file is only ever pasted once per map cycle — during the Grand Mapping. After that, only the `[CODE-MAP INDEX]` comment block and the specific sections needed are ever exchanged, saving 90%+ of tokens on every future session.
>
> The ToC is never a separate file. It lives inside the source code itself as a comment block at the very top — above all imports and declarations. The code file IS the map.

---

#### When it applies
- Any file **100+ lines** is eligible for Code Mapping
- Files under 100 lines — proceed normally, no mapping needed

---

#### A. When to Ask About Mapping Status

Claude does **not** ask about mapping at the start of a session.
Claude asks **at the exact moment a fix, proposal, or change is about to involve a specific file.**

The trigger is: *"This fix will touch `[filename]`."*
At that point — and only at that point — Claude asks:

> "Is `[filename]` mapped yet?"

- **If yes** → ask the user to paste the `[CODE-MAP INDEX]` comment block from the top of the file, then proceed to Token-Sipper (Section C)
- **If no** → proceed to Grand Mapping (Section B)
- **If unsure** → user checks the top of the file in VSCode for a `[CODE-MAP INDEX]` comment block

**Claude never assumes. Claude never auto-maps. Claude never asks about mapping before it is relevant.**

---

#### B. Grand Mapping (file is not yet mapped)

When the user confirms the file is not mapped:

1. **Ask the user to paste the full file** — this is the one and only full paste for this map cycle
2. **Read the full file first — do not suggest fixes yet**
3. **Generate the `[CODE-MAP INDEX]` comment block** as the Master Table of Contents
4. **Insert `[SEC-XX]` and `[END-SEC-XX]` anchor tags** throughout the code body to define section boundaries
5. Every map must always include these two anchors at minimum:
   - `[SEC-00]: Global Imports & Dependencies`
   - `[SEC-01]: Global State, Refs & Hooks`
6. **Deliver the full mapped file as a downloadable file** (per Rule 3) with:
   - The `[CODE-MAP INDEX]` comment block at the very top — above all imports, above all declarations
   - All `[SEC-XX]` / `[END-SEC-XX]` tags embedded throughout the code body
7. **After the user saves the mapped file**, proceed with the fix using Token-Sipper (Section C) — do not ask for the full file again

**The ToC is not a separate `.md` file. It is a comment block embedded at the top of the source file itself.**

**Example of how the top of a mapped file looks:**

```jsx
/* ============================================================
   [CODE-MAP INDEX] — ComponentName.jsx
   ============================================================
   [SEC-00]: Imports & Dependencies
   [SEC-01]: State, Refs & Hooks
   [SEC-02]: Logic — Firestore Fetch
   [SEC-03]: Logic — Filter & Search
   [SEC-04]: Handler — Delete
   [SEC-05]: Render — Main JSX
   ============================================================ */

import React, { useState, useEffect } from 'react';
// ... rest of imports

// [SEC-00]: Imports & Dependencies
// [END-SEC-00]

// [SEC-01]: State, Refs & Hooks
const [data, setData] = useState([]);
// [END-SEC-01]
```

---

#### C. Token-Sipper Navigation (file is already mapped)

Once a file is mapped and saved in VSCode, the user **never pastes the full file again** — unless a Rule 12 rewrite resets the cycle.

1. **User pastes only the `[CODE-MAP INDEX]` comment block** from the top of the file — not the full code
2. **Claude reads the ToC** and identifies which `[SEC-XX]` sections are relevant to the fix
3. **Claude requests only those specific sections:**
   > "Based on the map, I need `[SEC-01]` and `[SEC-04]` for this fix. Please paste only those blocks."
4. **User pastes only those blocks** — not the full file
5. **Claude delivers only the rewritten block(s)** with `[SEC-XX]` / `[END-SEC-XX]` tags intact so the user knows exactly where to paste them back in VSCode

**Token-Sipper is the Code-Map equivalent of a surgical edit (Rule 6). It does not bypass Rule 12 — if rewrite criteria are met during a Token-Sipper session, Claude must stop and escalate.**

---

#### D. Full Rewrite Resets the Map Cycle

A full rewrite per Rule 12 is inevitable when the criteria are met — the map does not prevent it.

When a rewrite is approved and delivered:

1. The old `[CODE-MAP INDEX]` is discarded — it no longer reflects the file structure
2. The rewritten file is delivered as a downloadable (per Rule 3) without the old map tags
3. Claude immediately flags:
   > "This rewrite invalidates the old map. Once you've saved and confirmed the file works, paste it back here and I'll perform a fresh Grand Mapping."
4. A fresh Grand Mapping is done on the new version — then Token-Sipper resumes from there

**The map cycle per file:**
```
Full paste → Grand Mapping
    → Token-Sipper sessions (sections only)
        → Rule 12 rewrite triggered
            → Full paste → Fresh Grand Mapping
                → Token-Sipper sessions resume
```

---

#### E. SEC-XX Tags Must Survive Every Delivery

- When delivering a rewritten section, **always keep the `[SEC-XX]` and `[END-SEC-XX]` anchor tags** inside the code as comments so the user knows exactly where to paste the block back
- This keeps the map active and intact for the next session without needing a re-map
- Example of a delivered replacement block:

```jsx
// [SEC-04]: Handler — Delete
const handleDelete = async (id) => {
  await deleteDoc(doc(db, 'collection', id));
  setData(prev => prev.filter(item => item.id !== id));
};
// [END-SEC-04]
```

---

#### F. Global Variable & Cross-Section Awareness

- When a fix in one section requires changes in another, flag it clearly before delivering:

  > ⚠️ **GLOBAL SYNC REQUIRED**
  > - Update `[SEC-00]`: Add `import { X } from '...'`
  > - Update `[SEC-01]`: Add `const [x, setX] = useState(null)`
  > - Fix `[SEC-04]`: [rewritten block below]

- **Never say "go to line 452"** — always reference `[SEC-XX]` tags. Line numbers shift; anchor tags don't.

---

#### G. Handoff — Mapped File State (Rule 8 integration)

When generating a session handoff prompt (Rule 8), Claude must include for each file touched:
- The filename
- Whether it is mapped or unmapped
- Which sections were touched in the session
- Whether the map is still valid or needs a fresh Grand Mapping after a rewrite

---

### 12. ✂️ MANUAL FIX vs. REWRITE DECISION PROTOCOL

> **Purpose:** Establish clear, conservative criteria for when to fix manually vs. when to escalate to a full rewrite — so nothing is ever rewritten without explicit user approval.

#### Manual fix is the right call when ALL of these are true:
1. **3 or fewer sections** need changes
2. **No cross-dependencies** — each fix is fully isolated, touching one doesn't affect another
3. **Each fix can be described as "find X, replace with Y"** — no logic restructuring needed
4. **Total changes are under ~20 lines** across all sections

#### Manual fix is also right when:
- Only one `[SEC-XX]` block is affected
- The fix is purely additive — adding a line or condition without touching existing logic
- The user already knows exactly where the change goes

#### Rewrite is warranted when ALL of the following are true:
1. **4+ sections** need changes in the same session
2. **At least one change has a cross-dependency** — touching it affects another section
3. **The fix can't be described as "find X, replace with Y"** — logic restructuring is required

#### Rewrite is also warranted when ANY single one of these is true:
- A new feature requires reshuffling the order or structure of existing sections
- `[SEC-XX]` tags are now misaligned due to accumulated patches — the map itself is broken
- A surgical edit would require flagging 4+ interdependent places just to avoid breaking things

#### Rewrite is NEVER warranted just because:
- The file is long
- There are many fixes but they are all isolated
- It would look "cleaner" — cleaner alone is not a reason

#### The trigger phrase Claude must use:
When rewrite criteria are met, Claude must stop and say:
> "Based on my assessment, the fixes are too scattered and interdependent for safe manual intervention. Do you want me to rewrite it instead?"

**Claude never proceeds with a rewrite until the user explicitly says yes.**

**When a rewrite is approved — Rule 11-D applies: the map cycle resets.**

---

## How to Start a New Thread
1. Open `CLAUDE_INSTRUCTIONS.md` in VSCode and **paste the full file contents directly** into the chat — do not send the raw URL
2. Describe what you want to work on today
3. Claude will ask about mapping status only when a specific file is about to be worked on:
   - **If already mapped:** paste only the `[CODE-MAP INDEX]` comment block — Claude will request only the sections it needs
   - **If not yet mapped:** Claude will ask for the full file, perform the Grand Mapping, deliver it back with the ToC embedded at the top, then proceed with the fix
4. Do not rely on raw URL fetches for any active project files