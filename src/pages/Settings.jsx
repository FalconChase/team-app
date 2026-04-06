import { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, onSnapshot, getDoc, setDoc, orderBy, limit } from "firebase/firestore"; // MODIFIED: added orderBy, limit for TeamLogSection
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import { DEFAULT_STATUSES } from "./Documents";
import { logAction } from "../utils/logAction"; // ADDED: team log utility

// ─── Default subject types (mirrors Documents.jsx) ───────────────────────────
const DEFAULT_SUBJECT_TYPES = [
  "AS-STAKED PLAN", "V.O.", "CTE", "W.S.O.",
  "W.R.O.", "RPDM", "REVISED PLAN", "AS BUILT PLAN",
];

// ─── Default thresholds (mirrors Dashboard.jsx hardcoded values) ─────────────
const DEFAULT_THRESHOLDS = [
  { id: "t1", days: 10, color: "#d97706", label: "At Risk"  },
  { id: "t2", days: 15, color: "#c0392b", label: "Stagnant" },
];

// ─── Available themes ─────────────────────────────────────────────────────────
const THEMES = [
  { id: "default",    name: "Default",    emoji: "💼", desc: "Professional blue tones" },
  { id: "forest",     name: "Forest",     emoji: "🌲", desc: "Earthy green calm" },
  { id: "sunset",     name: "Sunset",     emoji: "🌅", desc: "Warm creative energy" },
  { id: "midnight",   name: "Midnight",   emoji: "🌙", desc: "Deep blue elegance" },
  { id: "monochrome", name: "Monochrome", emoji: "⚫", desc: "Ultra minimal grayscale" },
  { id: "arcade",     name: "Arcade",     emoji: "🎮", desc: "Gamified playful vibes" },
];

// ─── Category config for Team Log ────────────────────────────────────────────  ADDED
const CATEGORY_META = {
  member:   { label: "Member",   color: "#2563eb", bg: "#eff6ff" },
  settings: { label: "Settings", color: "#7c3aed", bg: "#f5f3ff" },
  team:     { label: "Team",     color: "#059669", bg: "#ecfdf5" },
};

