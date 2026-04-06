import { useEffect, useState, useRef } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
// ── AUDIT LOG ──────────────────────────────────────────────────────────────────
import { logAction } from "../utils/logAction";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm() {
  return {
    date: todayISO(),
    projectId: "",
    type: "IN",
    fromType: "member",
    fromValue: "",
    fromFreeText: "",
    toType: "member",
    toValue: "",
    toFreeText: "",
    documents: [{ docNumber: "", description: "" }],
    remarks: "",
  };
}

// ─── PartyField — reusable From/To selector ───────────────────────────────────
function PartyField({ label, typeKey, valueKey, freeTextKey, form, setForm, members, departments }) {
  const type     = form[typeKey];
  const value    = form[valueKey];
  const freeText = form[freeTextKey];

  const S = {
    group:   { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
    lbl:     { fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" },
    typeRow: { display: "flex", gap: "4px" },
    typeBtn: (active) => ({
      fontSize: "11px", padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
      border: active ? "1.5px solid var(--primary)" : "1px solid var(--border-input)",
      background: active ? "var(--primary)" : "var(--bg-input)",
      color: active ? "#fff" : "var(--text-secondary)",
      fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
      transition: "all 0.15s",
    }),
    select: { fontSize: "12px", padding: "8px 10px", borderRadius: "6px", border: "1.5px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%" },
    input:  { fontSize: "12px", padding: "8px 10px", borderRadius: "6px", border: "1.5px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%", boxSizing: "border-box" },
  };

  function setType(t) {
    setForm(f => ({ ...f, [typeKey]: t, [valueKey]: "", [freeTextKey]: "" }));
  }

  return (
    <div style={S.group}>
      <span style={S.lbl}>{label}</span>
      <div style={S.typeRow}>
        <button type="button" style={S.typeBtn(type === "member")}     onClick={() => setType("member")}>Member</button>
        <button type="button" style={S.typeBtn(type === "department")} onClick={() => setType("department")}>Dept.</button>
        <button type="button" style={S.typeBtn(type === "contractor")} onClick={() => setType("contractor")}>External</button>
      </div>

      {type === "member" && (
        members.length > 0
          ? (
            <select id={valueKey} name={valueKey} style={S.select} value={value} onChange={e => setForm(f => ({ ...f, [valueKey]: e.target.value }))}>
              <option value="">— Select member —</option>
              {members.map(m => (
                <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName}</option>
              ))}
            </select>
          )
          : <input id={freeTextKey} name={freeTextKey} autoComplete="off" style={S.input} placeholder="Member name (no members loaded yet)" value={freeText} onChange={e => setForm(f => ({ ...f, [freeTextKey]: e.target.value }))} />
      )}

      {type === "department" && (
        departments.length > 0
          ? (
            <select id={valueKey} name={valueKey} style={S.select} value={value} onChange={e => setForm(f => ({ ...f, [valueKey]: e.target.value }))}>
              <option value="">— Select department —</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          )
          : <input id={freeTextKey} name={freeTextKey} autoComplete="off" style={S.input} placeholder="Department name (none configured yet)" value={freeText} onChange={e => setForm(f => ({ ...f, [freeTextKey]: e.target.value }))} />
      )}

      {type === "contractor" && (
        <input
          id={freeTextKey}
          name={freeTextKey}
          autoComplete="off"
          style={S.input}
          placeholder="Contractor / external party name"
          value={freeText}
          onChange={e => setForm(f => ({ ...f, [freeTextKey]: e.target.value }))}
        />
      )}
    </div>
  );
}

// ─── DocumentRows — add/remove document entries ───────────────────────────────
function DocumentRows({ docs, setForm, readOnly }) {
  const S = {
    row:    { display: "grid", gridTemplateColumns: "140px 1fr auto", gap: "8px", alignItems: "center", marginBottom: "8px" },
    input:  { fontSize: "12px", padding: "7px 10px", borderRadius: "6px", border: "1.5px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%", boxSizing: "border-box" },
    addBtn: { fontSize: "11px", padding: "6px 14px", borderRadius: "6px", border: "1.5px dashed var(--border-input)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", transition: "all 0.15s" },
    delBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--border-input)", fontSize: "16px", padding: "0 4px", lineHeight: 1, transition: "color 0.15s" },
  };

  function addDoc() {
    setForm(f => ({ ...f, documents: [...f.documents, { docNumber: "", description: "" }] }));
  }
  function removeDoc(i) {
    setForm(f => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }));
  }
  function updateDoc(i, field, val) {
    setForm(f => {
      const docs = [...f.documents];
      docs[i] = { ...docs[i], [field]: val };
      return { ...f, documents: docs };
    });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Doc No.</span>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</span>
        <span />
      </div>
      {docs.map((d, i) => (
        <div key={i} style={S.row}>
          {readOnly
            ? <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600" }}>{d.docNumber || "—"}</span>
            : <input id={`docNumber-${i}`} name={`docNumber-${i}`} autoComplete="off" style={S.input} placeholder="e.g. DOC-001" value={d.docNumber} onChange={e => updateDoc(i, "docNumber", e.target.value)} />
          }
          {readOnly
            ? <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{d.description || "—"}</span>
            : <input id={`docDesc-${i}`} name={`docDesc-${i}`} autoComplete="off" style={S.input} placeholder="Brief description" value={d.description} onChange={e => updateDoc(i, "description", e.target.value)} />
          }
          {!readOnly && docs.length > 1 && (
            <button style={S.delBtn} onClick={() => removeDoc(i)}
              onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--border-input)"}>×</button>
          )}
          {readOnly && <span />}
        </div>
      ))}
      {!readOnly && (
        <button style={S.addBtn} onClick={addDoc}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
          + Add document
        </button>
      )}
    </div>
  );
}

