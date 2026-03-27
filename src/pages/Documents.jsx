import { useEffect, useState, useRef } from "react";
import React from "react";
import { useLocation } from "react-router-dom";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

// ─── Default Status List ───────────────────────────────────────────────────────
export const DEFAULT_STATUSES = [
  "PRECOMPILING",
  "FOR DoTS",
  "FOR CHECKING",
  "LACKING",
  "FOR APPROVAL",
  "APPROVED",
  "XEROX & CTC DOCUMENTS",
  "REVIEW TO MONITORING",
  "FOR SCANNING",
  "FOR APPROVAL IN PCMA",
  "FOR SUBMISSION ON GOOGLE DOCS",
  "ARCHIVED",
];

const DEFAULT_SUBJECT_TYPES = [
  "AS-STAKED PLAN",
  "V.O.",
  "CTE",
  "W.S.O.",
  "W.R.O.",
  "RPDM",
  "REVISED PLAN",
  "AS BUILT PLAN",
];

const NUMBERED_TYPES = new Set(["V.O.", "CTE", "W.S.O.", "W.R.O.", "RPDM"]);

const DEFAULT_LACKING_ITEMS = {
  "AS-STAKED PLAN": ["Location Plan", "As-Staked Drawing", "Survey Notes", "Contractor's Certification"],
  "V.O.":           ["Variation Order Form", "Revised Cost Estimate", "Justification Letter", "Contractor's Request"],
  "CTE":            ["Time Extension Request Letter", "Unworkable Days Log", "Weather Records / PAGASA Cert", "Contractor's Justification"],
  "W.S.O.":         ["Suspension Order Form", "Justification for Suspension", "Notice to Contractor"],
  "W.R.O.":         ["Resumption Order Form", "Compliance Documents", "Notice to Resume Work"],
  "RPDM":           ["Revised PDM Chart", "Supporting Documents", "Updated S-Curve"],
  "REVISED PLAN":   ["Revised Drawings", "Design Changes Summary", "Engineer's Approval"],
  "AS BUILT PLAN":  ["As-Built Drawings", "Completion Certificate", "Final Inspection Report"],
};

const STATUS_COLORS = {
  "PRECOMPILING":                  ["#e6f1fb", "#185fa5"],
  "FOR DoTS":                      ["#ddeeff", "#1060b0"],
  "FOR CHECKING":                  ["#faeeda", "#854f0b"],
  "LACKING":                       ["#fcebeb", "#a32d2d"],
  "FOR APPROVAL":                  ["#eaf3de", "#3b6d11"],
  "APPROVED":                      ["#d4edda", "#1a5e2a"],
  "XEROX & CTC DOCUMENTS":         ["#f5f0ff", "#5b2d9a"],
  "REVIEW TO MONITORING":          ["#fff8e1", "#8a6000"],
  "FOR SCANNING":                  ["#e8f4fd", "#1565c0"],
  "FOR APPROVAL IN PCMA":          ["#e8f5e9", "#2d6e12"],
  "FOR SUBMISSION ON GOOGLE DOCS": ["#f0eee8", "#5a5a5a"],
  "ARCHIVED":                      ["#f0f0f0", "#6b6b6b"],
};

const toKey   = (str) => str.replace(/\s+/g, "_");
const getClr  = (st)  => STATUS_COLORS[st] || ["#eee", "#555"];

