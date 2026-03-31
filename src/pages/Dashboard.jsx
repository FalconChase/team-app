import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import { DEFAULT_STATUSES } from "./Documents";
import { useReactToPrint } from "react-to-print";

// ─── Default thresholds ───────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = [
  { id: "t1", days: 10, color: "#d97706", label: "At Risk"  },
  { id: "t2", days: 15, color: "#c0392b", label: "Stagnant" },
];

// ─── Status pill colours ──────────────────────────────────────────────────────
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
};
const getClr = (st) => STATUS_COLORS[st] || ["#eee", "#555"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toKey = (str) => str.replace(/\s+/g, "_");

function daysSinceDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function projectIdColor(doc, thresholds) {
  const { status, dotsDate } = doc;
  const sorted = [...(thresholds || DEFAULT_THRESHOLDS)].sort(
    (a, b) => Number(b.days) - Number(a.days)
  );
  if (status === "PRECOMPILING" || status === "FOR DoTS") return "#1a8a3a";
  if (status === "APPROVED") return "var(--primary)";
  if (!dotsDate) return "var(--primary)";
  const days = daysSinceDate(dotsDate);
  if (days === null) return "var(--primary)";
  for (const t of sorted) {
    if (days >= Number(t.days)) return t.color;
  }
  return "var(--primary)";
}

function stageToPercent(status, statuses) {
  const idx = statuses.indexOf(status);
  if (idx === -1 || statuses.length === 0) return null;
  return Math.round(((idx + 1) / statuses.length) * 100);
}

// ─── SURGICAL ADD: returns only the visible stages for a given subject type ──
function getVisibleStatuses(subjectType, allStatuses, config) {
  const typeConfig = config?.[subjectType];
  if (!typeConfig?.visibleStatuses?.length) return allStatuses;
  return allStatuses.filter((s) => typeConfig.visibleStatuses.includes(s));
}

function progressBarColor(pct) {
  if (pct >= 90) return "var(--success)";
  if (pct >= 60) return "var(--info)";
  if (pct >= 30) return "var(--warning)";
  return "var(--text-muted)";
}

function getTooltipContent(d) {
  const { status, statusDetails } = d;
  if (!statusDetails) return null;
  if (status === "LACKING") {
    const lacking = statusDetails.LACKING || {};
    const allItems = [...(lacking.items || []), ...(lacking.customItems || [])];
    const unchecked = allItems.filter((it) => !it.checked);
    if (unchecked.length === 0) return null;
    return { type: "lacking", items: unchecked };
  }
  if (status === "FOR APPROVAL") {
    const data = statusDetails.FOR_APPROVAL || {};
    if (data.department || data.dateReceived)
      return { type: "approval", department: data.department, dateReceived: data.dateReceived };
    return null;
  }
  if (status === "FOR DoTS") {
    const data = statusDetails.FOR_DoTS || {};
    if (data.refNumber || data.date)
      return { type: "dots", refNumber: data.refNumber, date: data.date };
    return null;
  }
  const key   = toKey(status);
  const notes = statusDetails[key]?.notes;
  if (notes && notes.trim()) return { type: "notes", notes };
  return null;
}

function getRemarksText(doc) {
  const content = getTooltipContent(doc);
  if (!content) return null;
  if (content.type === "lacking")
    return "Lacking: " + content.items.map((i) => i.label).join(", ");
  if (content.type === "approval") {
    const parts = [];
    if (content.department) parts.push(`Dept: ${content.department}`);
    if (content.dateReceived) {
      const fmt = new Date(content.dateReceived + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      parts.push(`Received: ${fmt}`);
    }
    return parts.join("  |  ") || null;
  }
  if (content.type === "dots") {
    const parts = [];
    if (content.refNumber) parts.push(`Ref No.: ${content.refNumber}`);
    if (content.date) {
      const fmt = new Date(content.date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      parts.push(`Date: ${fmt}`);
    }
    return parts.join("  |  ") || null;
  }
  if (content.type === "notes") return content.notes;
  return null;
}

// ─── Smart relative timestamp label ──────────────────────────────────────────
function getActivityLabel(d) {
  const modTs  = d.lastModifiedAt?.toDate?.() || null;
  const crtTs  = d.createdAt?.toDate?.()      || null;
  const legTs  = d.lastUpdatedAt?.toDate?.()  || null;

  const effectiveTs = modTs || legTs || crtTs;
  if (!effectiveTs) return null;

  const by     = d.lastModifiedBy || null;
  const crtBy  = d.createdBy      || null;

  let isNew = false;
  if (!by && crtBy) {
    isNew = true;
  } else if (by && crtBy && by === crtBy && modTs && crtTs) {
    const diffMs = Math.abs(modTs.getTime() - crtTs.getTime());
    isNew = diffMs < 10000;
  }

  const now      = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const tsStr    = effectiveTs.toDateString();

  const actor = by || crtBy || null;

  let timeLabel;
  if (tsStr === todayStr) {
    const time = effectiveTs.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    timeLabel = `today at ${time}`;
  } else if (tsStr === yesterdayStr) {
    timeLabel = "yesterday";
  } else {
    timeLabel = effectiveTs.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  }

  const verb = isNew ? "Added" : "Updated";
  const label = actor ? `${verb} ${timeLabel} by ${actor}` : `${verb} ${timeLabel}`;

  return { label, isNew, ts: effectiveTs };
}

// ─── Status Hover Card — fully theme-aware ────────────────────────────────────
function StatusHoverCard({ content, onUpdateStatus, onMouseEnter, onMouseLeave }) {
  const [btnHover, setBtnHover] = useState(false);

  const wrap = {
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    borderRadius: "8px",
    padding: "10px 13px",
    fontSize: "11px",
    maxWidth: "240px",
    minWidth: "170px",
    boxShadow: "var(--shadow-lg)",
    lineHeight: "1.5",
    border: "1px solid var(--border-main)",
    cursor: "default",
  };
  const lbl = {
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
    marginBottom: "6px",
    display: "block",
  };
  const row  = { display: "flex", gap: "6px", marginBottom: "4px", alignItems: "baseline" };
  const rlbl = { color: "var(--text-secondary)", fontSize: "10px", flexShrink: 0 };
  const rval = { color: "var(--text-primary)" };
  const dot  = {
    width: "5px", height: "5px", borderRadius: "50%",
    background: "var(--danger)", marginTop: "5px", flexShrink: 0,
  };
  const divider = {
    borderTop: "1px solid var(--border-light)",
    margin: "8px 0",
  };
  const btn = {
    width: "100%",
    padding: "6px 0",
    borderRadius: "5px",
    border: "1px solid var(--border-input)",
    background: btnHover ? "var(--primary)" : "var(--bg-secondary)",
    color: btnHover ? "#fff" : "var(--text-secondary)",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
    transition: "background 0.15s, color 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  };

  const renderRemarks = () => {
    if (!content) return null;
    if (content.type === "lacking")
      return (
        <>
          <span style={lbl}>⚠ Lacking Attachments</span>
          {content.items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "4px" }}>
              <span style={dot} /><span>{it.label}</span>
            </div>
          ))}
        </>
      );
    if (content.type === "approval")
      return (
        <>
          <span style={lbl}>📋 For Approval Details</span>
          {content.department   && <div style={row}><span style={rlbl}>Dept:</span><span style={rval}>{content.department}</span></div>}
          {content.dateReceived && <div style={row}><span style={rlbl}>Received:</span><span style={rval}>{new Date(content.dateReceived + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span></div>}
        </>
      );
    if (content.type === "dots")
      return (
        <>
          <span style={lbl}>📌 DoTS Details</span>
          {content.refNumber && <div style={row}><span style={rlbl}>Ref No.:</span><span style={rval}>{content.refNumber}</span></div>}
          {content.date      && <div style={row}><span style={rlbl}>Date:</span><span style={rval}>{new Date(content.date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span></div>}
        </>
      );
    if (content.type === "notes")
      return (<><span style={lbl}>📝 Remarks</span><span>{content.notes}</span></>);
    return null;
  };

  return (
    <div style={wrap} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {content && (<>{renderRemarks()}<div style={divider} /></>)}
      {!content && (
        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "8px" }}>
          No remarks on file.
        </div>
      )}
      <button
        style={btn}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        onClick={(e) => { e.stopPropagation(); onUpdateStatus(); }}
      >
        ✏️ Update Status
      </button>
    </div>
  );
}

// ─── Inject reminder drain keyframe once ─────────────────────────────────────
function ensureReminderDrainStyle() {
  const id = "reminder-drain-keyframes";
  if (!document.getElementById(id)) {
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `@keyframes reminderDrain { from { width: 100%; } to { width: 0%; } }`;
    document.head.appendChild(el);
  }
}

// ─── ReminderItem ─────────────────────────────────────────────────────────────
const REMINDER_COUNTDOWN_MS = 10000;

function ReminderItem({ item, onToggle, onDelete }) {
  const [pending,  setPending]  = useState(false);
  const timerRef               = useRef(null);
  const startKey               = useRef(0);

  useEffect(() => {
    if (!item.done && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setPending(false);
    }
  }, [item.done]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleCheck() {
    if (!item.done) {
      onToggle(item);
      startKey.current += 1;
      setPending(true);
      timerRef.current = setTimeout(() => {
        onDelete(item.id);
        timerRef.current = null;
        setPending(false);
      }, REMINDER_COUNTDOWN_MS);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setPending(false);
      }
      onToggle(item);
    }
  }

  return (
    <div style={{ marginBottom: "2px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: "0.5px solid var(--border-light)" }}>
        <div
          onClick={handleCheck}
          style={{
            width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, cursor: "pointer",
            border: item.done ? "2px solid var(--primary)" : "2px solid var(--border-input)",
            background: item.done ? "var(--primary)" : "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (!item.done) e.currentTarget.style.borderColor = "var(--primary)"; }}
          onMouseLeave={(e) => { if (!item.done) e.currentTarget.style.borderColor = "var(--border-input)"; }}
        >
          {item.done && <span style={{ color: "#fff", fontSize: "9px", fontWeight: "700" }}>✓</span>}
        </div>

        <span style={{ flex: 1, fontSize: "12px", color: item.done ? "var(--text-disabled)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", lineHeight: "1.4" }}>
          {item.text}
        </span>

        {pending && (
          <span style={{ fontSize: "10px", color: "var(--warning)", fontStyle: "italic", flexShrink: 0 }}>
            removing…
          </span>
        )}

        <button
          onClick={() => onDelete(item.id)}
          title="Delete"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--border-input)", fontSize: "14px", padding: "0 2px", lineHeight: 1, transition: "color 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--border-input)"}
        >
          ×
        </button>
      </div>

      {pending && (
        <div style={{ height: "2px", background: "var(--border-light)", borderRadius: "1px", marginLeft: "26px", marginTop: "-1px", marginBottom: "3px", overflow: "hidden" }}>
          <div
            key={startKey.current}
            style={{ height: "100%", background: "var(--warning)", borderRadius: "1px", animation: `reminderDrain ${REMINDER_COUNTDOWN_MS}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── PersonalReminders ────────────────────────────────────────────────────────
function PersonalReminders({ uid }) {
  const [items,     setItems]     = useState([]);
  const [inputText, setInputText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { ensureReminderDrainStyle(); }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "reminders"), where("uid", "==", uid), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const handleAdd = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    await addDoc(collection(db, "reminders"), { uid, text, done: false, createdAt: serverTimestamp() });
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleAdd(); };

  const handleToggle = async (item) => {
    await updateDoc(doc(db, "reminders", item.id), { done: !item.done });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "reminders", id));
  };

  const handleClearCompleted = async () => {
    await Promise.all(done.map((item) => deleteDoc(doc(db, "reminders", item.id))));
  };

  const pending = items.filter((i) => !i.done);
  const done    = items.filter((i) =>  i.done);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1.5px solid var(--border-main)",
      borderRadius: "12px",
      marginBottom: "24px",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
      transition: "all 0.2s ease",
    }}
      className="reminder-card"
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1.5px solid var(--border-light)",
          background: "linear-gradient(135deg, var(--primary-light) 0%, var(--bg-card) 100%)",
          userSelect: "none",
          transition: "background 0.2s ease",
        }}
        onMouseEnter={(e) => !collapsed && (e.currentTarget.style.background = "linear-gradient(135deg, var(--primary-light) 0%, var(--bg-hover) 100%)")}
        onMouseLeave={(e) => !collapsed && (e.currentTarget.style.background = "linear-gradient(135deg, var(--primary-light) 0%, var(--bg-card) 100%)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px", lineHeight: 1 }}>📋</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary)", letterSpacing: "0.3px" }}>
              MY REMINDERS
            </div>
            {pending.length > 0 && (
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px", fontWeight: "500" }}>
                {pending.length} pending task{pending.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {pending.length > 0 && (
            <span style={{
              fontSize: "11px",
              fontWeight: "700",
              background: "var(--primary)",
              color: "#fff",
              borderRadius: "12px",
              padding: "3px 10px",
              lineHeight: "1.6",
              boxShadow: "var(--shadow-sm)",
            }}>
              {pending.length}
            </span>
          )}
          <span style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            transition: "transform 0.2s",
            display: "inline-block",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}>▼</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Add a reminder or task…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                fontSize: "13px",
                padding: "10px 14px",
                border: "1.5px solid var(--border-input)",
                borderRadius: "8px",
                fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
                color: "var(--text-primary)",
                background: "var(--bg-input)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-input)"}
            />
            <button
              onClick={handleAdd}
              disabled={!inputText.trim()}
              style={{
                fontSize: "13px",
                padding: "10px 18px",
                borderRadius: "8px",
                border: "none",
                cursor: inputText.trim() ? "pointer" : "not-allowed",
                background: inputText.trim() ? "var(--primary)" : "var(--bg-secondary)",
                color: inputText.trim() ? "#fff" : "var(--text-disabled)",
                fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
                fontWeight: "600",
                transition: "all 0.15s",
                boxShadow: inputText.trim() ? "var(--shadow-sm)" : "none",
              }}
              onMouseEnter={(e) => inputText.trim() && (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => inputText.trim() && (e.currentTarget.style.opacity = "1")}
            >
              + Add
            </button>
          </div>

          {loading && <div style={{ fontSize: "12px", color: "var(--text-disabled)", textAlign: "center", padding: "10px 0" }}>Loading…</div>}

          {!loading && items.length === 0 && (
            <div style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: "24px 12px",
              fontStyle: "italic",
              background: "var(--bg-secondary)",
              borderRadius: "8px",
              border: "1px dashed var(--border-main)",
            }}>
              ✨ No reminders yet. Add something you need to do today.
            </div>
          )}

          {pending.length > 0 && (
            <div style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              marginBottom: "10px",
              fontStyle: "italic",
              padding: "8px 12px",
              background: "var(--info-bg)",
              borderRadius: "6px",
              border: "1px solid var(--border-light)",
            }}>
              💡 Check an item to mark it done — it removes itself after 10 seconds. Uncheck to cancel.
            </div>
          )}

          {pending.map((item) => (
            <ReminderItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
          ))}

          {done.length > 0 && (
            <details style={{ marginTop: "12px" }}>
              <summary style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                listStyle: "none",
                userSelect: "none",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--bg-secondary)",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
              }}>
                <span style={{ fontWeight: "600" }}>✓ {done.length} completed</span>
                <span
                  onClick={(e) => { e.preventDefault(); handleClearCompleted(); }}
                  style={{
                    fontSize: "10px",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontWeight: "600",
                    padding: "4px 10px",
                    borderRadius: "5px",
                    border: "1px solid var(--danger)",
                    background: "var(--bg-card)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--danger)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-card)";
                    e.currentTarget.style.color = "var(--danger)";
                  }}
                >
                  Clear all
                </span>
              </summary>
              <div style={{ marginTop: "8px" }}>
                {done.map((item) => (
                  <ReminderItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Print Modal ──────────────────────────────────────────────────────────────
function PrintModal({ onClose, onBrowserPrint, onExportPDF, includeRemarks, setIncludeRemarks, includeLastUpdated, setIncludeLastUpdated, filteredCount, isExporting }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(10,24,40,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg-card)", borderRadius: "14px", padding: "28px 28px 22px", width: "360px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-main)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>🖨️ Print / Export</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", color: "var(--text-disabled)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "22px" }}>
          Printing <strong style={{ color: "var(--text-primary)" }}>{filteredCount}</strong> document{filteredCount !== 1 ? "s" : ""} based on your current filters and sort.
        </div>

        <div
          onClick={() => setIncludeRemarks(!includeRemarks)}
          style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", borderRadius: "10px", cursor: "pointer", border: `1.5px solid ${includeRemarks ? "var(--primary)" : "var(--border-main)"}`, background: includeRemarks ? "var(--primary-light)" : "var(--bg-hover)", marginBottom: "10px", transition: "all 0.15s ease" }}
        >
          <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", border: `2px solid ${includeRemarks ? "var(--primary)" : "var(--border-input)"}`, background: includeRemarks ? "var(--primary)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
            {includeRemarks && <span style={{ color: "#fff", fontSize: "11px", fontWeight: "700" }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Include Remarks</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px", lineHeight: "1.4" }}>Prints each document as a card with Project ID, Status, Subject, and all remarks/notes.</div>
          </div>
        </div>

        <div
          onClick={() => setIncludeLastUpdated(!includeLastUpdated)}
          style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", borderRadius: "10px", cursor: "pointer", border: `1.5px solid ${includeLastUpdated ? "var(--primary)" : "var(--border-main)"}`, background: includeLastUpdated ? "var(--primary-light)" : "var(--bg-hover)", marginBottom: "20px", transition: "all 0.15s ease" }}
        >
          <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", border: `2px solid ${includeLastUpdated ? "var(--primary)" : "var(--border-input)"}`, background: includeLastUpdated ? "var(--primary)" : "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
            {includeLastUpdated && <span style={{ color: "#fff", fontSize: "11px", fontWeight: "700" }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Show Last Updated By</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px", lineHeight: "1.4" }}>Includes who last updated each document and when.</div>
          </div>
        </div>

        {includeRemarks && (
          <div style={{ background: "var(--info-bg)", border: "1px dashed var(--border-main)", borderRadius: "8px", padding: "10px 12px", marginBottom: "18px", fontSize: "11px", color: "var(--text-secondary)" }}>
            <div style={{ fontWeight: "700", marginBottom: "4px", color: "var(--text-primary)" }}>Preview format per document:</div>
            <div>📌 <strong>Project ID:</strong> 25N00158</div>
            <div>📋 <strong>Status:</strong> PRECOMPILING</div>
            <div>📄 <strong>Subject:</strong> 6th RPDM due to CTE#5</div>
            <div>📝 <strong>Remarks:</strong> (all notes / lacking items / details)</div>
            {includeLastUpdated && <div>🕒 <strong>Last Updated:</strong> Updated today at 2:30 PM by Juan</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onBrowserPrint} style={{ padding: "11px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
            🖨️ Print (Browser / Ctrl+P)
          </button>
          <button onClick={onExportPDF} disabled={isExporting} style={{ padding: "11px", borderRadius: "8px", border: "1.5px solid var(--primary)", background: "var(--bg-card)", color: "var(--primary)", fontSize: "13px", fontWeight: "600", cursor: isExporting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", opacity: isExporting ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.background = "var(--primary-light)"; }} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}>
            {isExporting ? "⏳ Generating PDF…" : "📄 Export as PDF"}
          </button>
          <button onClick={onClose} style={{ padding: "8px", borderRadius: "8px", border: "none", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { userProfile }   = useAuth();
  const { team, members } = useTeam();
  const navigate          = useNavigate();

  const [documents,   setDocuments]   = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [statuses,    setStatuses]    = useState(DEFAULT_STATUSES);
  const [thresholds,  setThresholds]  = useState(DEFAULT_THRESHOLDS);
  // SURGICAL ADD: stage visibility config per subject type
  const [stageConfig, setStageConfig] = useState({});

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProj,   setFilterProj]   = useState("All");
  const [filterMember, setFilterMember] = useState("All");
  const [sortOrder,    setSortOrder]    = useState("none");

  const [tooltip,            setTooltip]           = useState(null);
  const [showPrintModal,     setShowPrintModal]    = useState(false);
  const [includeRemarks,     setIncludeRemarks]    = useState(false);
  const [includeLastUpdated, setIncludeLastUpdated] = useState(false);
  const [isExporting,        setIsExporting]       = useState(false);

  const hideTimerRef = useRef(null);
  const printRef     = useRef(null);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const loadTheme = async () => {
      const themeDoc = await getDoc(doc(db, "appSettings", userProfile.teamId));
      if (themeDoc.exists()) {
        const theme = themeDoc.data()?.theme || "default";
        document.documentElement.setAttribute("data-theme", theme);
      }
    };
    loadTheme();
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!team) return;
    if (team.documentStatuses?.length)    setStatuses(team.documentStatuses);
    if (team.dashboardThresholds?.length) setThresholds(team.dashboardThresholds);
    // SURGICAL ADD: load stage visibility config
    if (team.subjectTypeStageConfig)      setStageConfig(team.subjectTypeStageConfig);
  }, [team]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(collection(db, "papers"), where("teamId", "==", userProfile.teamId));
    return onSnapshot(q, (snap) =>
      setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((d) => !!d.projectId))
    );
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = collection(db, "teams", userProfile.teamId, "projects");
    return onSnapshot(q, (snap) => setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [userProfile?.teamId]);

  const total    = documents.length;
  const approved = documents.filter((d) => d.status === "APPROVED").length;
  const lacking  = documents.filter((d) => d.status === "LACKING").length;
  const inProg   = total - approved;

  const assignedMemberIds = [...new Set(documents.map((d) => d.assignedTo).filter(Boolean))];
  const assignedMembers   = (members || []).filter((m) => assignedMemberIds.includes(m.uid || m.id));

  const filtered = documents
    .filter((d) =>
      (filterStatus === "All" || d.status    === filterStatus) &&
      (filterMember === "All" || d.assignedTo === filterMember)
    )
    .filter((d) => filterProj === "All" || d.projectId === filterProj)
    .sort((a, b) => {
      if (sortOrder === "asc" || sortOrder === "desc") {
        const pA = projects.find((p) => p.id === a.projectId);
        const pB = projects.find((p) => p.id === b.projectId);
        const lA = (pA?.projectId || a.projectId || "").toUpperCase();
        const lB = (pB?.projectId || b.projectId || "").toUpperCase();
        const c  = lA.localeCompare(lB, undefined, { numeric: true, sensitivity: "base" });
        return sortOrder === "asc" ? c : -c;
      }
      const tsA = a.lastModifiedAt?.toMillis?.() || a.lastUpdatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const tsB = b.lastModifiedAt?.toMillis?.() || b.lastUpdatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return tsB - tsA;
    });

  const sortedThresholds = [...thresholds].sort((a, b) => Number(a.days) - Number(b.days));

  const handleStatusMouseEnter = useCallback((e, d) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const content = getTooltipContent(d);
    const rect    = e.currentTarget.getBoundingClientRect();
    setTooltip({ content, docId: d.id, x: Math.min(rect.left, window.innerWidth - 260), y: rect.top - 8 });
  }, []);

  const handleStatusMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setTooltip(null), 120);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const handleCardMouseLeave = useCallback(() => { setTooltip(null); }, []);

  const handleUpdateStatus = useCallback((docId) => {
    setTooltip(null);
    navigate("/documents", { state: { highlightDocId: docId } });
  }, [navigate]);

  const handleBrowserPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `DOCUMENT STATUS REPORT — ${new Date().toLocaleDateString("en-PH")}`,
    pageStyle: `@page { size: A4 portrait; margin: 12mm 14mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } [data-pdf-card] { page-break-inside: avoid !important; break-inside: avoid !important; }`,
    onAfterPrint: () => setShowPrintModal(false),
  });

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF }   = await import("jspdf");
      const A4_W = 210, A4_H = 297, MAR = 14, SCALE = 2, USE_W = A4_W - MAR * 2;
      const pdf  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let curY   = MAR;
      const addElement = async (el, gapAfter = 4) => {
        if (!el) return;
        const canvas = await html2canvas(el, { scale: SCALE, useCORS: true, backgroundColor: "#ffffff" });
        const elH    = (canvas.height / canvas.width) * USE_W;
        if (curY + elH > A4_H - MAR) { pdf.addPage(); curY = MAR; }
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", MAR, curY, USE_W, elH);
        curY += elH + gapAfter;
      };
      await addElement(printRef.current.querySelector("[data-pdf-header]"), 2);
      await addElement(printRef.current.querySelector("[data-pdf-label]"), 3);
      const cards = printRef.current.querySelectorAll("[data-pdf-card]");
      for (const card of cards) await addElement(card, 3);
      const tableEl = printRef.current.querySelector("[data-pdf-table]");
      if (tableEl) {
        const canvas  = await html2canvas(tableEl, { scale: SCALE, useCORS: true, backgroundColor: "#ffffff" });
        const totalH  = (canvas.height / canvas.width) * USE_W;
        const pxPerMM = canvas.width / USE_W;
        if (curY + totalH <= A4_H - MAR) {
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", MAR, curY, USE_W, totalH);
          curY += totalH;
        } else {
          let srcY = 0, firstPage = true;
          while (srcY < canvas.height) {
            const avail   = firstPage ? (A4_H - MAR - curY) : (A4_H - MAR * 2);
            const slicePx = Math.min(avail * pxPerMM, canvas.height - srcY);
            const chunk   = document.createElement("canvas");
            chunk.width   = canvas.width; chunk.height = slicePx;
            chunk.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
            const chunkMM = slicePx / pxPerMM;
            if (!firstPage) { pdf.addPage(); curY = MAR; }
            pdf.addImage(chunk.toDataURL("image/png"), "PNG", MAR, curY, USE_W, chunkMM);
            curY += chunkMM; srcY += slicePx; firstPage = false;
          }
        }
      }
      await addElement(printRef.current.querySelector("[data-pdf-footer]"), 0);
      pdf.save(`dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setShowPrintModal(false);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try the browser print option instead.");
    } finally {
      setIsExporting(false);
    }
  };

  const S = {
    page:      { fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", padding: "20px" },
    header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title:     { fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" },
    date:      { fontSize: "12px", color: "var(--text-muted)" },
    statsRow:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" },
    stat:      { background: "var(--bg-card)", border: "0.5px solid var(--border-main)", borderRadius: "8px", padding: "14px", textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s" },
    statNum:   (c) => ({ fontSize: "26px", fontWeight: "700", color: c || "var(--text-primary)" }),
    statLbl:   { fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" },
    legend:    { display: "flex", gap: "14px", marginBottom: "14px", flexWrap: "wrap", fontSize: "11px", color: "var(--text-secondary)", alignItems: "center" },
    dot:       (c) => ({ width: "8px", height: "8px", borderRadius: "50%", background: c, display: "inline-block", marginRight: "5px", flexShrink: 0 }),
    filters:   { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" },
    select:    { fontSize: "12px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-input)", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", color: "var(--text-primary)" },
    table:     { width: "100%", borderCollapse: "collapse", background: "var(--bg-card)", borderRadius: "8px", overflow: "hidden", border: "0.5px solid var(--border-main)" },
    th:        { padding: "10px 14px", textAlign: "left", fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.6px", background: "var(--bg-hover)", borderBottom: "1px solid var(--border-main)" },
    td:        { padding: "11px 14px", fontSize: "12px", color: "var(--text-primary)", borderBottom: "0.5px solid var(--border-light)", verticalAlign: "middle" },
    pill:      (st) => { const [bg, c] = getClr(st); return { display: "inline-block", fontSize: "10px", padding: "3px 9px", borderRadius: "10px", background: bg, color: c, fontWeight: "500", whiteSpace: "nowrap", cursor: "default" }; },
    sortBtn:   (active) => ({ fontSize: "12px", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", border: active ? "1.5px solid var(--primary)" : "1px solid var(--border-input)", background: active ? "var(--primary)" : "var(--bg-card)", color: active ? "#fff" : "var(--text-primary)", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s ease" }),
    sortGroup: { display: "flex", gap: "4px", alignItems: "center", background: "var(--bg-hover)", borderRadius: "8px", padding: "3px", border: "1px solid var(--border-main)" },
    sortLbl:   { fontSize: "10px", color: "var(--text-secondary)", fontWeight: "600", letterSpacing: "0.4px", textTransform: "uppercase", marginRight: "2px", paddingLeft: "4px" },
    divider:   { width: "1px", height: "20px", background: "var(--border-main)", margin: "0 2px" },
  };

  const renderCard = (d, i) => {
    const project     = projects.find((p) => p.id === d.projectId);
    const pidLabel    = project?.projectId || d.projectId || "—";
    const pidColor    = projectIdColor(d, thresholds);
    const assigned    = members?.find((m) => (m.uid || m.id) === d.assignedTo);
    const remarksText = getRemarksText(d);
    const activity    = getActivityLabel(d);
    return (
      <div key={d.id} data-pdf-card style={{ marginBottom: "12px", border: "1px solid #d0dde8", borderLeft: `4px solid ${pidColor}`, borderRadius: "6px", padding: "12px 16px", pageBreakInside: "avoid", breakInside: "avoid", background: i % 2 === 0 ? "#fff" : "#fafcfe" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div>
            <div style={{ fontSize: "9px", color: "#8a9ab0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.6px" }}>Project ID</div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: pidColor, marginTop: "1px" }}>{pidLabel}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "#8a9ab0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.6px" }}>Status</div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c", marginTop: "1px" }}>{d.status}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "#8a9ab0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.6px" }}>Subject</div>
            <div style={{ fontSize: "12px", color: "#1a3a5c", marginTop: "1px" }}>{d.subject || "—"}</div>
          </div>
          {assigned && (
            <div>
              <div style={{ fontSize: "9px", color: "#8a9ab0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.6px" }}>Assigned To</div>
              <div style={{ fontSize: "12px", color: "#1a3a5c", marginTop: "1px" }}>{assigned.displayName}</div>
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px dashed #dde6f0", paddingTop: "8px" }}>
          <div style={{ fontSize: "9px", color: "#8a9ab0", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.6px", marginBottom: "3px" }}>Remarks</div>
          {remarksText
            ? <div style={{ fontSize: "12px", color: "#1a3a5c", lineHeight: "1.5" }}>{remarksText}</div>
            : <div style={{ fontSize: "11px", color: "#bbb", fontStyle: "italic" }}>No remarks.</div>}
        </div>
        {includeLastUpdated && activity && (
          <div style={{ marginTop: "8px", fontSize: "10px", color: "#8a9ab0", fontStyle: "italic", borderTop: "1px dashed #dde6f0", paddingTop: "6px" }}>
            🕒 {activity.label}
          </div>
        )}
      </div>
    );
  };

  const dateStrFull = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const activeFilterBadges = [
    filterStatus !== "All" && `Status: ${filterStatus}`,
    filterProj   !== "All" && `Project: ${filterProj}`,
    filterMember !== "All" && `Member: ${filterMember}`,
    sortOrder    !== "none" && `Sorted: ${sortOrder === "asc" ? "A → Z" : "Z → A"}`,
  ].filter(Boolean);

  return (
    <div style={S.page}>

      {tooltip && (
        <div style={{ position: "fixed", left: `${tooltip.x}px`, top: `${tooltip.y - 10}px`, transform: "translateY(-100%)", zIndex: 1000 }}>
          <StatusHoverCard content={tooltip.content} onUpdateStatus={() => handleUpdateStatus(tooltip.docId)} onMouseEnter={handleCardMouseEnter} onMouseLeave={handleCardMouseLeave} />
        </div>
      )}

      {showPrintModal && (
        <PrintModal
          onClose={() => setShowPrintModal(false)}
          onBrowserPrint={handleBrowserPrint}
          onExportPDF={handleExportPDF}
          includeRemarks={includeRemarks}
          setIncludeRemarks={setIncludeRemarks}
          includeLastUpdated={includeLastUpdated}
          setIncludeLastUpdated={setIncludeLastUpdated}
          filteredCount={filtered.length}
          isExporting={isExporting}
        />
      )}

      {/* Hidden printable area — always white for PDF legibility */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, width: "794px" }}>
        <div ref={printRef} style={{ fontFamily: "Tahoma, Geneva, sans-serif", background: "#fff" }}>
          <div data-pdf-header style={{ padding: "28px 32px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2.5px solid #1a3a5c", paddingBottom: "12px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#1a3a5c" }}>DOCUMENT STATUS REPORT</div>
                {team?.name && <div style={{ fontSize: "12px", color: "#5a7a9a", marginTop: "2px" }}>{team.name}</div>}
                {activeFilterBadges.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {activeFilterBadges.map((f, i) => <span key={i} style={{ fontSize: "10px", background: "#e8eef4", color: "#1a3a5c", padding: "2px 7px", borderRadius: "10px", fontWeight: "600" }}>{f}</span>)}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#888" }}>{dateStrFull}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c", marginTop: "4px" }}>{filtered.length} document{filtered.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "22px" }}>
              {[{ label: "Total", val: total, color: "#1a3a5c" }, { label: "In Progress", val: inProg, color: "#2563eb" }, { label: "Lacking", val: lacking, color: "#c0392b" }, { label: "Approved", val: approved, color: "#1a8a3a" }].map(({ label, val, color }) => (
                <div key={label} style={{ border: "1px solid #e0e8f0", borderRadius: "6px", padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "700", color }}>{val}</div>
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div data-pdf-label style={{ padding: "0 32px 8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.8px", textTransform: "uppercase", color: "#8a9ab0" }}>{includeRemarks ? "Document Details with Remarks" : "Document List"}</div>
          </div>
          {includeRemarks ? (
            <div style={{ padding: "0 32px" }}>{filtered.map((d, i) => renderCard(d, i))}</div>
          ) : (
            <div data-pdf-table style={{ padding: "0 32px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr>
                    {["Project ID", "Subject", "Assigned To", "Status", "Progress", ...(includeLastUpdated ? ["Last Updated"] : [])].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #1a3a5c", color: "#1a3a5c", fontWeight: "700", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", background: "#f4f8fc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const project    = projects.find((p) => p.id === d.projectId);
                    const pidLabel   = project?.projectId || d.projectId || "—";
                    const pidColor   = projectIdColor(d, thresholds);
                    const assigned   = members?.find((m) => (m.uid || m.id) === d.assignedTo);
                    // SURGICAL CHANGE: use visible statuses for this subject type
                    const visibleSts = getVisibleStatuses(d.subjectType, statuses, stageConfig);
                    const pct        = stageToPercent(d.status, visibleSts);
                    const activity   = getActivityLabel(d);
                    return (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", fontWeight: "700", color: pidColor, fontSize: "12px" }}>{pidLabel}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", color: "#1a3a5c" }}>{d.subject || "—"}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", color: "#555" }}>{assigned?.displayName || "—"}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", color: "#1a3a5c", fontWeight: "500" }}>{d.status}</td>
                        {/* SURGICAL CHANGE: X/Y now uses visibleSts */}
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", color: "#555" }}>{pct !== null ? `${pct}% (${visibleSts.indexOf(d.status) + 1}/${visibleSts.length})` : "—"}</td>
                        {includeLastUpdated && (
                          <td style={{ padding: "7px 10px", borderBottom: "1px solid #ecf1f7", color: "#777", fontSize: "10px", fontStyle: "italic" }}>
                            {activity ? activity.label : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div data-pdf-footer style={{ padding: "16px 32px 28px" }}>
            <div style={{ borderTop: "1px solid #d0dde8", paddingTop: "8px", fontSize: "10px", color: "#aaa", display: "flex", justifyContent: "space-between" }}>
              <span>Generated from Dashboard</span><span>Printed on {dateStrFull}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Visible Dashboard UI ─────────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.title}>Dashboard</div>
        <div style={S.date}>{dateStrFull}</div>
      </div>

      <div style={S.statsRow}>
        <div style={S.stat} className="stat"><div style={S.statNum("var(--primary)")}>{total}</div><div style={S.statLbl}>Total Documents</div></div>
        <div style={S.stat} className="stat"><div style={S.statNum("var(--info)")}>{inProg}</div><div style={S.statLbl}>In Progress</div></div>
        <div style={S.stat} className="stat"><div style={S.statNum("var(--danger)")}>{lacking}</div><div style={S.statLbl}>Lacking</div></div>
        <div style={S.stat} className="stat"><div style={S.statNum("var(--success)")}>{approved}</div><div style={S.statLbl}>Approved</div></div>
      </div>

      <PersonalReminders uid={userProfile?.uid} />

      <div style={S.legend}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Project ID color:</span>
        <span><span style={S.dot("#1a8a3a")} />Green — PRECOMPILING / FOR DoTS</span>
        {sortedThresholds.map((t) => (
          <span key={t.id || t.days}>
            <span style={S.dot(t.color)} />
            <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
            {" "}— {t.days}+ days since DoTS
          </span>
        ))}
        <span><span style={S.dot("var(--primary)")} />Normal — approved or within threshold</span>
      </div>

      <div style={S.filters}>
        <select style={S.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
        <select style={S.select} value={filterProj} onChange={(e) => setFilterProj(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.projectId || p.id}</option>)}
        </select>
        <select style={S.select} value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
          <option value="All">All Members</option>
          {assignedMembers.map((m) => <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName}</option>)}
        </select>
        <div style={S.sortGroup}>
          <span style={S.sortLbl}>Sort</span>
          <div style={S.divider} />
          <button style={S.sortBtn(sortOrder === "none")}  onClick={() => setSortOrder("none")} title="Sort by most recently updated">🕒</button>
          <button style={S.sortBtn(sortOrder === "asc")}   onClick={() => setSortOrder(sortOrder === "asc"  ? "none" : "asc")}>A→Z</button>
          <button style={S.sortBtn(sortOrder === "desc")}  onClick={() => setSortOrder(sortOrder === "desc" ? "none" : "desc")}>Z→A</button>
        </div>
        <div style={S.divider} />
        <button onClick={() => setShowPrintModal(true)} style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", border: "1px solid var(--primary)", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", gap: "5px", fontWeight: "600", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
          🖨️ Print
        </button>
      </div>

      {sortOrder === "none" && (
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", fontStyle: "italic" }}>
          🕒 Sorted by most recently updated — documents with recent changes appear first.
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Project ID</th>
              <th style={S.th}>Subject</th>
              <th style={S.th}>
                Status
                <span title="Hover over a status pill to see details and quick actions" style={{ marginLeft: "5px", fontSize: "10px", color: "var(--text-secondary)", cursor: "help" }}>ⓘ</span>
              </th>
              <th style={{ ...S.th, minWidth: "160px" }}>Document Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...S.td, textAlign: "center", color: "var(--text-disabled)", padding: "40px" }}>
                {total === 0 ? "No documents yet. Go to the Documents tab to add the first one." : "No documents match the current filter."}
              </td></tr>
            )}
            {filtered.map((d) => {
              const project    = projects.find((p) => p.id === d.projectId);
              const pidLabel   = project?.projectId || d.projectId || "—";
              const pidColor   = projectIdColor(d, thresholds);
              // SURGICAL CHANGE: use visible statuses for this subject type
              const visibleSts = getVisibleStatuses(d.subjectType, statuses, stageConfig);
              const pct        = stageToPercent(d.status, visibleSts);
              const barColor   = pct !== null ? progressBarColor(pct) : "var(--border-main)";
              const assigned   = members?.find((m) => (m.uid || m.id) === d.assignedTo);
              const hasRemarks = !!getTooltipContent(d);
              const activity   = getActivityLabel(d);

              return (
                <tr key={d.id} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...S.td, fontWeight: "700", color: pidColor, fontSize: "13px" }}>{pidLabel}</td>
                  <td style={S.td}>
                    <div style={{ fontWeight: "500" }}>{d.subject}</div>
                    {assigned && <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "2px" }}>{assigned.displayName}</div>}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span
                        style={{ ...S.pill(d.status), borderBottom: hasRemarks ? "1.5px dashed currentColor" : "none", paddingBottom: hasRemarks ? "2px" : "3px", cursor: "default" }}
                        onMouseEnter={(e) => handleStatusMouseEnter(e, d)}
                        onMouseLeave={handleStatusMouseLeave}
                      >
                        {d.status}
                      </span>
                      {activity && (
                        <span style={{
                          fontSize: "10px",
                          color: activity.isNew ? "var(--success)" : "var(--text-muted)",
                          fontStyle: "italic",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.1px",
                        }}>
                          {activity.isNew ? "🆕" : "🕒"} {activity.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={S.td}>
                    {pct !== null ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600", color: barColor }}>{pct}%</span>
                          {/* SURGICAL CHANGE: X/Y now uses visibleSts */}
                          <span style={{ fontSize: "10px", color: "var(--text-disabled)" }}>{visibleSts.indexOf(d.status) + 1}/{visibleSts.length}</span>
                        </div>
                        <div style={{ height: "5px", borderRadius: "3px", background: "var(--border-light)" }}>
                          <div style={{ height: "100%", borderRadius: "3px", width: `${pct}%`, background: barColor, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    ) : <span style={{ color: "var(--text-disabled)", fontSize: "11px" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}