// ─── RecordModal — create / edit / view ──────────────────────────────────────
function RecordModal({ mode, record, projects, members, departments, teamId, userProfile, onClose, onSaved }) {
  const isView   = mode === "view";
  const isEdit   = mode === "edit";
  const isCreate = mode === "create";

  const [form, setForm] = useState(() => {
    if (isCreate) return emptyForm();
    return {
      date:         record.date        || todayISO(),
      projectId:    record.projectId   || "",
      type:         record.type        || "IN",
      fromType:     record.from?.type  || "member",
      fromValue:    record.from?.value || "",
      fromFreeText: record.from?.freeText || "",
      toType:       record.to?.type    || "member",
      toValue:      record.to?.value   || "",
      toFreeText:   record.to?.freeText || "",
      documents:    record.documents?.length ? record.documents : [{ docNumber: "", description: "" }],
      remarks:      record.remarks     || "",
    };
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function resolvePartyLabel(type, value, freeText) {
    if (type === "member") {
      if (!value) return freeText || "—";
      const m = members.find(m => (m.uid || m.id) === value);
      return m?.displayName || freeText || value;
    }
    if (type === "department") return value || freeText || "—";
    return freeText || "—";
  }

  async function handleSave() {
    if (!form.date)      return setError("Date is required.");
    if (!form.projectId) return setError("Project is required.");

    const fromLabel = resolvePartyLabel(form.fromType, form.fromValue, form.fromFreeText);
    const toLabel   = resolvePartyLabel(form.toType,   form.toValue,   form.toFreeText);

    // Resolve project label for logging
    const project = projects.find(p => p.id === form.projectId);
    const projLabel = project?.projectId || project?.name || form.projectId;

    const payload = {
      teamId,
      date:      form.date,
      projectId: form.projectId,
      type:      form.type,
      from: { type: form.fromType, value: form.fromValue, freeText: form.fromFreeText, label: fromLabel },
      to:   { type: form.toType,   value: form.toValue,   freeText: form.toFreeText,   label: toLabel   },
      documents: form.documents.filter(d => d.docNumber.trim() || d.description.trim()),
      remarks:   form.remarks,
    };

    setSaving(true);
    setError("");
    try {
      if (isCreate) {
        payload.createdBy = userProfile.displayName || userProfile.email;
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "records"), payload);

        // ── LOG: record created ──────────────────────────────────────────────
        logAction({
          teamId,
          action:      `Added ${form.type === "IN" ? "incoming" : "outgoing"} record for project ${projLabel} (from: ${fromLabel}, to: ${toLabel})`,
          category:    "record",
          performedBy: userProfile.displayName || userProfile.email || "Unknown",
        });

      } else {
        payload.lastModifiedBy = userProfile.displayName || userProfile.email;
        payload.lastModifiedAt = serverTimestamp();
        await updateDoc(doc(db, "records", record.id), payload);

        // ── LOG: record edited ───────────────────────────────────────────────
        logAction({
          teamId,
          action:      `Edited ${form.type === "IN" ? "incoming" : "outgoing"} record for project ${projLabel}`,
          category:    "record",
          performedBy: userProfile.displayName || userProfile.email || "Unknown",
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const project = projects.find(p => p.id === (isView || isEdit ? record?.projectId : form.projectId));

  const S = {
    overlay:  { position: "fixed", inset: 0, background: "rgba(10,24,40,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
    modal:    { background: "var(--bg-card)", borderRadius: "14px", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-main)" },
    header:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1.5px solid var(--border-light)" },
    title:    { fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" },
    closeBtn: { background: "none", border: "none", fontSize: "20px", color: "var(--text-disabled)", cursor: "pointer", lineHeight: 1 },
    body:     { padding: "20px 24px" },
    section:  { marginBottom: "20px" },
    sLabel:   { fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" },
    row2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" },
    input:    { fontSize: "12px", padding: "8px 10px", borderRadius: "6px", border: "1.5px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%", boxSizing: "border-box" },
    select:   { fontSize: "12px", padding: "8px 10px", borderRadius: "6px", border: "1.5px solid var(--border-input)", background: "var(--bg-input)", color: "var(--text-primary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%" },
    typePill: { display: "inline-block", fontSize: "11px", fontWeight: "700", padding: "3px 12px", borderRadius: "10px", letterSpacing: "0.5px" },
    footer:   { display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1.5px solid var(--border-light)" },
    cancelBtn:{ fontSize: "12px", padding: "9px 18px", borderRadius: "7px", border: "1px solid var(--border-input)", background: "var(--bg-secondary)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
    saveBtn:  { fontSize: "12px", padding: "9px 22px", borderRadius: "7px", border: "none", background: saving ? "var(--bg-secondary)" : "var(--primary)", color: saving ? "var(--text-disabled)" : "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: "600", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
    viewVal:  { fontSize: "13px", color: "var(--text-primary)", padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-light)" },
    divider:  { height: "1px", background: "var(--border-light)", margin: "18px 0" },
    errorMsg: { fontSize: "12px", color: "var(--danger)", marginBottom: "12px", padding: "8px 12px", background: "var(--danger-bg, #fcebeb)", borderRadius: "6px", border: "1px solid var(--danger)" },
  };

  const typeColor = form.type === "IN"
    ? { bg: "#e6f4ea", color: "#1a7a38" }
    : { bg: "#fff3e0", color: "#b45309" };

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={S.title}>
              {isCreate ? "New Record" : isEdit ? "Edit Record" : "Record Details"}
            </span>
            {(isView || isEdit) && (
              <span style={{ ...S.typePill, background: typeColor.bg, color: typeColor.color }}>
                {record.type === "IN" ? "▼ INCOMING" : "▲ OUTGOING"}
              </span>
            )}
          </div>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={S.body}>
          {/* Date + Project */}
          <div style={S.row2}>
            <div>
              <span style={S.sLabel}>Date</span>
              {isView
                ? <div style={S.viewVal}>{formatDate(record.date)}</div>
                : <input id="record-date" name="record-date" type="date" style={S.input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              }
            </div>
            <div>
              <span style={S.sLabel}>Project</span>
              {isView
                ? <div style={S.viewVal}>{project?.projectId || record.projectId || "—"}</div>
                : (
                  <select id="record-project" name="record-project" style={S.select} value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                    <option value="">— Select project —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectId || p.name || p.id}</option>
                    ))}
                  </select>
                )
              }
            </div>
          </div>

          {/* Type toggle */}
          {!isView && (
            <div style={{ marginBottom: "16px" }}>
              <span style={S.sLabel}>Type</span>
              <div style={{ display: "flex", gap: "8px" }}>
                {["IN", "OUT"].map(t => (
                  <button key={t} type="button"
                    style={{ fontSize: "12px", padding: "7px 22px", borderRadius: "7px", cursor: "pointer", fontWeight: "600", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", border: form.type === t ? "none" : "1.5px solid var(--border-input)", background: form.type === t ? (t === "IN" ? "#1a7a38" : "#b45309") : "var(--bg-input)", color: form.type === t ? "#fff" : "var(--text-secondary)", transition: "all 0.15s" }}
                    onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {t === "IN" ? "▼ Incoming" : "▲ Outgoing"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={S.divider} />

          {/* From / To */}
          {isView
            ? (
              <div style={S.row2}>
                <div>
                  <span style={S.sLabel}>From</span>
                  <div style={S.viewVal}>{record.from?.label || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", textTransform: "capitalize" }}>{record.from?.type || ""}</div>
                </div>
                <div>
                  <span style={S.sLabel}>To</span>
                  <div style={S.viewVal}>{record.to?.label || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", textTransform: "capitalize" }}>{record.to?.type || ""}</div>
                </div>
              </div>
            )
            : (
              <div style={S.row2}>
                <PartyField label="From" typeKey="fromType" valueKey="fromValue" freeTextKey="fromFreeText" form={form} setForm={setForm} members={members} departments={departments} />
                <PartyField label="To"   typeKey="toType"   valueKey="toValue"   freeTextKey="toFreeText"   form={form} setForm={setForm} members={members} departments={departments} />
              </div>
            )
          }

          <div style={S.divider} />

          {/* Documents */}
          <div style={S.section}>
            <span style={S.sLabel}>Attached Documents</span>
            {isView
              ? (
                record.documents?.length
                  ? <DocumentRows docs={record.documents} setForm={() => {}} readOnly />
                  : <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No documents attached.</div>
              )
              : <DocumentRows docs={form.documents} setForm={setForm} readOnly={false} />
            }
          </div>

          {/* Remarks */}
          <div style={S.section}>
            <span style={S.sLabel}>Remarks</span>
            {isView
              ? <div style={{ ...S.viewVal, minHeight: "40px", lineHeight: "1.5" }}>{record.remarks || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>None</span>}</div>
              : <textarea id="record-remarks" name="record-remarks" style={{ ...S.input, minHeight: "70px", resize: "vertical", lineHeight: "1.5" }} placeholder="Optional remarks or notes…" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            }
          </div>

          {/* Meta info on view */}
          {isView && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border-light)", paddingTop: "12px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {record.createdBy      && <span>Created by <strong>{record.createdBy}</strong></span>}
              {record.lastModifiedBy && <span>Last edited by <strong>{record.lastModifiedBy}</strong></span>}
            </div>
          )}

          {error && <div style={S.errorMsg}>{error}</div>}
        </div>

        {/* Footer */}
        {!isView && (
          <div style={S.footer}>
            <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isCreate ? "Add Record" : "Save Changes"}
            </button>
          </div>
        )}
        {isView && (
          <div style={{ ...S.footer, justifyContent: "flex-end" }}>
            <button style={S.cancelBtn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DeleteConfirm modal ──────────────────────────────────────────────────────
function DeleteConfirm({ record, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    await onConfirm(record.id);
    setDeleting(false);
    onClose();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,24,40,0.6)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", padding: "24px 28px", width: "360px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-main)" }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--danger)", marginBottom: "10px" }}>Delete Record?</div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: "1.6" }}>
          This will permanently delete this record and all its attached documents. This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: "12px", padding: "8px 18px", borderRadius: "7px", border: "1px solid var(--border-input)", background: "var(--bg-secondary)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{ fontSize: "12px", padding: "8px 18px", borderRadius: "7px", border: "none", background: "var(--danger)", color: "#fff", cursor: deleting ? "not-allowed" : "pointer", fontWeight: "600", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Records Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function Records() {
  const { userProfile }            = useAuth();
  const { team, members, isAdmin } = useTeam();

  const [records,  setRecords]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [filterType,    setFilterType]    = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [filterDate,    setFilterDate]    = useState("");

  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const departments = team?.departments || [];

  // ── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(
      collection(db, "records"),
      where("teamId", "==", userProfile.teamId),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = collection(db, "teams", userProfile.teamId, "projects");
    return onSnapshot(q, snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userProfile?.teamId]);

  // ── Filtered records ───────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    if (filterType    !== "All" && r.type      !== filterType)    return false;
    if (filterProject !== "All" && r.projectId !== filterProject) return false;
    if (filterDate    && r.date !== filterDate)                   return false;
    return true;
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    // Capture record details before deletion for the log
    const target     = records.find(r => r.id === id);
    const project    = projects.find(p => p.id === target?.projectId);
    const projLabel  = project?.projectId || project?.name || target?.projectId || "unknown project";

    await deleteDoc(doc(db, "records", id));

    // ── LOG: record deleted ────────────────────────────────────────────────
    logAction({
      teamId:      userProfile.teamId,
      action:      `Deleted ${target?.type === "IN" ? "incoming" : "outgoing"} record for project ${projLabel}`,
      category:    "record",
      performedBy: userProfile.displayName || userProfile.email || "Unknown",
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function projectLabel(projectId) {
    const p = projects.find(p => p.id === projectId);
    return p?.projectId || p?.name || projectId || "—";
  }

  const adminUser  = isAdmin();
  const totalIn    = records.filter(r => r.type === "IN").length;
  const totalOut   = records.filter(r => r.type === "OUT").length;
  const hasFilters = filterType !== "All" || filterProject !== "All" || filterDate !== "";

  const S = {
    page:     { fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", padding: "20px" },
    header:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title:    { fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" },
    subtitle: { fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" },
    stat:     { background: "var(--bg-card)", border: "0.5px solid var(--border-main)", borderRadius: "8px", padding: "14px", textAlign: "center" },
    statNum:  (c) => ({ fontSize: "26px", fontWeight: "700", color: c || "var(--text-primary)" }),
    statLbl:  { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" },
    filters:  { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" },
    select:   { fontSize: "12px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-input)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", color: "var(--text-primary)" },
    dateInput:{ fontSize: "12px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-input)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", color: "var(--text-primary)" },
    addBtn:   { fontSize: "12px", padding: "7px 16px", borderRadius: "7px", border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: "600", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", display: "flex", alignItems: "center", gap: "6px", transition: "opacity 0.15s" },
    table:    { width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden", border: "0.5px solid var(--border-main)" },
    th:       { padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.6px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border-main)" },
    td:       { padding: "11px 14px", fontSize: "12px", color: "var(--text-primary)", borderBottom: "0.5px solid var(--border-light)", verticalAlign: "middle" },
    typePill: (type) => ({ display: "inline-block", fontSize: "10px", fontWeight: "700", padding: "3px 9px", borderRadius: "10px", letterSpacing: "0.4px", background: type === "IN" ? "#e6f4ea" : "#fff3e0", color: type === "IN" ? "#1a7a38" : "#b45309" }),
    actionBtn:(danger) => ({ fontSize: "11px", padding: "4px 10px", borderRadius: "5px", cursor: "pointer", border: `1px solid ${danger ? "var(--danger)" : "var(--border-input)"}`, background: "transparent", color: danger ? "var(--danger)" : "var(--text-secondary)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", transition: "all 0.15s" }),
    empty:    { textAlign: "center", color: "var(--text-disabled)", padding: "48px 20px", fontSize: "13px", fontStyle: "italic" },
    clearBtn: { fontSize: "11px", padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
  };

  return (
    <div style={S.page}>

      {/* Modals */}
      {modal && (
        <RecordModal
          mode={modal.mode}
          record={modal.record}
          projects={projects}
          members={members || []}
          departments={departments}
          teamId={userProfile.teamId}
          userProfile={userProfile}
          onClose={() => setModal(null)}
          onSaved={() => {}}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          record={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>Records</div>
          <div style={S.subtitle}>Logbook of all incoming and outgoing documents</div>
        </div>
        <button
          style={S.addBtn}
          onClick={() => setModal({ mode: "create" })}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          + New Record
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        <div style={S.stat}>
          <div style={S.statNum("var(--primary)")}>{records.length}</div>
          <div style={S.statLbl}>Total Records</div>
        </div>
        <div style={S.stat}>
          <div style={S.statNum("#1a7a38")}>{totalIn}</div>
          <div style={S.statLbl}>Incoming</div>
        </div>
        <div style={S.stat}>
          <div style={S.statNum("#b45309")}>{totalOut}</div>
          <div style={S.statLbl}>Outgoing</div>
        </div>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <select id="filter-type" name="filter-type" style={S.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          <option value="IN">▼ Incoming</option>
          <option value="OUT">▲ Outgoing</option>
        </select>
        <select id="filter-project" name="filter-project" style={S.select} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.projectId || p.name || p.id}</option>
          ))}
        </select>
        <input
          id="filter-date"
          name="filter-date"
          type="date"
          style={S.dateInput}
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          title="Filter by date"
        />
        {hasFilters && (
          <button style={S.clearBtn} onClick={() => { setFilterType("All"); setFilterProject("All"); setFilterDate(""); }}>
            ✕ Clear filters
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        {loading
          ? <div style={S.empty}>Loading records…</div>
          : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Project</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>From</th>
                  <th style={S.th}>To</th>
                  <th style={S.th}>Department</th>
                  <th style={S.th}>External Party</th>
                  <th style={S.th}>Docs</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...S.td, ...S.empty }}>
                      {records.length === 0
                        ? "No records yet. Click '+ New Record' to add the first one."
                        : "No records match the current filters."}
                    </td>
                  </tr>
                )}
                {filtered.map(r => {
                  const deptValue   = r.from?.type === "department" ? r.from?.label : r.to?.type === "department" ? r.to?.label : "—";
                  const externalVal = r.from?.type === "contractor" ? r.from?.label : r.to?.type === "contractor" ? r.to?.label : "—";
                  const docCount    = r.documents?.length || 0;

                  return (
                    <tr key={r.id}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{formatDate(r.date)}</td>
                      <td style={{ ...S.td, fontWeight: "600", color: "var(--primary)" }}>{projectLabel(r.projectId)}</td>
                      <td style={S.td}><span style={S.typePill(r.type)}>{r.type === "IN" ? "▼ IN" : "▲ OUT"}</span></td>
                      <td style={S.td}>{r.from?.label || "—"}</td>
                      <td style={S.td}>{r.to?.label   || "—"}</td>
                      <td style={S.td}>{deptValue}</td>
                      <td style={S.td}>{externalVal}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        {docCount > 0
                          ? <span style={{ fontSize: "11px", fontWeight: "600", background: "var(--bg-hover)", border: "1px solid var(--border-main)", borderRadius: "10px", padding: "2px 9px", color: "var(--text-primary)" }}>{docCount}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>
                        }
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            style={S.actionBtn(false)}
                            onClick={() => setModal({ mode: "view", record: r })}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                          >View</button>
                          {adminUser && (
                            <>
                              <button
                                style={S.actionBtn(false)}
                                onClick={() => setModal({ mode: "edit", record: r })}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-input)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                              >Edit</button>
                              <button
                                style={S.actionBtn(true)}
                                onClick={() => setDeleteTarget(r)}
                                onMouseEnter={e => { e.currentTarget.style.background = "var(--danger)"; e.currentTarget.style.color = "#fff"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--danger)"; }}
                              >Del</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}