# TEAM APP — Deployment Guide
## Step-by-Step Setup (Free, ~45 minutes total)

---

## WHAT YOU NEED BEFORE STARTING
- A Google account (Gmail)
- Node.js installed on your computer
  → Download from: https://nodejs.org (click "LTS" version)
- The teamapp folder (this folder)

---

## STEP 1 — Create Your Firebase Project (10 minutes)

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `team-app` (or anything you like)
4. Disable Google Analytics (not needed) → Click **"Create project"**
5. Wait for it to load, then click **"Continue"**

---

## STEP 2 — Set Up Firebase Authentication (5 minutes)

1. In the Firebase console, click **"Authentication"** in the left menu
2. Click **"Get started"**
3. Click **"Email/Password"**
4. Toggle **"Email/Password" to ON**
5. Click **"Save"**

---

## STEP 3 — Set Up Firestore Database (5 minutes)

1. Click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select a location closest to you (e.g., **asia-southeast1** for Philippines)
5. Click **"Enable"**

---

## STEP 4 — Set Up Firebase Storage (3 minutes)

1. Click **"Storage"** in the left menu
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Click **"Next"** then **"Done"**

---

## STEP 5 — Get Your Firebase Config (5 minutes)

1. Click the **gear icon** next to "Project Overview" → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click the **"</>"** (web) icon
4. Register app name: `teamapp` → Click **"Register app"**
5. You will see a code block with your config. It looks like this:

```
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456:web:abc123"
};
```

6. **Copy these values** — you need them in Step 6.

---

## STEP 6 — Connect Firebase to the App (5 minutes)

1. Open the file: `teamapp/src/firebase.js`
2. Replace the placeholder values with YOUR values from Step 5:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY_HERE",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN_HERE",
  projectId: "YOUR_ACTUAL_PROJECT_ID_HERE",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID_HERE",
  appId: "YOUR_ACTUAL_APP_ID_HERE"
};
```

3. Save the file.

---

## STEP 7 — Build and Deploy (10 minutes)

Open a terminal/command prompt in the `teamapp` folder and run these commands one by one:

```bash
# Install Firebase tools (only needed once)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase hosting
firebase init hosting
```

When prompted during `firebase init hosting`:
- "Which Firebase project?" → Select your project
- "What do you want to use as your public directory?" → Type: `dist`
- "Configure as single-page app?" → Type: `y`
- "Set up automatic builds with GitHub?" → Type: `n`
- "File dist/index.html already exists. Overwrite?" → Type: `n`

Then run:
```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

After deploy, you'll see a URL like:
**https://your-project-id.web.app**

That's your live app! 🎉

---

## STEP 8 — First Login (2 minutes)

1. Open the URL in your browser
2. Click **"Create Account"** (not "Request to Join")
3. Enter your name, username, and password
4. You'll be taken to the **Team Setup** page
5. Enter your Department name and Team name
6. Click **"Create Team & Continue"**
7. You are now the first Admin!

---

## STEP 9 — Invite Your Team (ongoing)

1. Go to the **Members** tab
2. Share your **Invite Code** (shown in top right) with your team
3. Team members go to the app URL → Click "Request to Join a Team"
4. Enter the invite code → Fill in their details
5. You (Admin) get a notification → Go to Members → Approve them

---

## FIRESTORE SECURITY RULES (Important — do this before going live)

In Firebase Console → Firestore → Rules, replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null;
    }
    match /teams/{teamId} {
      allow read, write: if request.auth != null;
    }
    match /papers/{paperId} {
      allow read, write: if request.auth != null;
    }
    match /announcements/{id} {
      allow read, write: if request.auth != null;
    }
    match /messages/{id} {
      allow read, write: if request.auth != null;
    }
    match /memberFiles/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## TROUBLESHOOTING

**"firebase: command not found"**
→ Close and reopen your terminal after installing firebase-tools

**"Permission denied" errors**
→ Make sure you ran `firebase login` and are logged into the right Google account

**App shows blank page**
→ Double-check your firebase.js config values — one wrong character breaks it

**"Invalid API key" error in the app**
→ Re-copy the config from Firebase Console → Project Settings → Your Apps

---

## FREE TIER LIMITS (Firebase Spark Plan)
Your team of 2–10 people will comfortably stay within free limits:
- 50,000 document reads/day
- 20,000 document writes/day
- 1 GB file storage
- 10 GB hosting bandwidth/month

These limits reset daily/monthly and are very generous for a small team.