// ─── Shared style helpers ─────────────────────────────────────────────────────
const S = {
  page:    { fontFamily: "Tahoma, Geneva, sans-serif", maxWidth: "720px" },
  header:  { marginBottom: "28px" },
  title:   { fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" },
  sub:     { fontSize: "12px", color: "var(--text-muted)" },

  section: {
    background: "var(--bg-card)", border: "0.5px solid var(--border-main)",
    borderRadius: "10px", padding: "20px 24px", marginBottom: "16px",
  },
  sTitle:  { fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" },
  sDesc:   { fontSize: "11px", color: "var(--text-secondary)", marginBottom: "16px" },
  divider: { borderTop: "0.5px solid var(--border-light)", margin: "16px 0" },

  label:   { fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "4px" },
  input:   {
    width: "100%", padding: "8px 10px", borderRadius: "6px",
    border: "1px solid var(--border-input)", fontSize: "12px",
    fontFamily: "Tahoma,Geneva,sans-serif", boxSizing: "border-box",
    background: "var(--bg-input)", color: "var(--text-primary)",
  },

  row:     { display: "flex", gap: "10px", marginBottom: "12px" },
  col:     { flex: 1 },

  btn: (primary = false, danger = false, small = false) => ({
    padding:    small ? "5px 12px" : "8px 16px",
    borderRadius: "6px", cursor: "pointer",
    fontFamily: "Tahoma,Geneva,sans-serif",
    fontSize:   small ? "11px" : "12px",
    border:     danger ? "1px solid var(--danger)" : primary ? "none" : "1px solid var(--primary)",
    background: danger ? "transparent" : primary ? "var(--primary)" : "transparent",
    color:      danger ? "var(--danger)" : primary ? "#fff" : "var(--primary)",
    whiteSpace: "nowrap",
  }),

  iconBtn: (danger = false) => ({
    padding: "4px 8px", borderRadius: "5px", cursor: "pointer",
    border: danger ? "1px solid #f5c6c6" : "1px solid var(--border-input)",
    background: danger ? "#fff5f5" : "var(--bg-secondary)",
    color: danger ? "var(--danger)" : "var(--text-secondary)", fontSize: "12px",
    lineHeight: 1, fontFamily: "Tahoma,Geneva,sans-serif",
  }),

  pill: (color = "var(--primary)") => ({
    display: "inline-block", fontSize: "10px", padding: "2px 8px",
    borderRadius: "10px", background: color + "22", color, fontWeight: "600",
  }),

  tag: (active) => ({
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "3px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: "600",
    background: active ? "var(--primary-light)" : "var(--bg-secondary)",
    color:      active ? "var(--primary)" : "var(--text-secondary)",
    border:     active ? "1px solid var(--primary-border)" : "1px solid var(--border-main)",
  }),

  memberRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "0.5px solid var(--border-light)",
  },
  memberName: { fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" },
  memberMeta: { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" },

  statusRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 10px", borderRadius: "6px", marginBottom: "6px",
    background: "var(--bg-hover)", border: "0.5px solid var(--border-light)",
  },
  stageNum: {
    fontSize: "10px", fontWeight: "700", color: "var(--text-secondary)",
    background: "var(--border-light)", borderRadius: "4px",
    padding: "2px 6px", minWidth: "32px", textAlign: "center",
  },

  thresholdRow: {
    display: "grid", gridTemplateColumns: "80px 1fr 1fr auto",
    gap: "8px", alignItems: "center", marginBottom: "8px",
  },

  toggleRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "0.5px solid var(--border-light)",
  },

  saveBar: {
    display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px",
  },

  badge: (c) => ({
    fontSize: "10px", padding: "2px 8px", borderRadius: "10px",
    background: c + "22", color: c, fontWeight: "600", border: `1px solid ${c}44`,
  }),

  themeCard: (active) => ({
    border: active ? "2px solid var(--primary)" : "1.5px solid var(--border-main)",
    borderRadius: "10px", padding: "14px 16px", cursor: "pointer",
    background: active ? "var(--primary-light)" : "var(--bg-card)",
    transition: "all 0.2s ease",
    display: "flex", alignItems: "center", gap: "12px",
    boxShadow: active ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
  }),
};

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: "38px", height: "20px", borderRadius: "10px", cursor: "pointer",
        background: value ? "var(--primary)" : "var(--border-input)", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: "3px",
        left: value ? "21px" : "3px",
        width: "14px", height: "14px", borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );
}

// ─── Confirm dialog (inline, no window.confirm) ───────────────────────────────
function ConfirmBanner({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      background: "#fffbea", border: "1px solid #f0d060", borderRadius: "7px",
      padding: "12px 16px", marginTop: "10px",
      fontSize: "12px", color: "#8a6800",
    }}>
      <div style={{ marginBottom: "8px" }}>{message}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={S.btn(false, true, true)} onClick={onConfirm}>Yes, proceed</button>
        <button style={S.btn(false, false, true)} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 0 — Theme Control (NEW)