function ordinal(n) {
  const v = n % 100;
  const s = ["th", "st", "nd", "rd"];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function composeLabel(type, num, rpdmRef) {
  switch (type) {
    case "V.O.":   return `V.O. No. ${num}`;
    case "CTE":    return `CTE#${num}`;
    case "W.S.O.": return `W.S.O. No. ${num}`;
    case "W.R.O.": return `W.R.O. No. ${num}`;
    case "RPDM":   return `${ordinal(+num)} RPDM due to ${rpdmRef || "—"}`;
    default:       return type;
  }
}

const S = {
  page:       { fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", padding: "20px" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  pageTitle:  { fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" },
  btn: (primary = false, danger = false) => ({
    padding: "8px 16px", borderRadius: "6px", cursor: "pointer",
    fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "12px",
    border:     danger ? "1px solid var(--danger)" : primary ? "none" : "1px solid var(--primary)",
    background: danger ? "transparent"             : primary ? "var(--primary)" : "transparent",
    color:      danger ? "var(--danger)"            : primary ? "#fff"          : "var(--primary)",
  }),
  smBtn: (primary = false, danger = false) => ({
    padding: "5px 12px", borderRadius: "6px", cursor: "pointer",
    fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "11px",
    border:     danger ? "1px solid var(--danger)" : primary ? "none" : "1px solid var(--primary)",
    background: danger ? "transparent"             : primary ? "var(--primary)" : "transparent",
    color:      danger ? "var(--danger)"            : primary ? "#fff"          : "var(--primary)",
  }),
  filters:    { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
  select:     { fontSize: "12px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-input)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", color: "var(--text-primary)" },
  table:      { width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden", border: "0.5px solid var(--border-main)" },
  th:         { padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.6px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border-main)" },
  td:         { padding: "11px 14px", fontSize: "12px", color: "var(--text-primary)", borderBottom: "0.5px solid var(--border-light)", verticalAlign: "middle" },
  pill:       (st) => { const [bg, c] = getClr(st); return { display: "inline-block", fontSize: "10px", padding: "3px 9px", borderRadius: "10px", background: bg, color: c, fontWeight: "500", whiteSpace: "nowrap" }; },
  stageBadge: { fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", background: "var(--bg-secondary)", borderRadius: "4px", padding: "3px 8px", whiteSpace: "nowrap", letterSpacing: "0.3px" },
  detCell:    { padding: "16px 20px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-main)" },
  input:      { padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", fontSize: "12px", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", width: "100%", boxSizing: "border-box", background: "var(--bg-input)", color: "var(--text-primary)" },
  label:      { fontSize: "11px", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "4px", display: "block" },
  modal:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" },
  mBox:       { background: "var(--bg-card)", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", marginTop: "40px", border: "1px solid var(--border-main)", boxShadow: "var(--shadow-lg)" },
  sectionLabel: { fontSize: "11px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" },
  divider:    { borderTop: "0.5px solid var(--border-main)", margin: "14px 0" },
  chkRow:     { display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", fontSize: "12px", cursor: "pointer", userSelect: "none", color: "var(--text-primary)" },
};

// Inject the drain keyframe animation once into the document head
function ensureDrainStyle() {
  const id = "lacking-drain-keyframes";
  if (!document.getElementById(id)) {
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `@keyframes lackingDrain { from { width: 100%; } to { width: 0%; } }`;
    document.head.appendChild(el);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ArchiveWarningModal
// ═══════════════════════════════════════════════════════════════════════════════
function ArchiveWarningModal({ docSubject, onConfirm, onCancel }) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        padding: "28px",
        width: "100%",
        maxWidth: "420px",
        border: "1.5px solid var(--danger, #c0392b)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      }}>
        {/* Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#fcebeb", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, fontSize: "20px",
          }}>
            🗄️
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
              Archive Document?
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              This action is permanent and cannot be undone in-app.
            </div>
          </div>
        </div>

        {/* Document name */}
        {docSubject && (
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-main)",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "12px",
            color: "var(--text-primary)",
            marginBottom: "18px",
            fontStyle: "italic",
          }}>
            "{docSubject}"
          </div>
        )}

        {/* Warning text */}
        <div style={{
          background: "#fcebeb",
          border: "1px solid #e8b4b4",
          borderRadius: "8px",
          padding: "12px 14px",
          marginBottom: "20px",
          fontSize: "12px",
          color: "#a32d2d",
          lineHeight: "1.6",
        }}>
          <div style={{ fontWeight: "700", marginBottom: "6px" }}>⚠️ Before you proceed:</div>
          <ul style={{ margin: 0, paddingLeft: "18px" }}>
            <li>This document will be <strong>permanently archived</strong>.</li>
            <li>It will be <strong>hidden</strong> from the Dashboard and Documents tab.</li>
            <li>This action <strong>cannot be undone</strong>.</li>
            <li style={{ marginTop: "6px", color: "#7a5c00", listStyle: "none", marginLeft: "-4px", fontStyle: "italic", fontSize: "11px" }}>
              📋 Any proposed edits to an archived document will require permission from the respective section or authorized personnel.
            </li>
          </ul>
        </div>

        {/* Checkbox confirmation */}
        <label
          style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            cursor: "pointer", marginBottom: "22px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: `1.5px solid ${checked ? "var(--danger, #c0392b)" : "var(--border-main)"}`,
            background: checked ? "#fcebeb" : "var(--bg-hover)",
            transition: "all 0.15s ease",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: "1px", accentColor: "var(--danger, #c0392b)", flexShrink: 0 }}
          />
          <span style={{ fontSize: "12px", color: "var(--text-primary)", lineHeight: "1.5" }}>
            I understand that archiving this document is <strong>permanent</strong> and cannot be undone.
          </span>
        </label>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px", borderRadius: "6px", cursor: "pointer",
              fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "12px",
              border: "1px solid var(--border-input)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontWeight: "500",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            style={{
              padding: "9px 20px", borderRadius: "6px",
              fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontSize: "12px",
              fontWeight: "600",
              border: "none",
              background: checked ? "var(--danger, #c0392b)" : "var(--border-light)",
              color: checked ? "#fff" : "var(--text-disabled)",
              cursor: checked ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
            }}
          >
            Archive Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LackingItem ──────────────────────────────────────────────────────────────
const COUNTDOWN_MS = 10000;

function LackingItem({ item, isCustom, onToggle, onRemove }) {
  const [pending,  setPending]  = useState(false);
  const timerRef               = useRef(null);
  const startKey               = useRef(0);

  useEffect(() => {
    if (!item.checked && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setPending(false);
    }
  }, [item.checked]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleChange() {
    if (!item.checked) {
      onToggle(item.id, isCustom);
      startKey.current += 1;
      setPending(true);
      timerRef.current = setTimeout(() => {
        onRemove(item.id, isCustom);
        timerRef.current = null;
        setPending(false);
      }, COUNTDOWN_MS);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setPending(false);
      }
      onToggle(item.id, isCustom);
    }
  }

  return (
    <div style={{ marginBottom: "2px" }}>
      <label style={S.chkRow}>
        <input type="checkbox" checked={item.checked} onChange={handleChange} />
        <span style={{ textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "var(--text-disabled)" : "var(--text-primary)", flex: 1 }}>
          {item.label}
        </span>
        {isCustom && <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>(added)</span>}
        {pending  && <span style={{ fontSize: "10px", color: "var(--warning)", fontStyle: "italic" }}>removing…</span>}
      </label>
      {pending && (
        <div style={{ height: "2px", background: "var(--border-light)", borderRadius: "1px", marginLeft: "24px", marginTop: "-2px", marginBottom: "4px", overflow: "hidden" }}>
          <div
            key={startKey.current}
            style={{ height: "100%", background: "var(--warning)", borderRadius: "1px", animation: `lackingDrain ${COUNTDOWN_MS}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DetailsPanel
// ═══════════════════════════════════════════════════════════════════════════════
function DetailsPanel({
  document: d, statuses, members, adminMode,
  onStatusChange, onSaveDetails, onToggleLacking,
  onRemoveLackingItem, onClearCompleted,
  onAddCustomItem, onAssignMember, onDelete,
}) {
  const { status } = d;
  const key = toKey(status);

  const [localData,        setLocalData]        = useState(() => d.statusDetails?.[key] || {});
  const [newItem,          setNewItem]          = useState("");
  const [saving,           setSaving]           = useState(false);
  const [pendingArchive,   setPendingArchive]   = useState(false); // show warning modal
  const [selectedStatus,   setSelectedStatus]   = useState(status); // track dropdown value

  useEffect(() => { ensureDrainStyle(); }, []);
  useEffect(() => {
    setLocalData(d.statusDetails?.[toKey(d.status)] || {});
    setSelectedStatus(d.status);
  }, [d.id, d.status, JSON.stringify(d.statusDetails)]);

  async function handleSave() { setSaving(true); await onSaveDetails(status, localData); setSaving(false); }

  // ─── Status dropdown change ─────────────────────────────────────────────────
  function handleStatusDropdownChange(newSt) {
    if (newSt === "ARCHIVED") {
      // Intercept — show warning modal, don't save yet
      setSelectedStatus("ARCHIVED"); // visually show selection
      setPendingArchive(true);
    } else {
      setSelectedStatus(newSt);
      onStatusChange(newSt);
    }
  }

  function handleArchiveConfirm() {
    setPendingArchive(false);
    onStatusChange("ARCHIVED");
  }

  function handleArchiveCancel() {
    setPendingArchive(false);
    // Revert dropdown back to the current saved status
    setSelectedStatus(d.status);
  }

  const lacking  = d.statusDetails?.["LACKING"] || { items: [], customItems: [] };
  const allItems = [...(lacking.items || []), ...(lacking.customItems || [])];
  const complied = allItems.filter((it) => it.checked).length;
  const allDone  = allItems.length > 0 && complied === allItems.length;
  const anyDone  = complied > 0;

  const isEarlyStatus  = status === "PRECOMPILING" || status === "FOR DoTS";
  const assignedMember = members?.find((m) => (m.uid || m.id) === d.assignedTo);

  return (
    <div style={{ maxWidth: "600px" }}>

      {/* Archive Warning Modal */}
      {pendingArchive && (
        <ArchiveWarningModal
          docSubject={d.subject}
          onConfirm={handleArchiveConfirm}
          onCancel={handleArchiveCancel}
        />
      )}

      {isEarlyStatus && (
        <div style={{ marginBottom: "14px", background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: "6px", padding: "8px 12px", fontSize: "11px", color: "var(--warning)" }}>
          ⏳ DoTS details to be updated soon.
        </div>
      )}

      <div style={{ marginBottom: "14px" }}>
        <div style={S.sectionLabel}>Assigned To</div>
        {adminMode ? (
          <select style={{ ...S.select, width: "100%" }} value={d.assignedTo || ""} onChange={(e) => onAssignMember(e.target.value)}>
            <option value="">— Unassigned —</option>
            {(members || []).map((m) => <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName}</option>)}
          </select>
        ) : (
          <div style={{ fontSize: "12px", color: assignedMember ? "var(--text-primary)" : "var(--text-disabled)", fontStyle: assignedMember ? "normal" : "italic" }}>
            {assignedMember ? assignedMember.displayName : "Unassigned"}
          </div>
        )}
      </div>

      <div style={S.divider} />

      {adminMode && (
        <>
          <div style={S.sectionLabel}>Change Status</div>
          <select
            style={{ ...S.select, marginBottom: "4px" }}
            value={selectedStatus}
            onChange={(e) => handleStatusDropdownChange(e.target.value)}
          >
            {statuses.map((st) => (
              <option key={st} value={st} style={st === "ARCHIVED" ? { color: "#a32d2d", fontWeight: "600" } : {}}>
                {st === "ARCHIVED" ? "🗄️ ARCHIVED (permanent)" : st}
              </option>
            ))}
          </select>
          {/* Archive hint below the dropdown */}
          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "8px" }}>
            ⚠️ Selecting <strong>ARCHIVED</strong> is permanent and cannot be undone in-app.
          </div>
          <div style={S.divider} />
        </>
      )}

      {status === "FOR DoTS" && (
        <div>
          <div style={S.sectionLabel}>FOR DoTS Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={S.label}>Document Reference No.</label>
              <input style={S.input} value={localData.refNumber || ""} placeholder="e.g. 2026-0234" disabled={!adminMode}
                onChange={(e) => setLocalData((p) => ({ ...p, refNumber: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Date Issued</label>
              <input style={S.input} type="date" value={localData.date || ""} disabled={!adminMode}
                onChange={(e) => setLocalData((p) => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          {adminMode && <button style={{ ...S.smBtn(true), marginTop: "12px" }} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>}
        </div>
      )}

      {status === "LACKING" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={S.sectionLabel}>Lacking Attachments</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {anyDone && (
                <button
                  onClick={onClearCompleted}
                  style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", border: "1px solid var(--danger)", background: "var(--danger-bg)", color: "var(--danger)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", fontWeight: "600" }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  title="Remove all checked items immediately"
                >
                  ✕ Clear completed
                </button>
              )}
              <span style={{ fontSize: "11px", fontWeight: "600", color: allDone ? "var(--success)" : "var(--warning)", background: allDone ? "var(--success-bg)" : "var(--warning-bg)", padding: "2px 8px", borderRadius: "10px" }}>
                {complied}/{allItems.length} complied
              </span>
            </div>
          </div>

          {allItems.length > 0 && (
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "8px", fontStyle: "italic" }}>
              Checked items are removed automatically after 10 seconds. Uncheck to cancel.
            </div>
          )}

          {(lacking.items || []).map((item) => (
            <LackingItem key={item.id} item={item} isCustom={false} onToggle={onToggleLacking} onRemove={onRemoveLackingItem} />
          ))}
          {(lacking.customItems || []).map((item) => (
            <LackingItem key={item.id} item={item} isCustom={true} onToggle={onToggleLacking} onRemove={onRemoveLackingItem} />
          ))}

          {allItems.length === 0 && (
            <div style={{ fontSize: "12px", color: "var(--text-disabled)", padding: "6px 0" }}>No items in checklist yet.</div>
          )}

          {adminMode && (
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input
                style={{ ...S.input, flex: 1 }} value={newItem} placeholder="Add item to checklist…"
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { onAddCustomItem(newItem.trim()); setNewItem(""); } }}
              />
              <button style={S.smBtn(true)} onClick={() => { if (newItem.trim()) { onAddCustomItem(newItem.trim()); setNewItem(""); } }}>Add</button>
            </div>
          )}
        </div>
      )}

      {status === "FOR APPROVAL" && (
        <div>
          <div style={S.sectionLabel}>For Approval Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={S.label}>Department</label>
              <input style={S.input} value={localData.department || ""} placeholder="e.g. PLANNING" disabled={!adminMode}
                onChange={(e) => setLocalData((p) => ({ ...p, department: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label style={S.label}>Date Received by Department</label>
              <input style={S.input} type="date" value={localData.dateReceived || ""} disabled={!adminMode}
                onChange={(e) => setLocalData((p) => ({ ...p, dateReceived: e.target.value }))} />
            </div>
          </div>
          {localData.department && localData.dateReceived && (
            <div style={{ marginTop: "12px", background: "var(--success-bg)", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "var(--success)", fontWeight: "600", borderLeft: "3px solid var(--success)" }}>
              CURRENTLY IN THE {localData.department} DEPARTMENT AS OF{" "}
              {new Date(localData.dateReceived + "T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          )}
          {adminMode && <button style={{ ...S.smBtn(true), marginTop: "12px" }} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>}
        </div>
      )}

      {status === "ARCHIVED" && (
        <div>
          <div style={S.sectionLabel}>Archive Details</div>

          {/* Archive date — admin editable */}
          <div style={{ marginBottom: "12px" }}>
            <label style={S.label}>
              Date Archived
              {adminMode && (
                <span style={{ marginLeft: "6px", fontSize: "10px", color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>
                  (admin editable)
                </span>
              )}
            </label>
            <input
              style={{ ...S.input, maxWidth: "200px" }}
              type="date"
              disabled={!adminMode}
              value={localData.archivedDate || (d.archivedAt?.toDate ? d.archivedAt.toDate().toISOString().slice(0, 10) : "")}
              onChange={(e) => setLocalData((p) => ({ ...p, archivedDate: e.target.value }))}
            />
          </div>

          {/* Archived by — read only */}
          {d.archivedBy && (
            <div style={{ marginBottom: "12px" }}>
              <label style={S.label}>Archived By</label>
              <div style={{ fontSize: "12px", color: "var(--text-primary)" }}>{d.archivedBy}</div>
            </div>
          )}

          {/* Future note */}
          <div style={{
            fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic",
            background: "var(--bg-secondary)", borderRadius: "6px",
            padding: "8px 12px", marginBottom: "12px",
            border: "1px dashed var(--border-main)",
          }}>
            📋 Date editability will be governed by per-section authorization once that feature is implemented.
          </div>

          {adminMode && (
            <button style={{ ...S.smBtn(true) }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      )}

      {!["FOR DoTS", "LACKING", "FOR APPROVAL", "ARCHIVED"].includes(status) && (
        <div>
          <label style={S.label}>Notes / Remarks</label>
          <textarea style={{ ...S.input, resize: "vertical", minHeight: "64px" }} value={localData.notes || ""}
            placeholder="Add notes or remarks for this status…" disabled={!adminMode}
            onChange={(e) => setLocalData((p) => ({ ...p, notes: e.target.value }))} />
          {adminMode && <button style={{ ...S.smBtn(true), marginTop: "8px" }} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>}
        </div>
      )}

      {adminMode && (
        <>
          <div style={S.divider} />
          <button style={S.smBtn(false, true)} onClick={onDelete}>Delete Document</button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AddDocumentModal
// ═══════════════════════════════════════════════════════════════════════════════
function AddDocumentModal({ form, setForm, projects, statuses, subjectTypes, members, adminMode, onSave, onClose }) {
  const needsNum = NUMBERED_TYPES.has(form.subjectType);
  const isRpdm   = form.subjectType === "RPDM";
  const preview  = needsNum ? composeLabel(form.subjectType, form.subjectNum, form.rpdmRef) : null;
  const [saving, setSaving] = useState(false);

  // Exclude ARCHIVED from the initial status options when adding a new doc
  const addableStatuses = statuses.filter((st) => st !== "ARCHIVED");

  async function handleSave() { setSaving(true); await onSave(); setSaving(false); }

  return (
    <div style={S.modal} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.mBox}>
        <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "20px" }}>Add New Document</div>

        <label style={S.label}>Project ID *</label>
        <select style={{ ...S.input, marginBottom: "12px" }} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
          <option value="">— Select project —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.projectId || p.name || p.id}</option>)}
        </select>

        <label style={S.label}>Subject Type *</label>
        <select style={{ ...S.input, marginBottom: "12px" }} value={form.subjectType} onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value, subjectNum: 1, rpdmRef: "" }))}>
          {subjectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {needsNum && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: isRpdm ? "1fr 2fr" : "1fr", gap: "10px", marginBottom: "12px" }}>
              <div>
                <label style={S.label}>{isRpdm ? "RPDM No." : "Number"}</label>
                <input style={S.input} type="number" min="1" value={form.subjectNum} onChange={(e) => setForm((f) => ({ ...f, subjectNum: Math.max(1, +e.target.value) }))} />
              </div>
              {isRpdm && (
                <div>
                  <label style={S.label}>Due to (reference)</label>
                  <input style={S.input} value={form.rpdmRef} placeholder="e.g. CTE#1, V.O. No. 2" onChange={(e) => setForm((f) => ({ ...f, rpdmRef: e.target.value }))} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: "12px", fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "6px", padding: "8px 12px" }}>
              Label preview: <strong style={{ color: "var(--text-primary)" }}>{preview}</strong>
            </div>
          </>
        )}

        <label style={S.label}>Initial Status</label>
        <select style={{ ...S.input, marginBottom: "12px" }} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          {addableStatuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>

        <label style={S.label}>DoTS Date</label>
        <input style={{ ...S.input, marginBottom: "12px" }} type="date" value={form.dotsDate} onChange={(e) => setForm((f) => ({ ...f, dotsDate: e.target.value }))} />

        <label style={S.label}>DoTS Tracking ID <span style={{ color: "var(--text-disabled)", fontWeight: 400 }}>(optional)</span></label>
        <input style={{ ...S.input, marginBottom: "12px" }} value={form.dotsTrackingId} placeholder="e.g. 2026-0234" onChange={(e) => setForm((f) => ({ ...f, dotsTrackingId: e.target.value }))} />

        {adminMode && (
          <>
            <label style={S.label}>Assigned To</label>
            <select style={{ ...S.input, marginBottom: "12px" }} value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {members.map((m) => <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName}</option>)}
            </select>
          </>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
          <button style={S.btn(false)} onClick={onClose}>Cancel</button>
          <button style={S.btn(true)} onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Document"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Documents — main page component
// ═══════════════════════════════════════════════════════════════════════════════
const BLANK_FORM = {
  projectId: "", subjectType: "AS-STAKED PLAN", subjectNum: 1,
  rpdmRef: "", status: "PRECOMPILING", dotsDate: "", dotsTrackingId: "", assignedTo: "",
};

export default function Documents() {
  const { userProfile }            = useAuth();
  const { isAdmin, team, members } = useTeam();
  const location                   = useLocation();

  const [documents,    setDocuments]    = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [statuses,     setStatuses]     = useState(DEFAULT_STATUSES);
  const [subjectTypes, setSubjectTypes] = useState(DEFAULT_SUBJECT_TYPES);
  const [expanded,     setExpanded]     = useState({});
  const [showForm,     setShowForm]     = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProj,   setFilterProj]   = useState("All");
  const [form,         setForm]         = useState(BLANK_FORM);

  const pendingScrollId = useRef(null);

  useEffect(() => {
    const id = location.state?.highlightDocId;
    if (id) pendingScrollId.current = id;
  }, []);

  useEffect(() => {
    if (team?.documentStatuses?.length)     setStatuses(team.documentStatuses);
    if (team?.documentSubjectTypes?.length) setSubjectTypes(team.documentSubjectTypes);
  }, [team]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(collection(db, "papers"), where("teamId", "==", userProfile.teamId));
    return onSnapshot(q, (snap) => setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = collection(db, "teams", userProfile.teamId, "projects");
    return onSnapshot(q, (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [userProfile?.teamId]);

  useEffect(() => {
    const targetId = pendingScrollId.current;
    if (!targetId || documents.length === 0) return;
    setExpanded((prev) => ({ ...prev, [targetId]: true }));
    setTimeout(() => {
      const el = document.getElementById(`doc-row-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "background 0.3s";
        el.style.background = "var(--accent-bg)";
        setTimeout(() => { el.style.background = "var(--bg-secondary)"; }, 1200);
      }
    }, 100);
    pendingScrollId.current = null;
  }, [documents]);

  const getStage  = (s) => { const i = statuses.indexOf(s); return i === -1 ? "—" : `${i + 1}/${statuses.length}`; };
  const toggleRow = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  function modifierFields() {
    return {
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: userProfile.displayName || userProfile.email || "Unknown",
    };
  }

  async function saveDocument() {
    const { projectId, subjectType, subjectNum, rpdmRef, status } = form;
    if (!projectId) { alert("Please select a project."); return; }
    const subject      = composeLabel(subjectType, subjectNum, rpdmRef);
    const defaultItems = (DEFAULT_LACKING_ITEMS[subjectType] || []).map((label, i) => ({ id: `default_${i}`, label, checked: false }));
    const dotsDetails  = form.dotsDate ? { "FOR_DoTS": { date: form.dotsDate, refNumber: "" } } : {};
    await addDoc(collection(db, "papers"), {
      teamId: userProfile.teamId, projectId, subject, subjectType, status,
      dotsDate: form.dotsDate || null, dotsTrackingId: form.dotsTrackingId || null,
      assignedTo: form.assignedTo || null,
      statusDetails: { LACKING: { items: defaultItems, customItems: [] }, ...dotsDetails },
      createdAt: serverTimestamp(),
      createdBy: userProfile.displayName || userProfile.email || "Unknown",
      lastModifiedAt: serverTimestamp(),
      lastModifiedBy: userProfile.displayName || userProfile.email || "Unknown",
      activityLog: [{ text: `Document created by ${userProfile.displayName}`, by: userProfile.displayName, at: new Date().toISOString() }],
    });
    setShowForm(false);
    setForm(BLANK_FORM);
  }

  async function handleStatusChange(docId, newStatus, docDisplayName) {
    const logText = newStatus === "ARCHIVED"
      ? `Document archived by ${userProfile.displayName}`
      : `Status updated to "${newStatus}"`;

    const extraFields = newStatus === "ARCHIVED" ? {
      archivedAt: serverTimestamp(),
      archivedBy: userProfile.displayName || userProfile.email || "Unknown",
    } : {};

    await updateDoc(doc(db, "papers", docId), {
      status: newStatus,
      ...modifierFields(),
      ...extraFields,
      activityLog: arrayUnion({ text: logText, by: userProfile.displayName, at: new Date().toISOString() }),
    });
  }

  async function handleSaveDetails(docId, statusLabel, details) {
    const key = toKey(statusLabel);

    // If saving ARCHIVED details and admin changed the date, persist archivedAt
    const extraFields = (statusLabel === "ARCHIVED" && details.archivedDate)
      ? { archivedAt: new Date(details.archivedDate + "T00:00:00") }
      : {};

    await updateDoc(doc(db, "papers", docId), {
      [`statusDetails.${key}`]: details,
      ...extraFields,
      ...modifierFields(),
      activityLog: arrayUnion({ text: `Details updated for "${statusLabel}"`, by: userProfile.displayName, at: new Date().toISOString() }),
    });
  }

  async function handleToggleLacking(docId, itemId, isCustom, currentDoc) {
    const field    = isCustom ? "customItems" : "items";
    const existing = currentDoc.statusDetails?.LACKING || { items: [], customItems: [] };
    const updated  = { ...existing, [field]: existing[field].map((it) => it.id === itemId ? { ...it, checked: !it.checked } : it) };
    await updateDoc(doc(db, "papers", docId), {
      "statusDetails.LACKING": updated,
      ...modifierFields(),
    });
  }

  async function handleRemoveLackingItem(docId, itemId, isCustom, currentDoc) {
    const field    = isCustom ? "customItems" : "items";
    const existing = currentDoc.statusDetails?.LACKING || { items: [], customItems: [] };
    const updated  = { ...existing, [field]: existing[field].filter((it) => it.id !== itemId) };
    await updateDoc(doc(db, "papers", docId), {
      "statusDetails.LACKING": updated,
      ...modifierFields(),
    });
  }

  async function handleClearCompleted(docId, currentDoc) {
    const existing = currentDoc.statusDetails?.LACKING || { items: [], customItems: [] };
    const updated  = {
      items:       existing.items.filter((it) => !it.checked),
      customItems: existing.customItems.filter((it) => !it.checked),
    };
    await updateDoc(doc(db, "papers", docId), {
      "statusDetails.LACKING": updated,
      ...modifierFields(),
    });
  }

  async function handleAddCustomItem(docId, label, currentDoc) {
    const existing = currentDoc.statusDetails?.LACKING || { items: [], customItems: [] };
    const updated  = { ...existing, customItems: [...(existing.customItems || []), { id: `custom_${Date.now()}`, label, checked: false }] };
    await updateDoc(doc(db, "papers", docId), {
      "statusDetails.LACKING": updated,
      ...modifierFields(),
    });
  }

  async function handleAssignMember(docId, uid) {
    await updateDoc(doc(db, "papers", docId), {
      assignedTo: uid || null,
      ...modifierFields(),
      activityLog: arrayUnion({ text: uid ? `Assigned to ${members.find((m) => (m.uid || m.id) === uid)?.displayName || uid}` : "Unassigned", by: userProfile.displayName, at: new Date().toISOString() }),
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    await deleteDoc(doc(db, "papers", id));
    setExpanded((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  // Filter out ARCHIVED docs from the Documents tab
  const filtered = documents.filter(
    (d) => d.projectId &&
      d.status !== "ARCHIVED" &&
      (filterStatus === "All" || d.status === filterStatus) &&
      (filterProj   === "All" || d.projectId === filterProj)
  );

  // Statuses shown in the filter dropdown (exclude ARCHIVED)
  const filterableStatuses = statuses.filter((st) => st !== "ARCHIVED");

  const admin = isAdmin();

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.pageTitle}>Documents</div>
        <button style={S.btn(true)} onClick={() => setShowForm(true)}>+ Add Document</button>
      </div>

      <div style={S.filters}>
        <select style={S.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {filterableStatuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
        <select style={S.select} value={filterProj} onChange={(e) => setFilterProj(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.projectId || p.name || p.id}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Project ID</th>
              <th style={S.th}>Subject</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Stage</th>
              <th style={{ ...S.th, textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: "var(--text-disabled)", padding: "40px" }}>No documents found.</td></tr>
            )}
            {filtered.map((d) => {
              const project = projects.find((p) => p.id === d.projectId);
              const isOpen  = !!expanded[d.id];
              return (
                <React.Fragment key={d.id}>
                  <tr
                    id={`doc-row-${d.id}`}
                    style={{ background: isOpen ? "var(--bg-secondary)" : "transparent" }}
                    onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ ...S.td, fontWeight: "600", color: "var(--primary)" }}>{project?.projectId || d.projectId || "—"}</td>
                    <td style={S.td}>
                      <div>{d.subject}</div>
                      {d.dotsDate && (
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                          DoTS: {new Date(d.dotsDate + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </td>
                    <td style={S.td}><span style={S.pill(d.status)}>{d.status}</span></td>
                    <td style={S.td}><span style={S.stageBadge}>{getStage(d.status)}</span></td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <button style={S.smBtn(isOpen)} onClick={() => toggleRow(d.id)}>{isOpen ? "Hide Details" : "Show Details"}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={S.detCell}>
                        <DetailsPanel
                          document={d}
                          statuses={statuses}
                          members={members}
                          adminMode={admin}
                          onStatusChange={(newSt)           => handleStatusChange(d.id, newSt, d.subject)}
                          onSaveDetails={(st, data)         => handleSaveDetails(d.id, st, data)}
                          onToggleLacking={(id, custom)     => handleToggleLacking(d.id, id, custom, d)}
                          onRemoveLackingItem={(id, custom) => handleRemoveLackingItem(d.id, id, custom, d)}
                          onClearCompleted={()              => handleClearCompleted(d.id, d)}
                          onAddCustomItem={(label)          => handleAddCustomItem(d.id, label, d)}
                          onAssignMember={(uid)             => handleAssignMember(d.id, uid)}
                          onDelete={()                      => handleDelete(d.id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <AddDocumentModal
          form={form} setForm={setForm} projects={projects} statuses={statuses}
          subjectTypes={subjectTypes} members={members} adminMode={admin}
          onSave={saveDocument}
          onClose={() => { setShowForm(false); setForm(BLANK_FORM); }}
        />
      )}
    </div>
  );
}