import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, serverTimestamp, arrayUnion, getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import { logAction } from "../utils/logAction";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(val) {
  if (!val) return "";
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

function formatLogTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RestoreAuthModal
// Shown when admin clicks Restore. Requires the team's archiveAuthCode.
// Default fallback code is ARC123 if none has been set in Settings.
// This simulates interdepartmental authorization — the code is managed by
// the archive department (or team admin) via Settings → Archive Authorization.
// ═══════════════════════════════════════════════════════════════════════════════
function RestoreAuthModal({ document: d, teamId, userProfile, onSuccess, onClose }) {
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!code.trim()) { setError("Please enter the authorization code."); return; }
    setLoading(true);
    setError("");

    try {
      // Fetch the current auth code from the team doc
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      const savedCode = teamSnap.exists()
        ? (teamSnap.data()?.archiveAuthCode || "ARC123")
        : "ARC123";

      if (code.trim().toUpperCase() !== savedCode.toUpperCase()) {
        setError("Incorrect authorization code. Please verify and try again.");
        setLoading(false);
        return;
      }

      // Code matched — restore the document
      await updateDoc(doc(db, "papers", d.id), {
        status:     "PRECOMPILING",
        hidden:     false,
        archivedAt: null,
        archivedBy: null,
        lastModifiedAt: serverTimestamp(),
        lastModifiedBy: userProfile.displayName || userProfile.email || "Unknown",
        activityLog: arrayUnion({
          text: `Document restored from Archive by ${userProfile.displayName || userProfile.email}`,
          by:   userProfile.displayName,
          at:   new Date().toISOString(),
        }),
      });

      // ✅ SURGICAL INSERT — log restore action to audit trail
      await logAction({
        teamId:      teamId,
        action:      "Restored document from Archive",
        category:    "document",
        performedBy: userProfile.displayName || userProfile.email || "Unknown",
        targetName:  d.subject || null,
      });
      // ✅ END SURGICAL INSERT

      onSuccess();
    } catch (err) {
      console.error("Restore failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const S_modal = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
    box:     { background: "var(--bg-card)", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "400px", border: "1px solid var(--border-main)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", borderTop: "4px solid var(--primary)" },
    title:   { fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" },
    docName: { fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", fontWeight: "500" },
    info:    { fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.6", background: "var(--bg-hover)", borderRadius: "6px", padding: "10px 12px", border: "0.5px solid var(--border-main)" },
    label:   { fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "6px" },
    input:   { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1.5px solid var(--border-input)", fontSize: "14px", fontFamily: "monospace", letterSpacing: "3px", textTransform: "uppercase", boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)", textAlign: "center" },
    error:   { fontSize: "11px", color: "var(--danger)", background: "var(--danger-bg, #fff5f5)", borderRadius: "6px", padding: "8px 12px", marginTop: "8px", border: "1px solid #f5c6c6" },
    btnRow:  { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" },
  };

  return (
    <div style={S_modal.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S_modal.box}>
        <div style={S_modal.title}>🔐 Archive Authorization Required</div>
        <div style={S_modal.docName}>{d.subject || "—"}</div>

        <div style={S_modal.info}>
          Restoring an archived document requires an authorization code issued by the Archive department. Contact your Archive administrator to obtain the current code.
        </div>

        <label style={S_modal.label}>Authorization Code</label>
        <input
          style={S_modal.input}
          value={code}
          maxLength={20}
          placeholder="••••••"
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          autoFocus
        />
        {error && <div style={S_modal.error}>⚠ {error}</div>}

        <div style={S_modal.btnRow}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "12px", border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !code.trim()}
            style={{ padding: "8px 16px", borderRadius: "6px", cursor: loading || !code.trim() ? "not-allowed" : "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "12px", border: "none", background: loading || !code.trim() ? "var(--bg-secondary)" : "var(--primary)", color: loading || !code.trim() ? "var(--text-disabled)" : "#fff", fontWeight: "600", transition: "all 0.15s" }}
          >
            {loading ? "Verifying…" : "Confirm Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Archive Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function Archive() {
  const { userProfile }      = useAuth();
  const { isAdmin, members } = useTeam();
  const navigate             = useNavigate();

  const [archivedDocs,    setArchivedDocs]    = useState([]);
  const [projects,        setProjects]        = useState([]);
  const [sortOrder,       setSortOrder]       = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedDocs,    setExpandedDocs]    = useState({});
  const [editDates,       setEditDates]       = useState({});
  const [savingDate,      setSavingDate]      = useState({});

  // Restore modal state
  const [restoreTarget,  setRestoreTarget]  = useState(null); // doc object
  const [restoreSuccess, setRestoreSuccess] = useState("");   // flash message

  const admin = isAdmin();

  // ── Firestore: archived docs ───────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(
      collection(db, "papers"),
      where("teamId", "==", userProfile.teamId),
      where("status", "==", "ARCHIVED")
    );
    return onSnapshot(q, snap => {
      setArchivedDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userProfile?.teamId]);

  // ── Firestore: projects ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = collection(db, "teams", userProfile.teamId, "projects");
    return onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userProfile?.teamId]);

  // ── Group archived docs by project ────────────────────────────────────────
  const projectGroups = projects
    .map(p => ({
      project: p,
      docs: archivedDocs.filter(d => d.projectId === p.id),
    }))
    .filter(g => g.docs.length > 0)
    .sort((a, b) => {
      const lA = (a.project.projectId || a.project.name || "").toUpperCase();
      const lB = (b.project.projectId || b.project.name || "").toUpperCase();
      const c  = lA.localeCompare(lB, undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "asc" ? c : -c;
    });

  function toggleGroup(projectId) {
    setCollapsedGroups(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }

  function toggleDoc(docId) {
    setExpandedDocs(prev => ({ ...prev, [docId]: !prev[docId] }));
  }

  async function handleSaveDate(d) {
    const newDate = editDates[d.id];
    if (!newDate) return;
    setSavingDate(prev => ({ ...prev, [d.id]: true }));
    await updateDoc(doc(db, "papers", d.id), {
      archivedAt: new Date(newDate + "T00:00:00"),
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: userProfile.displayName || userProfile.email || "Unknown",
      activityLog: arrayUnion({
        text: `Archive date edited to ${newDate}`,
        by: userProfile.displayName,
        at: new Date().toISOString(),
      }),
    });
    setSavingDate(prev => ({ ...prev, [d.id]: false }));
    setEditDates(prev => { const n = { ...prev }; delete n[d.id]; return n; });

    // ── Audit log ────────────────────────────────────────────────────────────
    logAction({
      teamId:      userProfile.teamId,
      action:      `Edited archive date for "${d.subject || d.id}" to ${newDate}`,
      category:    "record",
      performedBy: userProfile.displayName || userProfile.email || "Unknown",
      targetName:  d.subject || null,
    });
  }

  function handleRestoreSuccess() {
    setRestoreTarget(null);
    setRestoreSuccess("Document successfully restored. It will reappear in the Documents tab.");
    setTimeout(() => setRestoreSuccess(""), 4000);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    page:       { fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", padding: "20px" },
    header:     { display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" },
    backBtn:    { fontSize: "12px", padding: "7px 14px", borderRadius: "7px", border: "1px solid var(--border-input)", background: "var(--bg-card)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" },
    title:      { fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" },
    subtitle:   { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" },
    sortGroup:  { display: "flex", gap: "4px", alignItems: "center", background: "var(--bg-hover)", borderRadius: "8px", padding: "3px", border: "1px solid var(--border-main)", marginLeft: "auto" },
    sortLbl:    { fontSize: "10px", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.4px", textTransform: "uppercase", paddingLeft: "6px" },
    sortBtn:    (active) => ({ fontSize: "12px", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", border: active ? "1.5px solid var(--primary)" : "none", background: active ? "var(--primary)" : "transparent", color: active ? "#fff" : "var(--text-primary)", transition: "all 0.15s" }),
    group:      { background: "var(--bg-card)", border: "1px solid var(--border-main)", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" },
    groupHdr:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", cursor: "pointer", userSelect: "none", borderBottom: "1px solid var(--border-light)", background: "var(--bg-hover)", transition: "background 0.15s" },
    groupTitle: { fontSize: "14px", fontWeight: "700", color: "var(--primary)" },
    groupBadge: { fontSize: "11px", fontWeight: "600", background: "#f0f0f0", color: "#6b6b6b", borderRadius: "10px", padding: "2px 10px", marginLeft: "10px" },
    chevron:    (open) => ({ fontSize: "12px", color: "var(--text-muted)", transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }),
    table:      { width: "100%", borderCollapse: "collapse" },
    th:         { padding: "9px 16px", textAlign: "left", fontSize: "10px", color: "var(--text-secondary)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.6px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" },
    td:         { padding: "11px 16px", fontSize: "12px", color: "var(--text-primary)", borderBottom: "0.5px solid var(--border-light)", verticalAlign: "middle" },
    expandBtn:  { fontSize: "11px", padding: "3px 10px", borderRadius: "5px", border: "1px solid var(--border-input)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", transition: "all 0.15s" },
    restoreBtn: { fontSize: "11px", padding: "4px 11px", borderRadius: "5px", border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontWeight: "600", transition: "all 0.15s", whiteSpace: "nowrap" },
    logRow:     { background: "var(--bg-secondary)" },
    logCell:    { padding: "14px 20px 16px 36px", borderBottom: "1px solid var(--border-main)" },
    logLine:    { display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px", position: "relative" },
    logDot:     { width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginTop: "4px" },
    logText:    { fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.5" },
    logMeta:    { fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" },
    dateInput:  { fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
    saveBtn:    (disabled) => ({ fontSize: "11px", padding: "5px 12px", borderRadius: "5px", border: "none", background: disabled ? "var(--bg-secondary)" : "var(--primary)", color: disabled ? "var(--text-disabled)" : "#fff", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontWeight: "600", marginLeft: "8px", transition: "all 0.15s" }),
    empty:      { textAlign: "center", color: "var(--text-disabled)", padding: "60px 20px", fontSize: "13px", fontStyle: "italic" },
    flash:      { background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "var(--success)", fontWeight: "600", marginBottom: "16px" },
  };

  return (
    <div style={S.page}>

      {/* Restore auth modal */}
      {restoreTarget && (
        <RestoreAuthModal
          document={restoreTarget}
          teamId={userProfile.teamId}
          userProfile={userProfile}
          onSuccess={handleRestoreSuccess}
          onClose={() => setRestoreTarget(null)}
        />
      )}

      {/* Header */}
      <div style={S.header}>
        <button
          style={S.backBtn}
          onClick={() => navigate("/records")}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          ← Back
        </button>
        <div>
          <div style={S.title}>🗄️ Archive Library</div>
          <div style={S.subtitle}>
            {archivedDocs.length} archived document{archivedDocs.length !== 1 ? "s" : ""} across {projectGroups.length} project{projectGroups.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Sort controls */}
        <div style={S.sortGroup}>
          <span style={S.sortLbl}>Sort</span>
          <button style={S.sortBtn(sortOrder === "asc")}  onClick={() => setSortOrder("asc")}>A→Z</button>
          <button style={S.sortBtn(sortOrder === "desc")} onClick={() => setSortOrder("desc")}>Z→A</button>
        </div>
      </div>

      {/* Restore success flash */}
      {restoreSuccess && <div style={S.flash}>✓ {restoreSuccess}</div>}

      {/* Empty state */}
      {archivedDocs.length === 0 && (
        <div style={S.empty}>No archived documents yet.</div>
      )}

      {/* Project groups */}
      {projectGroups.map(({ project, docs }) => {
        const isOpen = !collapsedGroups[project.id];
        const label  = project.projectId || project.name || project.id;
        return (
          <div key={project.id} style={S.group}>

            {/* Group header */}
            <div
              style={S.groupHdr}
              onClick={() => toggleGroup(project.id)}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={S.groupTitle}>{label}</span>
                <span style={S.groupBadge}>{docs.length} doc{docs.length !== 1 ? "s" : ""}</span>
              </div>
              <span style={S.chevron(isOpen)}>▼</span>
            </div>

            {/* Docs table */}
            {isOpen && (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Subject</th>
                    <th style={S.th}>Date Archived</th>
                    <th style={S.th}>Archived By</th>
                    <th style={{ ...S.th, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(d => {
                    const isDocOpen = !!expandedDocs[d.id];
                    const isEditing = editDates[d.id] !== undefined;
                    const isSaving  = !!savingDate[d.id];
                    const log       = [...(d.activityLog || [])].reverse();

                    return (
                      <>
                        {/* Doc row */}
                        <tr
                          key={d.id}
                          style={{ background: isDocOpen ? "var(--bg-secondary)" : "transparent" }}
                          onMouseEnter={e => { if (!isDocOpen) e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={e => { if (!isDocOpen) e.currentTarget.style.background = "transparent"; }}
                        >
                          {/* Subject */}
                          <td style={{ ...S.td, fontWeight: "500" }}>{d.subject || "—"}</td>

                          {/* Date Archived — admin editable */}
                          <td style={S.td}>
                            {admin ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input
                                  type="date"
                                  style={S.dateInput}
                                  value={isEditing ? editDates[d.id] : toInputDate(d.archivedAt)}
                                  onChange={e => setEditDates(prev => ({ ...prev, [d.id]: e.target.value }))}
                                />
                                {isEditing && (
                                  <button
                                    style={S.saveBtn(isSaving)}
                                    disabled={isSaving}
                                    onClick={() => handleSaveDate(d)}
                                  >
                                    {isSaving ? "Saving…" : "Save"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              formatDate(d.archivedAt)
                            )}
                          </td>

                          {/* Archived By */}
                          <td style={{ ...S.td, color: "var(--text-secondary)" }}>
                            {d.archivedBy || "—"}
                          </td>

                          {/* Action buttons */}
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                              {/* Restore — visible to admins only */}
                              {admin && (
                                <button
                                  style={S.restoreBtn}
                                  onClick={() => setRestoreTarget(d)}
                                  onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--primary)"; }}
                                >
                                  ↩ Restore
                                </button>
                              )}
                              {/* View Log */}
                              <button
                                style={{ ...S.expandBtn, ...(isDocOpen ? { borderColor: "var(--primary)", color: "var(--primary)" } : {}) }}
                                onClick={() => toggleDoc(d.id)}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                                onMouseLeave={e => { if (!isDocOpen) { e.currentTarget.style.borderColor = "var(--border-input)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                              >
                                {isDocOpen ? "Hide Log" : "View Log"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Activity log row */}
                        {isDocOpen && (
                          <tr key={`${d.id}-log`} style={S.logRow}>
                            <td colSpan={4} style={S.logCell}>
                              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px" }}>
                                Activity Log
                              </div>
                              <div style={{ position: "relative", paddingLeft: "12px", borderLeft: "2px solid var(--border-light)" }}>
                                {log.length === 0 && (
                                  <div style={{ fontSize: "12px", color: "var(--text-disabled)", fontStyle: "italic" }}>No activity recorded.</div>
                                )}
                                {log.map((entry, i) => (
                                  <div key={i} style={{ ...S.logLine, marginBottom: i < log.length - 1 ? "14px" : 0 }}>
                                    <div style={{ ...S.logDot, position: "absolute", left: "-5px", background: i === 0 ? "var(--primary)" : "var(--border-main)" }} />
                                    <div style={{ paddingLeft: "12px" }}>
                                      <div style={S.logText}>{entry.text}</div>
                                      <div style={S.logMeta}>
                                        {entry.by && <span>{entry.by}</span>}
                                        {entry.at && <span style={{ marginLeft: "8px" }}>· {formatLogTime(entry.at)}</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}