// ═══════════════════════════════════════════════════════════════════════════════
function ThemeControlSection({ teamId, userProfile }) { // MODIFIED: added userProfile prop for logging
  const [currentTheme, setCurrentTheme] = useState("default");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    const fetchTheme = async () => {
      const themeDoc = await getDoc(doc(db, "appSettings", teamId));
      if (themeDoc.exists()) {
        const theme = themeDoc.data()?.theme || "default";
        setCurrentTheme(theme);
        document.documentElement.setAttribute("data-theme", theme);
      }
    };
    fetchTheme();
  }, [teamId]);

  async function handleThemeChange(themeId) {
    setSaving(true);
    try {
      // Save to Firestore
      await setDoc(
        doc(db, "appSettings", teamId),
        { theme: themeId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      
      // Apply immediately
      setCurrentTheme(themeId);
      document.documentElement.setAttribute("data-theme", themeId);

      // ADDED: log the theme change
      const themeName = THEMES.find((t) => t.id === themeId)?.name || themeId;
      await logAction({
        teamId,
        action: `Theme changed to ${themeName}`,
        category: "settings",
        performedBy: userProfile?.displayName || userProfile?.email,
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save theme:", err);
      alert("Failed to save theme. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.section}>
      <div style={S.sTitle}>🎨 Theme Control</div>
      <div style={S.sDesc}>
        Choose a color theme for the entire app. Changes apply instantly for all team members.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        {THEMES.map((theme) => (
          <div
            key={theme.id}
            style={S.themeCard(currentTheme === theme.id)}
            onClick={() => handleThemeChange(theme.id)}
            onMouseEnter={(e) => {
              if (currentTheme !== theme.id) {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.background = "var(--bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentTheme !== theme.id) {
                e.currentTarget.style.borderColor = "var(--border-main)";
                e.currentTarget.style.background = "var(--bg-card)";
              }
            }}
          >
            <span style={{ fontSize: "28px", lineHeight: 1 }}>{theme.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "13px",
                fontWeight: "700",
                color: currentTheme === theme.id ? "var(--primary)" : "var(--text-primary)",
                marginBottom: "2px",
              }}>
                {theme.name}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                {theme.desc}
              </div>
            </div>
            {currentTheme === theme.id && (
              <span style={{
                fontSize: "14px",
                color: "var(--primary)",
                fontWeight: "700",
              }}>✓</span>
            )}
          </div>
        ))}
      </div>

      {saved && (
        <div style={{
          fontSize: "11px",
          color: "var(--success)",
          background: "var(--success-bg)",
          padding: "8px 12px",
          borderRadius: "6px",
          textAlign: "center",
        }}>
          ✓ Theme applied successfully
        </div>
      )}

      {saving && (
        <div style={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          textAlign: "center",
          fontStyle: "italic",
        }}>
          Applying theme...
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Team Profile
// ═══════════════════════════════════════════════════════════════════════════════
function TeamProfileSection({ team, updateTeamSettings }) {
  const [name,   setName]   = useState(team?.name       || "");
  const [dept,   setDept]   = useState(team?.department || "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenDone,    setRegenDone]    = useState(false);

  useEffect(() => {
    setName(team?.name       || "");
    setDept(team?.department || "");
  }, [team]);

  async function handleSave() {
    setSaving(true);
    await updateTeamSettings({ name: name.trim(), department: dept.trim() }, "Team profile updated"); // MODIFIED: added log message
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRegenInvite() {
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await updateTeamSettings({ inviteCode: newCode }, "Invite code regenerated"); // MODIFIED: added log message
    setConfirmRegen(false);
    setRegenDone(true);
    setTimeout(() => setRegenDone(false), 3000);
  }

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Team Profile</div>
      <div style={S.sDesc}>Basic information about your team visible to all members.</div>

      <div style={S.row}>
        <div style={S.col}>
          <label style={S.label}>Team Name</label>
          <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CD — ALA" />
        </div>
        <div style={S.col}>
          <label style={S.label}>Department</label>
          <input style={S.input} value={dept} onChange={(e) => setDept(e.target.value)} placeholder="e.g. Construction Division" />
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <label style={S.label}>Team ID <span style={{ color: "var(--text-disabled)", fontWeight: 400 }}>(read-only)</span></label>
        <input style={{ ...S.input, background: "var(--bg-secondary)", color: "var(--text-muted)", cursor: "default" }}
          value={team?.id || "—"} readOnly />
      </div>

      <div style={S.divider} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <label style={S.label}>Invite Code</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
            <span style={{
              fontFamily: "monospace", fontSize: "16px", fontWeight: "700",
              letterSpacing: "3px", color: "var(--primary)", background: "var(--bg-secondary)",
              padding: "6px 14px", borderRadius: "6px",
            }}>
              {team?.inviteCode || "—"}
            </span>
            {regenDone && <span style={{ fontSize: "11px", color: "var(--success)" }}>✓ New code active</span>}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-disabled)", marginTop: "4px" }}>
            Share this code with new members to join your team.
          </div>
        </div>
        <button style={S.btn(false, false, true)} onClick={() => setConfirmRegen(true)}>
          Regenerate
        </button>
      </div>

      {confirmRegen && (
        <ConfirmBanner
          message="Regenerating the invite code will invalidate the current one. Existing members are not affected."
          onConfirm={handleRegenInvite}
          onCancel={() => setConfirmRegen(false)}
        />
      )}

      <div style={S.saveBar}>
        {saved && <span style={{ fontSize: "11px", color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
        <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Member Management
// ═══════════════════════════════════════════════════════════════════════════════
function MemberManagementSection({ members, currentUser, grantAdmin, revokeAdmin, removeMember, userProfile, teamId }) { // MODIFIED: added userProfile, teamId for logging
  const [confirmAction, setConfirmAction] = useState(null); // { type, member }

  async function executeAction() {
    const { type, member } = confirmAction;
    if (type === "promote")  await grantAdmin(member.id);
    if (type === "demote")   await revokeAdmin(member.id);
    if (type === "remove")   await removeMember(member.id);
    // ADDED: log the member action
    const actionText = { promote: `Promoted ${member.displayName} to Admin`, demote: `Demoted ${member.displayName} to Member`, remove: `Removed member ${member.displayName} from team` }[type];
    logAction({ teamId, action: actionText, category: "member", performedBy: userProfile?.displayName || userProfile?.email || "Unknown", targetName: member.displayName || null });
    setConfirmAction(null);
  }

  const confirmMsg = confirmAction && {
    promote: `Promote ${confirmAction.member.displayName} to Admin? They will gain full access to Settings and all admin controls.`,
    demote:  `Demote ${confirmAction.member.displayName} to Member? They will lose admin access.`,
    remove:  `Remove ${confirmAction.member.displayName} from the team? This cannot be undone.`,
  }[confirmAction.type];

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Member Management</div>
      <div style={S.sDesc}>Manage roles and access for all active team members.</div>

      {members.map((m) => {
        const isSelf  = m.uid === currentUser?.uid || m.id === currentUser?.uid;
        const isAdm   = m.role === "admin" || m.role === "manager" || m.role === "supervisor";

        return (
          <div key={m.id || m.uid} style={S.memberRow}>
            <div>
              <div style={S.memberName}>
                {m.displayName}
                {isSelf && <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 400, marginLeft: "6px" }}>(you)</span>}
              </div>
              <div style={S.memberMeta}>@{m.username || "—"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={S.badge(isAdm ? "var(--accent)" : "var(--text-secondary)")}>
                {m.role || "member"}
              </span>
              {!isSelf && (
                <>
                  {isAdm
                    ? <button style={S.btn(false, false, true)} onClick={() => setConfirmAction({ type: "demote",  member: m })}>Demote</button>
                    : <button style={S.btn(false, false, true)} onClick={() => setConfirmAction({ type: "promote", member: m })}>Make Admin</button>
                  }
                  <button style={S.btn(false, true, true)} onClick={() => setConfirmAction({ type: "remove", member: m })}>Remove</button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {members.length === 0 && (
        <div style={{ fontSize: "12px", color: "var(--text-disabled)", padding: "16px 0" }}>No members found.</div>
      )}

      {confirmAction && (
        <ConfirmBanner
          message={confirmMsg}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Document Status List
// ═══════════════════════════════════════════════════════════════════════════════
function StatusListSection({ statuses, onSave, papers }) {
  const [list,    setList]    = useState([...statuses]);
  const [newItem, setNewItem] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [confirm, setConfirm] = useState(null); // { index, label, affectedCount, nearestLabel }

  useEffect(() => { setList([...statuses]); }, [JSON.stringify(statuses)]);

  function move(index, dir) {
    const next = [...list];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setList(next);
  }

  function addStatus() {
    const trimmed = newItem.trim().toUpperCase();
    if (!trimmed || list.includes(trimmed)) return;
    setList((l) => [...l, trimmed]);
    setNewItem("");
  }

  function requestDelete(index) {
    const label        = list[index];
    const affected     = (papers || []).filter((p) => p.status === label);
    const nearestIdx   = index > 0 ? index - 1 : index + 1;
    const nearestLabel = list[nearestIdx] || null;

    if (affected.length === 0) {
      // No documents affected — delete immediately
      setList((l) => l.filter((_, i) => i !== index));
      return;
    }

    setConfirm({
      index,
      label,
      affectedCount: affected.length,
      nearestLabel,
    });
  }

  async function executeDelete() {
    const { index, label, nearestLabel } = confirm;

    // Move affected documents to nearest status first
    if (nearestLabel) {
      const affected = (papers || []).filter((p) => p.status === label);
      await Promise.all(
        affected.map((p) =>
          updateDoc(doc(db, "papers", p.id), { status: nearestLabel })
        )
      );
    }

    setList((l) => l.filter((_, i) => i !== index));
    setConfirm(null);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(list);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Document Status List</div>
      <div style={S.sDesc}>
        Define and order the stages a document passes through. Stage numbers auto-update everywhere.
      </div>

      {list.map((st, i) => (
        <div key={st} style={S.statusRow}>
          <span style={S.stageNum}>{i + 1}/{list.length}</span>
          <span style={{ flex: 1, fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>{st}</span>
          <button style={S.iconBtn()} onClick={() => move(i, -1)} disabled={i === 0}
            title="Move up">↑</button>
          <button style={S.iconBtn()} onClick={() => move(i, 1)} disabled={i === list.length - 1}
            title="Move down">↓</button>
          <button style={S.iconBtn(true)} onClick={() => requestDelete(i)} title="Delete">✕</button>
        </div>
      ))}

      {/* Add new status */}
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <input
          style={{ ...S.input, flex: 1 }}
          value={newItem}
          placeholder="New status name…"
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addStatus(); }}
        />
        <button style={S.btn(true, false, true)} onClick={addStatus}>+ Add</button>
      </div>

      {confirm && (
        <ConfirmBanner
          message={`${confirm.affectedCount} document(s) currently have status "${confirm.label}". They will be automatically moved to "${confirm.nearestLabel}". Continue?`}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div style={S.saveBar}>
        {saved && <span style={{ fontSize: "11px", color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
        <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Status List"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Subject Types
// ═══════════════════════════════════════════════════════════════════════════════
function SubjectTypesSection({ subjectTypes, onSave, papers }) {
  const [list,    setList]    = useState([...subjectTypes]);
  const [newItem, setNewItem] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [blocked, setBlocked] = useState(null); // label of blocked delete

  useEffect(() => { setList([...subjectTypes]); }, [JSON.stringify(subjectTypes)]);

  function addType() {
    const trimmed = newItem.trim().toUpperCase();
    if (!trimmed || list.includes(trimmed)) return;
    setList((l) => [...l, trimmed]);
    setNewItem("");
  }

  function requestDelete(index) {
    const label    = list[index];
    const inUse    = (papers || []).some((p) => p.subjectType === label);
    if (inUse) {
      setBlocked(label);
      setTimeout(() => setBlocked(null), 3000);
      return;
    }
    setList((l) => l.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    await onSave(list);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Subject Types</div>
      <div style={S.sDesc}>
        The list of document subject types available when adding a new document.
        Types in use by existing documents cannot be deleted.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
        {list.map((t, i) => {
          const inUse = (papers || []).some((p) => p.subjectType === t);
          return (
            <div key={t} style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "var(--bg-secondary)", borderRadius: "6px",
              padding: "5px 10px", fontSize: "12px", fontWeight: "500", color: "var(--text-primary)",
              border: "0.5px solid var(--border-main)",
            }}>
              {t}
              <button
                style={{ ...S.iconBtn(true), padding: "1px 5px", fontSize: "10px", opacity: inUse ? 0.35 : 1 }}
                onClick={() => requestDelete(i)}
                title={inUse ? "In use by existing documents" : "Remove"}
              >✕</button>
            </div>
          );
        })}
      </div>

      {blocked && (
        <div style={{ fontSize: "11px", color: "var(--danger)", background: "var(--danger-bg)", borderRadius: "6px", padding: "8px 12px", marginBottom: "10px", border: "1px solid #f5c6c6" }}>
          ⚠ "{blocked}" is used by existing documents and cannot be deleted.
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          style={{ ...S.input, flex: 1 }}
          value={newItem}
          placeholder="New subject type…"
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addType(); }}
        />
        <button style={S.btn(true, false, true)} onClick={addType}>+ Add</button>
      </div>

      <div style={S.saveBar}>
        {saved && <span style={{ fontSize: "11px", color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
        <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Subject Types"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Dashboard Color Thresholds
// ═══════════════════════════════════════════════════════════════════════════════
function ThresholdsSection({ thresholds, onSave }) {
  const [rows,   setRows]   = useState(
    thresholds?.length ? [...thresholds] : [...DEFAULT_THRESHOLDS]
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (thresholds?.length) setRows([...thresholds]);
  }, [JSON.stringify(thresholds)]);

  function updateRow(id, field, value) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: `t_${Date.now()}`, days: 0, color: "#888888", label: "Custom" },
    ]);
  }

  function deleteRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Always sort ascending by days before saving
  async function handleSave() {
    setSaving(true);
    const sorted = [...rows].sort((a, b) => Number(a.days) - Number(b.days));
    setRows(sorted);
    await onSave(sorted);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Dashboard Color Thresholds</div>
      <div style={S.sDesc}>
        Control how the PROJECT ID color changes in the Dashboard based on days elapsed since DoTS date.
        Rows are auto-sorted by days. Add as many levels as needed.
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: "8px", marginBottom: "6px" }}>
        {["Days ≥", "Color", "Label", ""].map((h) => (
          <div key={h} style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>

      {rows.map((r) => (
        <div key={r.id} style={S.thresholdRow}>
          {/* Days */}
          <input
            type="number" min="1"
            style={{ ...S.input, textAlign: "center" }}
            value={r.days}
            onChange={(e) => updateRow(r.id, "days", e.target.value)}
          />
          {/* Color picker + hex preview */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="color"
              value={r.color}
              onChange={(e) => updateRow(r.id, "color", e.target.value)}
              style={{ width: "36px", height: "32px", borderRadius: "5px", border: "1px solid var(--border-input)", cursor: "pointer", padding: "2px" }}
            />
            <span style={{ fontSize: "11px", color: r.color, fontWeight: "700", fontFamily: "monospace" }}>
              {r.color}
            </span>
            {/* Live preview */}
            <span style={{ fontSize: "12px", fontWeight: "700", color: r.color }}>25N00247</span>
          </div>
          {/* Label */}
          <input
            style={S.input}
            value={r.label}
            placeholder="e.g. At Risk"
            onChange={(e) => updateRow(r.id, "label", e.target.value)}
          />
          {/* Delete */}
          <button style={S.iconBtn(true)} onClick={() => deleteRow(r.id)}>✕</button>
        </div>
      ))}

      <button style={{ ...S.btn(false, false, true), marginTop: "6px" }} onClick={addRow}>
        + Add Threshold
      </button>

      <div style={S.saveBar}>
        {saved && <span style={{ fontSize: "11px", color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
        <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Thresholds"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Notification Preferences
// ═══════════════════════════════════════════════════════════════════════════════
function NotificationsSection({ prefs, onSave }) {
  const [onLacking,     setOnLacking]     = useState(prefs?.onLacking     ?? true);
  const [stagnantDays,  setStagnantDays]  = useState(prefs?.stagnantDays  ?? 15);
  const [onApproved,    setOnApproved]    = useState(prefs?.onApproved     ?? false);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);

  useEffect(() => {
    if (prefs) {
      setOnLacking(prefs.onLacking    ?? true);
      setStagnantDays(prefs.stagnantDays ?? 15);
      setOnApproved(prefs.onApproved  ?? false);
    }
  }, [JSON.stringify(prefs)]);

  async function handleSave() {
    setSaving(true);
    await onSave({ onLacking, stagnantDays: Number(stagnantDays), onApproved });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TRow = ({ label, desc, value, onChange, children }) => (
    <div style={S.toggleRow}>
      <div style={{ flex: 1, paddingRight: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>{label}</div>
        {desc && <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{desc}</div>}
        {children}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div style={S.section}>
      <div style={S.sTitle}>Notification Preferences</div>
      <div style={S.sDesc}>
        Configure when alerts appear in the app. Push notifications can be wired up in a future update.
      </div>

      <TRow
        label="Notify on LACKING status"
        desc="Show an alert when a document is marked as LACKING."
        value={onLacking}
        onChange={setOnLacking}
      />

      <TRow
        label="Notify on APPROVED status"
        desc="Show an alert when a document reaches APPROVED."
        value={onApproved}
        onChange={setOnApproved}
      />

      <TRow
        label="Notify when document is stagnant"
        desc=""
        value={stagnantDays > 0}
        onChange={(v) => setStagnantDays(v ? 15 : 0)}
      >
        {stagnantDays > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>After</span>
            <input
              type="number" min="1" max="90"
              value={stagnantDays}
              onChange={(e) => setStagnantDays(e.target.value)}
              style={{ ...S.input, width: "60px", textAlign: "center" }}
            />
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>days without a status change.</span>
          </div>
        )}
      </TRow>

      <div style={S.saveBar}>
        {saved && <span style={{ fontSize: "11px", color: "var(--success)", alignSelf: "center" }}>✓ Saved</span>}
        <button style={S.btn(true)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — Team Log (NEW)
// ═══════════════════════════════════════════════════════════════════════════════
function TeamLogSection({ teamId }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    const q = query(
      collection(db, "teamLogs"),
      where("teamId", "==", teamId),
      orderBy("timestamp", "desc"),
      limit(150)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [teamId]);

  function formatTime(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("en-PH", {
      month: "short", day: "numeric", year: "numeric",
    }) + " · " + d.toLocaleTimeString("en-PH", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  const meta = (cat) => CATEGORY_META[cat] || { label: cat, color: "var(--text-secondary)", bg: "var(--bg-secondary)" };

  return (
    <div style={S.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={S.sTitle}>📋 Team Log</div>
        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          background: "var(--bg-secondary)", padding: "3px 8px",
          borderRadius: "10px", border: "0.5px solid var(--border-main)",
        }}>
          Last {Math.min(logs.length, 150)} actions · Read only
        </span>
      </div>
      <div style={{ ...S.sDesc, marginBottom: "12px" }}>
        A record of recent actions and changes made across the team. Visible to admins only.
      </div>

      {loading && (
        <div style={{ fontSize: "12px", color: "var(--text-disabled)", padding: "20px 0", textAlign: "center" }}>
          Loading log…
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div style={{ fontSize: "12px", color: "var(--text-disabled)", padding: "20px 0", textAlign: "center" }}>
          No actions recorded yet. Activity will appear here as the team makes changes.
        </div>
      )}

      {!loading && logs.map((log) => {
        const m = meta(log.category);
        return (
          <div key={log.id} style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            padding: "10px 0", borderBottom: "0.5px solid var(--border-light)",
          }}>
            <span style={{
              fontSize: "9px", fontWeight: "700", padding: "2px 7px",
              borderRadius: "8px", background: m.bg, color: m.color,
              border: `1px solid ${m.color}33`, whiteSpace: "nowrap",
              marginTop: "2px", flexShrink: 0, textTransform: "uppercase",
            }}>
              {m.label}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>
                {log.action}
                {log.targetName && (
                  <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                    {" "}— {log.targetName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                by <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>{log.performedBy}</span>
                <span style={{ margin: "0 6px", color: "var(--border-main)" }}>·</span>
                {formatTime(log.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN Settings page
// ═══════════════════════════════════════════════════════════════════════════════
export function Settings() {
  const { userProfile }                               = useAuth();
  const { team, members, isAdmin, updateTeamSettings,
          grantAdmin, revokeAdmin, removeMember }     = useTeam();
  const { currentUser }                               = useAuth();

  // Documents (papers) needed for delete-status auto-move and subject-type guard
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(
      collection(db, "papers"),
      where("teamId", "==", userProfile.teamId)
    );
    const unsub = onSnapshot(q, (snap) =>
      setPapers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => !!d.projectId))
    );
    return unsub;
  }, [userProfile?.teamId]);

  // ── Guard: admin only ──────────────────────────────────────────────────────
  if (!isAdmin()) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-disabled)", fontFamily: "Tahoma,Geneva,sans-serif" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Admin access only</div>
        <div style={{ fontSize: "12px", marginTop: "6px" }}>You need admin privileges to access Settings.</div>
      </div>
    );
  }

  // ── Helpers to save individual sections ───────────────────────────────────
  const saveStatuses    = (list)  => updateTeamSettings({ documentStatuses:     list }, "Document status list updated");  // MODIFIED: added log message
  const saveSubjects    = (list)  => updateTeamSettings({ documentSubjectTypes: list }, "Subject types updated");          // MODIFIED: added log message
  const saveThresholds  = (list)  => updateTeamSettings({ dashboardThresholds:  list }, "Dashboard color thresholds updated"); // MODIFIED: added log message
  const saveNotifPrefs  = (prefs) => updateTeamSettings({ notificationPrefs:    prefs }, "Notification preferences updated");  // MODIFIED: added log message

  const statuses    = team?.documentStatuses     || DEFAULT_STATUSES;
  const subjectTypes= team?.documentSubjectTypes || DEFAULT_SUBJECT_TYPES;
  const thresholds  = team?.dashboardThresholds  || DEFAULT_THRESHOLDS;
  const notifPrefs  = team?.notificationPrefs    || {};

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>Settings</div>
        <div style={S.sub}>Admin-only. Changes apply immediately across the entire team.</div>
      </div>

      {/* NEW: Theme Control Section */}
      <ThemeControlSection teamId={userProfile?.teamId} userProfile={userProfile} /> {/* MODIFIED: pass userProfile for logging */}

      <TeamProfileSection
        team={team}
        updateTeamSettings={updateTeamSettings}
      />

      <MemberManagementSection
        members={members}
        currentUser={currentUser}
        grantAdmin={grantAdmin}
        revokeAdmin={revokeAdmin}
        removeMember={removeMember}
        userProfile={userProfile}
        teamId={userProfile?.teamId}
      />

      <StatusListSection
        statuses={statuses}
        onSave={saveStatuses}
        papers={papers}
      />

      <SubjectTypesSection
        subjectTypes={subjectTypes}
        onSave={saveSubjects}
        papers={papers}
      />

      <ThresholdsSection
        thresholds={thresholds}
        onSave={saveThresholds}
      />

      <NotificationsSection
        prefs={notifPrefs}
        onSave={saveNotifPrefs}
      />

      {/* ADDED: Team Log — admin only, read only, bottom of settings */}
      <TeamLogSection teamId={userProfile?.teamId} />
    </div>
  );
}

export default Settings;