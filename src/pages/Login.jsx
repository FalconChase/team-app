import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Login() {
  // mode: "home" | "login" | "join" | "join-register" | "create-register"
  const [mode, setMode] = useState("home");
  const [form, setForm] = useState({ username: "", password: "", displayName: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinTeam, setJoinTeam] = useState(null);
  const { login, register, checkUsernameAvailable } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const reset = (m) => { setError(""); setForm({ username: "", password: "", displayName: "", inviteCode: "" }); setJoinTeam(null); setMode(m); };

  // ── Sign In ────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch {
      setError("Invalid username or password. Please try again.");
    }
    setLoading(false);
  }

  // ── Join: look up invite code ──────────────────────────────────────────────
  async function handleInviteLookup(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "teams"), where("inviteCode", "==", form.inviteCode.toUpperCase().trim()))
      );
      if (snap.empty) {
        setError("Invalid invite code. Please check with your team admin and try again.");
        setLoading(false);
        return;
      }
      setJoinTeam({ id: snap.docs[0].id, ...snap.docs[0].data() });
      setMode("join-register");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  // ── Register (shared for join & create) ───────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);

    if (form.username.trim().length < 3) { setError("Username must be at least 3 characters."); setLoading(false); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    if (!form.displayName.trim()) { setError("Please enter your full name."); setLoading(false); return; }

    try {
      const available = await checkUsernameAvailable(form.username);
      if (!available) { setError("That username is already taken. Please choose another."); setLoading(false); return; }

      await register(form.username, form.password, form.displayName, joinTeam?.id || null);

      if (joinTeam) {
        navigate("/pending");
      } else {
        navigate("/setup");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    }
    setLoading(false);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: { minHeight: "100vh", background: "#0f2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Tahoma, Geneva, sans-serif" },
    card: { background: "#fff", borderRadius: "12px", padding: "36px 32px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
    logo: { textAlign: "center", marginBottom: "28px" },
    logoTitle: { fontSize: "24px", fontWeight: "600", color: "#1a3a5c", letterSpacing: "2px" },
    logoSub: { fontSize: "11px", color: "#7a9ab8", letterSpacing: "0.5px", marginTop: "4px" },
    label: { display: "block", fontSize: "12px", color: "#5a7a9a", marginBottom: "6px", fontWeight: "500" },
    input: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d0dde8", fontSize: "13px", fontFamily: "Tahoma, Geneva, sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "14px" },
    btn: { width: "100%", padding: "11px", borderRadius: "6px", border: "none", background: "#1a3a5c", color: "#fff", fontSize: "13px", fontFamily: "Tahoma, Geneva, sans-serif", cursor: "pointer", fontWeight: "600", marginTop: "4px" },
    btnOutline: { width: "100%", padding: "11px", borderRadius: "6px", border: "1.5px solid #1a3a5c", background: "transparent", color: "#1a3a5c", fontSize: "13px", fontFamily: "Tahoma, Geneva, sans-serif", cursor: "pointer", fontWeight: "500", marginTop: "8px" },
    btnGhost: { width: "100%", padding: "11px", borderRadius: "6px", border: "1.5px solid #d0dde8", background: "transparent", color: "#888", fontSize: "13px", fontFamily: "Tahoma, Geneva, sans-serif", cursor: "pointer", marginTop: "8px" },
    error: { background: "#fcebeb", color: "#a32d2d", borderRadius: "6px", padding: "10px 12px", fontSize: "12px", marginBottom: "14px" },
    backLink: { display: "block", textAlign: "center", marginTop: "16px", fontSize: "12px", color: "#7a9ab8", cursor: "pointer", textDecoration: "underline" },
    divider: { textAlign: "center", color: "#ccc", fontSize: "11px", margin: "6px 0 14px", letterSpacing: "0.5px" },
    teamBox: { background: "#e6f1fb", border: "1px solid #b5d4f4", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "#185fa5" },
    sectionTitle: { fontSize: "17px", fontWeight: "600", color: "#1a3a5c", marginBottom: "4px" },
    sectionSub: { fontSize: "12px", color: "#888", marginBottom: "20px" },
    optionBtn: {
      width: "100%", padding: "14px 16px", borderRadius: "8px",
      border: "1.5px solid #d0dde8", background: "#f7fafc",
      cursor: "pointer", textAlign: "left", fontFamily: "Tahoma, Geneva, sans-serif",
      marginBottom: "10px", display: "flex", alignItems: "center", gap: "14px",
      transition: "border-color 0.15s, background 0.15s"
    },
    optionIcon: { fontSize: "22px", flexShrink: 0 },
    optionLabel: { fontSize: "13px", fontWeight: "600", color: "#1a3a5c", display: "block", marginBottom: "2px" },
    optionDesc: { fontSize: "11px", color: "#888", display: "block" },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* ── Logo ── */}
        <div style={s.logo}>
          <div style={s.logoTitle}>TEAM APP</div>
          <div style={s.logoSub}>Team Mapped by an App</div>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* ════════════════════════════════════════════════════
            HOME — 3 options
        ════════════════════════════════════════════════════ */}
        {mode === "home" && (
          <div>
            <div style={s.sectionTitle}>Welcome</div>
            <div style={s.sectionSub}>Choose an option to get started.</div>

            {/* Sign In */}
            <button style={s.optionBtn} onClick={() => reset("login")}>
              <span style={s.optionIcon}>🔑</span>
              <span>
                <span style={s.optionLabel}>Sign In</span>
                <span style={s.optionDesc}>I already have an account</span>
              </span>
            </button>

            {/* Join a Team */}
            <button style={s.optionBtn} onClick={() => reset("join")}>
              <span style={s.optionIcon}>🤝</span>
              <span>
                <span style={s.optionLabel}>Join a Team</span>
                <span style={s.optionDesc}>I have an invite code from my admin</span>
              </span>
            </button>

            {/* Create a Team */}
            <button style={s.optionBtn} onClick={() => reset("create-register")}>
              <span style={s.optionIcon}>🏗️</span>
              <span>
                <span style={s.optionLabel}>Create a Team</span>
                <span style={s.optionDesc}>Set up a new team as admin</span>
              </span>
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            SIGN IN
        ════════════════════════════════════════════════════ */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <div style={s.sectionTitle}>Sign In</div>
            <div style={s.sectionSub}>Enter your username and password.</div>

            <label style={s.label}>Username</label>
            <input
              style={s.input} value={form.username}
              onChange={e => set("username", e.target.value)}
              placeholder="Enter your username" autoFocus
            />
            <label style={s.label}>Password</label>
            <input
              style={s.input} type="password" value={form.password}
              onChange={e => set("password", e.target.value)}
              placeholder="Enter your password"
            />
            <button style={s.btn} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <span style={s.backLink} onClick={() => reset("home")}>← Back</span>
          </form>
        )}

        {/* ════════════════════════════════════════════════════
            JOIN — Step 1: Enter invite code
        ════════════════════════════════════════════════════ */}
        {mode === "join" && (
          <form onSubmit={handleInviteLookup}>
            <div style={s.sectionTitle}>Join a Team</div>
            <div style={s.sectionSub}>Enter the invite code shared by your team admin.</div>

            <label style={s.label}>Team Invite Code</label>
            <input
              style={{ ...s.input, fontFamily: "monospace", letterSpacing: "2px", textTransform: "uppercase" }}
              value={form.inviteCode}
              onChange={e => set("inviteCode", e.target.value)}
              placeholder="e.g. XK29PLMZ" autoFocus maxLength={10}
            />
            <button style={s.btn} disabled={loading || !form.inviteCode.trim()}>
              {loading ? "Looking up…" : "Continue →"}
            </button>
            <span style={s.backLink} onClick={() => reset("home")}>← Back</span>
          </form>
        )}

        {/* ════════════════════════════════════════════════════
            JOIN — Step 2: Register to join the team
        ════════════════════════════════════════════════════ */}
        {mode === "join-register" && (
          <form onSubmit={handleRegister}>
            <div style={s.sectionTitle}>Create Your Account</div>
            <div style={s.sectionSub}>Fill in your details to request access.</div>

            {joinTeam && (
              <div style={s.teamBox}>
                🏢 Joining: <strong>{joinTeam.name}</strong>
                <span style={{ color: "#5a8ab8" }}> — {joinTeam.department}</span>
              </div>
            )}

            <label style={s.label}>Full Name</label>
            <input style={s.input} value={form.displayName} onChange={e => set("displayName", e.target.value)} placeholder="Your full name" autoFocus />
            <label style={s.label}>Username</label>
            <input style={s.input} value={form.username} onChange={e => set("username", e.target.value.replace(/\s/g, ""))} placeholder="Choose a username (min. 3 chars)" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 characters" />

            <button style={s.btn} disabled={loading}>
              {loading ? "Sending request…" : "Request to Join"}
            </button>
            <div style={{ ...s.sectionSub, textAlign: "center", marginTop: "10px", marginBottom: 0 }}>
              Your request will be reviewed by the team admin.
            </div>
            <span style={s.backLink} onClick={() => reset("join")}>← Change invite code</span>
          </form>
        )}

        {/* ════════════════════════════════════════════════════
            CREATE — Register then go to team setup
        ════════════════════════════════════════════════════ */}
        {mode === "create-register" && (
          <form onSubmit={handleRegister}>
            <div style={s.sectionTitle}>Create a Team</div>
            <div style={s.sectionSub}>Register your admin account first, then set up your team.</div>

            <div style={{ ...s.teamBox, background: "#fff7e6", border: "1px solid #f6c90e", color: "#7b5e00" }}>
              🛡️ You will be the <strong>admin</strong> of the new team.
            </div>

            <label style={s.label}>Full Name</label>
            <input style={s.input} value={form.displayName} onChange={e => set("displayName", e.target.value)} placeholder="Your full name" autoFocus />
            <label style={s.label}>Username</label>
            <input style={s.input} value={form.username} onChange={e => set("username", e.target.value.replace(/\s/g, ""))} placeholder="Choose a username (min. 3 chars)" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 characters" />

            <button style={s.btn} disabled={loading}>
              {loading ? "Creating account…" : "Continue to Team Setup →"}
            </button>
            <span style={s.backLink} onClick={() => reset("home")}>← Back</span>
          </form>
        )}

      </div>
    </div>
  );
}
