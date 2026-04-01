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
> - [ ] Rule 11 — Code-Map large files (100+ lines); Token-Sipper fetching after first map
> - [ ] Rule 12 — Manual fix vs. rewrite criteria; always ask before rewriting

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

### 11. 🗺️ CODE-MAPPING SYSTEM — TOKEN-EFFICIENT LARGE FILE PROTOCOL

> **Purpose:** Avoid pasting 1,000+ line files repeatedly across sessions. Once a large file is mapped, only the relevant sections are ever pasted — saving 90%+ of tokens on future sessions.

#### When it applies
- Any file **100+ lines** gets a Code Map on its first appearance in a session
- Files under 100 lines — proceed normally, no mapping needed

#### A. Grand Mapping (first time a large file is introduced)
When a 100+ line file is pasted for the first time, Claude must:
1. **Read the full file first — do not suggest fixes yet**
2. **Generate a Master Table of Contents (ToC)** using `[SEC-XX]` anchor tags
3. Every map must always include these two anchors:
   - `[SEC-00]: Global Imports & Dependencies`
   - `[SEC-01]: Global State & Variables (useState/useEffect hooks)`
4. Deliver the ToC as a **downloadable `.md` file** so the user can save it and reuse it across sessions

**Example ToC format:**
```
[SEC-00]: Global Imports & Dependencies — lines ~1–25
[SEC-01]: Global State & Variables — lines ~26–60
[SEC-02]: Firestore Fetch Logic — lines ~61–110
[SEC-03]: Filter & Search Logic — lines ~111–150
[SEC-04]: Delete Handler — lines ~151–180
[SEC-05]: Render — JSX Return — lines ~181–350
```

#### B. Token-Sipper Fetching (all sessions after the first map)
Once a file is mapped, the user never pastes the full file again:
1. **User pastes only the ToC** at the start of the session
2. **Claude identifies** which `[SEC-XX]` sections are relevant to the task
3. **Claude requests only those sections:**
   > "Please paste the code inside `[SEC-00]`, `[SEC-01]`, and `[SEC-04]` only."
4. User pastes only those blocks — not the full file

#### C. SEC-XX tags must survive delivery
- When delivering a rewritten section or full file, **always keep the `[SEC-XX]` anchor tags** inside the code as comments
- This keeps the map active for the next session without needing a re-map
- Example:
  ```jsx
  // [SEC-04]: Delete Handler
  const handleDelete = async (id) => {
    ...
  };
  // [END-SEC-04]
  ```

#### D. Surgical delivery with Code-Map
- Never say "go to line 452" — always say "find `[SEC-04]`"
- Deliver only the replacement block with its anchor tags intact
- If a fix in one section requires changes in another, flag it first:

  > ⚠️ **GLOBAL SYNC REQUIRED**
  > - Update `[SEC-00]`: Add `import { X } from '...'`
  > - Update `[SEC-01]`: Add `const [x, setX] = useState(null)`
  > - Fix `[SEC-04]`: [snippet below]

#### E. Re-mapping
- If a file has been heavily rewritten since the last map, the old ToC is stale — discard it and do a fresh Grand Mapping on the new version

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

---

## How to Start a New Thread
1. Open `CLAUDE_INSTRUCTIONS.md` in VSCode and **paste the full file contents directly** into the chat — do not send the raw URL
2. Describe what you want to work on today
3. For any large file (100+ lines) being worked on:
   - **First session:** paste the full file — Claude will generate the Code Map
   - **Subsequent sessions:** paste the saved ToC only, then paste only the sections Claude asks for
4. Do not rely on raw URL fetches for any active project files