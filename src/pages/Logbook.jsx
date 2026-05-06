import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import {
  collection, query, getDocs, doc, getDoc, setDoc, orderBy, where
} from "firebase/firestore";
import { isUnworkable, getWeatherDescription } from "../utils/weatherLogic";

const ACCENT = "var(--primary)";
const CARD   = "var(--bg-card)";
const GREEN  = "var(--success)";
const YELLOW = "var(--warning)";
const RED    = "var(--danger)";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDow(year, month) { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; }

function ActivitiesOverview({ teamId, selectedProjId, selectedProject, viewYear, viewMonth, dayData, dataLoading, MONTH_NAMES, weatherMap }) {
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function handlePrint() { window.print(); }

  const rows = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const key = String(day);
    const d   = dayData[key] || {};
    const dateObj = new Date(viewYear, viewMonth, day);
    const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const activities = d.activities || [];
    const actText = activities.length > 0
      ? activities.map(a => typeof a === "string" ? a : a.description).filter(Boolean).join("; ")
      : "";
    const wSnap      = weatherMap?.[key];
    const weather    = d.weather || wSnap?.label || "";
    const workable   = d.workable !== undefined ? d.workable : (wSnap !== undefined ? wSnap.workable : undefined);
    const defaultAct = (actText === "" && workable === false) ? "No activities on site" : actText;
    return { day, dateLabel, weather, actText: defaultAct, workable, unworkableReason: d.unworkableReason || "", otherReason: d.otherReason || "" };
  });

  const projectLabel = selectedProject
    ? (selectedProject.projectId || "") + (selectedProject.projectName ? " — " + selectedProject.projectName : "")
    : "";

  // Print styles injected into <head> via a style tag — only active during window.print()
  const printStyle = `
    #logbook-overview-print .print-header { display: none; }
    @media print {
      body * { visibility: hidden !important; }
      #logbook-overview-print, #logbook-overview-print * { visibility: visible !important; }
      #logbook-overview-print { position: absolute; top: 0; left: 0; width: 100%; }
      @page { size: portrait; margin: 18mm 14mm; }
      #logbook-overview-print table { width: 100%; border-collapse: collapse; font-size: 9pt; font-family: Arial, sans-serif; }
      #logbook-overview-print th, #logbook-overview-print td { border: 1px solid #333; padding: 4px 6px; text-align: left; vertical-align: top; }
      #logbook-overview-print th { background: #e8edf5 !important; -webkit-print-color-adjust: exact; font-weight: 700; font-size: 8pt; }
      #logbook-overview-print .print-header { display: block !important; margin-bottom: 14px; font-family: Arial, sans-serif; border-bottom: 2px solid #333; padding-bottom: 8px; }
      #logbook-overview-print .print-header h1 { font-size: 16pt; font-weight: 700; margin: 0 0 6px; letter-spacing: 1px; text-transform: uppercase; color: #111}
      #logbook-overview-print .print-header .meta { display: flex; gap: 32px; font-size: 9pt; margin: 0; }
      #logbook-overview-print .print-header .meta-item { display: flex; flex-direction: column; }
      #logbook-overview-print .print-header .meta-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
      #logbook-overview-print .print-header .meta-value { font-size: 9pt; font-weight: 600; color: #111; }
      #logbook-overview-print .no-print { display: none !important; }
      #logbook-overview-print .status-w { color: #2e7d32; font-weight: 600; }
      #logbook-overview-print .status-u { color: #c62828; font-weight: 600; }
    }
  `;

  const CARD  = "var(--bg-card)";
  const ACCENT = "var(--primary)";
  const GREEN = "var(--success)";
  const RED   = "var(--danger)";

  return (
    <div id="logbook-overview-print">
      <style>{printStyle}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Activities Overview</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            Monthly summary · {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
        </div>
        <button
          onClick={handlePrint}
          style={{
            padding: "8px 18px", borderRadius: "8px", background: ACCENT,
            border: "none", color: "#fff", cursor: "pointer", fontSize: "12px",
            fontWeight: "600", fontFamily: "'IBM Plex Sans', Tahoma, Geneva, sans-serif",
          }}
        >
          🖨️ Print
        </button>
      </div>

      {/* Print header — hidden on screen via CSS, visible on print */}
      <div className="print-header">
        <h1>Activity Logs</h1>
        <div className="meta">
          <div className="meta-item">
            <span className="meta-label">Project ID</span>
            <span className="meta-value">{selectedProject?.projectId || "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Project Name</span>
            <span className="meta-value">{selectedProject?.projectName || "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Month</span>
            <span className="meta-value">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {dataLoading ? (
        <div style={{ textAlign: "center", color: "#7ab3e0", fontSize: "12px", padding: "40px 0" }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'IBM Plex Sans', Tahoma, Geneva, sans-serif" }}>
            <thead>
              <tr>
                {["Date", "Weather", "Site Activities", "Status", "Remarks"].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left", fontSize: "10px",
                    fontWeight: "700", color: "#7ab3e0", textTransform: "uppercase",
                    letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)",
                    borderBottom: "2px solid rgba(122,179,224,0.3)",
                    borderRight: "1px solid rgba(122,179,224,0.1)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ day, dateLabel, weather, actText, workable, unworkableReason, otherReason }) => {
                const isUnworkable = workable === false;
                const isWorkable   = workable === true;
                const isEmpty      = workable === undefined;
                const rowBg = isUnworkable
                  ? "rgba(229,57,53,0.06)"
                  : isWorkable && actText
                    ? "rgba(76,175,80,0.05)"
                    : "transparent";
                const reason = unworkableReason === "__other__"
                  ? otherReason
                  : unworkableReason;
                return (
                  <tr key={day} style={{ background: rowBg, borderBottom: "1px solid rgba(55,138,221,0.15)" }}>
                    <td style={{ padding: "8px 12px", color: "#1a3a5c", whiteSpace: "nowrap", fontWeight: "700", width: "120px" }}>{dateLabel}</td>
                    <td style={{ padding: "8px 12px", color: "#2a4a6a", width: "110px" }}>{weather || <span style={{ color: "#999", fontStyle: "italic" }}>—</span>}</td>
                    <td style={{ padding: "8px 12px", color: "#1a3a5c", lineHeight: "1.5" }}>{actText || <span style={{ color: "#999", fontStyle: "italic" }}>No activities logged</span>}</td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap", width: "110px" }}>
                      {isEmpty
                        ? <span style={{ color: "#999", fontStyle: "italic" }}>—</span>
                        : isWorkable
                          ? <span className="status-w" style={{ color: GREEN, fontWeight: "600" }}>✓ Workable</span>
                          : <span className="status-u" style={{ color: RED,   fontWeight: "600" }}>✕ Unworkable</span>
                      }
                    </td>
                    <td style={{ padding: "8px 12px", color: "#4a6a8a", fontSize: "11px" }}>{isUnworkable ? reason : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend — hidden on print */}
      <div className="no-print" style={{ display: "flex", gap: "16px", marginTop: "14px", flexWrap: "wrap" }}>
        {[
          { c: GREEN,   l: "Workable with activities"  },
          { c: "#f9a825", l: "Workable, no activities" },
          { c: RED,     l: "Unworkable"                },
          { c: "#555",  l: "No entry yet"              },
        ].map(({ c, l }) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#7ab3e0" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Logbook() {
  const { userProfile } = useAuth();
  useTeam();

  const [searchParams] = useSearchParams();
  const teamId    = userProfile?.teamId;
  const canEdit   = ["admin","owner","manager","supervisor"].includes(userProfile?.role);

  const today      = new Date();
  const todayYear  = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay   = today.getDate();

  const [projects,          setProjects]          = useState([]);
  const [projLoading,       setProjLoading]       = useState(true);
  const [selectedProjId,    setSelectedProjId]    = useState(searchParams.get("projectId") || sessionStorage.getItem("logbook_projId") || "");
  const [viewYear,          setViewYear]          = useState(() => Number(sessionStorage.getItem("logbook_year")) || todayYear);
  const [viewMonth,         setViewMonth]         = useState(() => { const v = sessionStorage.getItem("logbook_month"); return v !== null ? Number(v) : todayMonth; });
  const [dayData,           setDayData]           = useState({});
  const [dataLoading,       setDataLoading]       = useState(false);
  const [weatherMap,        setWeatherMap]        = useState({});
  const [unworkableReasons, setUnworkableReasons] = useState(["Rain","Holiday","Sunday","Suspension of Work"]);
  const [selectedDay,       setSelectedDay]       = useState(null);
  const [panel,             setPanel]             = useState({ weather:"", workable:true, unworkableReason:"", otherReason:"", activities:[] });
  const [newActivity,       setNewActivity]       = useState("");
  const [panelSaving,       setPanelSaving]       = useState(false);
  const [panelSaved,        setPanelSaved]        = useState(false);
  const [activeTab,         setActiveTab]         = useState(sessionStorage.getItem("logbook_tab") || "daily");

  const selectedProject = projects.find(p => p.docId === selectedProjId) || null;

  // ── Fetch Projects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;
    setProjLoading(true);
    getDocs(query(collection(db, "teams", teamId, "projects"), orderBy("createdAt", "desc")))
      .then(snap => {
        const list = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        setProjects(list);
        if (!selectedProjId && list.length > 0) setSelectedProjId(list[0].docId);
      })
      .catch(console.error)
      .finally(() => setProjLoading(false));
  }, [teamId]);

  // ── Fetch Unworkable Reasons ──────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;
    getDoc(doc(db, "logbookSettings", teamId))
      .then(snap => { if (snap.exists() && snap.data().reasons?.length) setUnworkableReasons(snap.data().reasons); })
      .catch(console.error);
  }, [teamId]);

  // ── Fetch Day Data + Weather for current view ─────────────────────────────
  useEffect(() => {
    if (!teamId || !selectedProjId) return;
    setDataLoading(true);
    setDayData({});
    const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

    getDocs(collection(db, "teams", teamId, "projects", selectedProjId, "logbook", ym, "days"))
      .then(snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data(); });
        setDayData(map);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));

    const projContractId = projects.find(p => p.docId === selectedProjId)?.projectId || "";
    const wlogConstraints = [
      where("contractInfo.month", "==", MONTH_NAMES[viewMonth]),
      where("contractInfo.year",  "==", String(viewYear)),
      ...(projContractId ? [where("contractInfo.contractId", "==", projContractId)] : []),
      orderBy("savedAt", "desc"),
    ];
    getDocs(query(collection(db, "teams", teamId, "weatherLogs"), ...wlogConstraints))
      .then(snap => {
        const wmap = {};
        if (!snap.empty) {
          // Use the most recently saved snapshot for this month
          const data = snap.docs[0].data();
          if (Array.isArray(data.weatherData)) {
            data.weatherData.forEach((rowStr, idx) => {
              const day = idx + 1; // index 0 = day 1
              if (day > getDaysInMonth(viewYear, viewMonth)) return;
              const hourlyData = rowStr.split(",").map(Number);
              // Skip completely empty days (all zeros)
              if (hourlyData.every(v => v === 0)) return;
              const label    = getWeatherDescription(hourlyData); // e.g. "CLOUDY / RAIN SHOWER / HEAVY RAIN"
              const workable = !isUnworkable(hourlyData);          // false = unworkable
              if (label) wmap[String(day)] = { label, workable };
            });
          }
        }
        setWeatherMap(wmap);
      })
      .catch(console.error);
  }, [teamId, selectedProjId, viewYear, viewMonth, projects]);

  // ── Month navigation ──────────────────────────────────────────────────────
  function canGoPrev() {
    if (!selectedProject?.dateStarted) return true;
    const s = new Date(selectedProject.dateStarted + "T00:00:00");
    return viewYear > s.getFullYear() || (viewYear === s.getFullYear() && viewMonth > s.getMonth());
  }
  function canGoNext() {
    return viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);
  }
  function prevMonth() {
    if (!canGoPrev()) return;
    setSelectedDay(null);
    if (viewMonth === 0) {
      sessionStorage.setItem("logbook_year", viewYear - 1);
      sessionStorage.setItem("logbook_month", 11);
      setViewYear(y => y - 1); setViewMonth(11);
    } else {
      sessionStorage.setItem("logbook_month", viewMonth - 1);
      setViewMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (!canGoNext()) return;
    setSelectedDay(null);
    if (viewMonth === 11) {
      sessionStorage.setItem("logbook_year", viewYear + 1);
      sessionStorage.setItem("logbook_month", 0);
      setViewYear(y => y + 1); setViewMonth(0);
    } else {
      sessionStorage.setItem("logbook_month", viewMonth + 1);
      setViewMonth(m => m + 1);
    }
  }

  // ── Open day panel ────────────────────────────────────────────────────────
  function openDay(day) {
    const key     = String(day);
    const ex      = dayData[key] || {};
    const wSnap   = weatherMap[key];
    // Saved Firestore data always wins. Weather snapshot fills gaps for unsaved days.
    const hasSaved = ex.workable !== undefined;
    setPanel({
      weather:          ex.weather          || (wSnap?.label    || ""),
      workable:         hasSaved            ? ex.workable : (wSnap !== undefined ? wSnap.workable : true),
      unworkableReason: ex.unworkableReason || "",
      otherReason:      ex.otherReason      || "",
      activities:       ex.activities       || [],
    });
    setNewActivity("");
    setSelectedDay(day);
    setPanelSaved(false);
  }

  // ── Save day ──────────────────────────────────────────────────────────────
  async function saveDay() {
    if (!selectedProjId || !selectedDay) return;
    setPanelSaving(true);
    const ym  = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const key = String(selectedDay);
    const ref = doc(db, "teams", teamId, "projects", selectedProjId, "logbook", ym, "days", key);
    const meta = { updatedBy: userProfile?.displayName || userProfile?.email || "Unknown", updatedAt: new Date().toISOString() };

    const payload = canEdit
      ? {
          weather:            panel.weather,
          workable:           panel.workable,
          unworkableReason:   panel.workable ? "" : panel.unworkableReason,
          otherReason:        panel.workable ? "" : (panel.unworkableReason === "__other__" ? panel.otherReason : ""),
          activities:         panel.activities,
          ...meta,
        }
      : { activities: panel.activities, ...meta };

    try {
      await setDoc(ref, payload, { merge: true });
      setDayData(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...payload } }));
      setPanelSaved(true);
      setTimeout(() => setPanelSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save day:", err);
    } finally {
      setPanelSaving(false);
    }
  }

  function addActivity() {
    const t = newActivity.trim();
    if (!t) return;
    const entry = {
      id:          Date.now().toString(),
      description: t,
      addedBy:     userProfile?.uid || "",
      displayName: userProfile?.displayName || userProfile?.email || "Unknown",
      timestamp:   new Date().toISOString(),
    };
    setPanel(p => ({ ...p, activities: [...p.activities, entry] }));
    setNewActivity("");
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const daysInMonth      = getDaysInMonth(viewYear, viewMonth);
  const firstDow         = getFirstDow(viewYear, viewMonth);
  const cells            = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentMonth   = viewYear === todayYear && viewMonth === todayMonth;
  // Merge weatherMap into dayData for stat counts: saved Logbook entries take priority
  const mergedDayStats = { ...Object.fromEntries(
    Object.entries(weatherMap).map(([k, snap]) => [k, { workable: snap.workable }])
  ), ...dayData };
  const totalWorkable    = Object.values(mergedDayStats).filter(d => d.workable === true).length;
  const totalUnworkable  = Object.values(mergedDayStats).filter(d => d.workable === false).length;
  const daysWithAct      = Object.values(dayData).filter(d => d.activities?.length > 0).length;
  const daysRemaining    = isCurrentMonth ? Math.max(0, daysInMonth - todayDay) : "—";

  function cellColor(day) {
    const d     = dayData[String(day)];
    const wSnap = weatherMap[String(day)];
    // If Firestore has a saved entry, use it
    if (d && d.workable !== undefined) {
      if (d.workable === false) return RED;
      if (d.activities?.length > 0) return GREEN;
      return YELLOW;
    }
    // No saved entry — fall back to weather snapshot
    if (wSnap !== undefined) {
      return wSnap.workable ? YELLOW : RED;
    }
    return null;
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    page:      { fontFamily: "var(--font-family)", color: "var(--text-primary)" },
    title:     { fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" },
    sub:       { fontSize: "12px", color: "var(--text-muted)" },
    projSel:   {
      padding: "8px 12px", borderRadius: "6px", fontSize: "12px",
      background: "var(--bg-input)", border: "1px solid var(--border-input)", color: "var(--text-primary)",
      cursor: "pointer", minWidth: "260px", fontFamily: "var(--font-family)",
    },
    statsStrip: { display: "flex", gap: "12px", marginBottom: "20px" },
    statBox:   {
      flex: 1, background: CARD, borderRadius: "10px", padding: "16px",
      border: "1px solid var(--border-main)", textAlign: "center",
    },
    statNum:   { fontSize: "26px", fontWeight: "700", color: ACCENT },
    statLabel: { fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" },
    monthNav:  {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: CARD, borderRadius: "10px", padding: "12px 20px", marginBottom: "16px",
      border: "1px solid var(--border-main)",
    },
    navBtn: (on) => ({
      background: "var(--bg-secondary)", border: "1px solid var(--border-main)",
      color: ACCENT, borderRadius: "6px", padding: "6px 16px", cursor: on ? "pointer" : "default",
      fontSize: "15px", opacity: on ? 1 : 0.3, fontFamily: "var(--font-family)",
    }),
    monthLabel: { fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" },
    calWrap:   { display: "flex", gap: "16px", alignItems: "flex-start" },
    calCard:   { flex: 1, background: CARD, borderRadius: "10px", padding: "16px", border: "1px solid var(--border-main)" },
    dowRow:    { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "6px" },
    dowCell:   { textAlign: "center", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", padding: "4px 0" },
    daysGrid:  { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" },
    dayCell: (color, isToday, isSel) => ({
      minHeight: "54px", borderRadius: "8px", cursor: "pointer",
      background: color ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--bg-hover)",
      border: isToday
        ? `2px solid ${ACCENT}`
        : isSel
          ? `2px solid var(--primary-border)`
          : `1px solid ${color ? `color-mix(in srgb, ${color} 25%, transparent)` : "var(--border-light)"}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
      padding: "6px 4px", boxSizing: "border-box", transition: "all 0.12s",
    }),
    dayNum: (isToday) => ({ fontSize: "13px", fontWeight: isToday ? "800" : "600", color: isToday ? ACCENT : "var(--text-primary)" }),
    panelWrap: {
      width: "340px", flexShrink: 0, background: CARD, borderRadius: "10px",
      border: "1px solid var(--border-main)", padding: "20px", boxSizing: "border-box",
      overflowY: "auto", maxHeight: "640px",
    },
    panelTitle: { fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" },
    fLabel:    { fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", display: "block", marginBottom: "4px", marginTop: "14px" },
    textInput: {
      width: "100%", padding: "8px 10px", borderRadius: "6px",
      background: "var(--bg-input)", border: "1px solid var(--border-input)",
      color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box", outline: "none",
      fontFamily: "var(--font-family)",
    },
    selInput:  {
      width: "100%", padding: "8px 10px", borderRadius: "6px",
      background: "var(--bg-input)", border: "1px solid var(--border-input)",
      color: "var(--text-primary)", fontSize: "12px", boxSizing: "border-box", cursor: "pointer",
      fontFamily: "var(--font-family)",
    },
    togGroup:  { display: "flex", gap: "8px", marginTop: "6px" },
    togBtn: (active, color) => ({
      flex: 1, padding: "8px", borderRadius: "6px", cursor: "pointer",
      border: `1px solid ${active ? color : "var(--border-input)"}`,
      background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : "transparent",
      color: active ? color : "var(--text-muted)", fontSize: "12px", fontWeight: "600",
      fontFamily: "var(--font-family)",
    }),
    actItem:   {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 10px", background: "var(--bg-secondary)", borderRadius: "6px",
      marginBottom: "4px", fontSize: "12px", color: "var(--text-primary)",
    },
    rmBtn:     { background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "14px", padding: "0 2px" },
    addRow:    { display: "flex", gap: "6px", marginTop: "8px" },
    addInput:  {
      flex: 1, padding: "7px 10px", borderRadius: "6px",
      background: "var(--bg-input)", border: "1px solid var(--border-input)",
      color: "var(--text-primary)", fontSize: "12px", outline: "none",
      fontFamily: "var(--font-family)",
    },
    addBtn:    {
      padding: "7px 14px", borderRadius: "6px", background: ACCENT,
      border: "none", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "600",
      fontFamily: "var(--font-family)",
    },
    saveBtn: (saved) => ({
      width: "100%", marginTop: "16px", padding: "10px", borderRadius: "8px",
      background: saved ? GREEN : ACCENT, border: "none", color: "#fff", cursor: "pointer",
      fontSize: "13px", fontWeight: "700", transition: "background 0.2s",
      fontFamily: "var(--font-family)",
    }),
    legend:    { display: "flex", gap: "14px", marginTop: "14px", flexWrap: "wrap" },
    legItem:   { display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)" },
    legDot: (c) => ({ width: "10px", height: "10px", borderRadius: "3px", background: c }),
    emptyPanel: {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "220px", color: "var(--text-muted)", fontSize: "12px", textAlign: "center", gap: "8px",
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={s.title}>Construction Logbook</div>
          <div style={s.sub}>Daily work log per project</div>
        </div>
        <select
          style={s.projSel}
          value={selectedProjId}
          onChange={e => { sessionStorage.setItem("logbook_projId", e.target.value); setSelectedProjId(e.target.value); setSelectedDay(null); }}
          disabled={projLoading}
        >
          {projLoading && <option value="">Loading projects…</option>}
          {!projLoading && projects.length === 0 && <option value="">No projects found</option>}
          {projects.map(p => (
            <option key={p.docId} value={p.docId}>
              {p.projectId}{p.projectName ? ` — ${p.projectName}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "daily",    label: "📅 Daily Log"           },
          { key: "overview", label: "📊 Activities Overview" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { sessionStorage.setItem("logbook_tab", tab.key); setActiveTab(tab.key); }}
            style={{
              padding: "8px 20px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
              fontWeight: activeTab === tab.key ? "700" : "400",
              background: activeTab === tab.key ? ACCENT : "transparent",
              color: activeTab === tab.key ? "#fff" : "var(--text-secondary)",
              border: activeTab === tab.key ? "none" : "1px solid var(--border-main)",
              fontFamily: "'IBM Plex Sans', Tahoma, Geneva, sans-serif",
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* No project selected */}
      {!selectedProjId && !projLoading && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>No project selected</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Select a project above to view its logbook.
          </div>
        </div>
      )}

      {selectedProjId && (
        <>
          {activeTab === "daily" && (
            <>
              {/* Stats strip */}
              <div style={s.statsStrip}>
                {[
                  { num: totalWorkable,   label: "Total Workable"     },
                  { num: totalUnworkable, label: "Total Unworkable"   },
                  { num: daysWithAct,     label: "Days w/ Activities" },
                  { num: daysRemaining,   label: "Days Remaining"     },
                ].map(({ num, label }) => (
                  <div key={label} style={s.statBox}>
                    <div style={s.statNum}>{num}</div>
                    <div style={s.statLabel}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Month navigator */}
              <div style={s.monthNav}>
                <button style={s.navBtn(canGoPrev())} onClick={prevMonth} disabled={!canGoPrev()}>←</button>
                <span style={s.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <button style={s.navBtn(canGoNext())} onClick={nextMonth} disabled={!canGoNext()}>→</button>
              </div>

              {/* Calendar + panel */}
              <div style={s.calWrap}>

                {/* Calendar */}
                <div style={s.calCard}>
                  {dataLoading && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", padding: "20px 0" }}>
                      Loading…
                    </div>
                  )}
                  {!dataLoading && (
                    <>
                      <div style={s.dowRow}>
                        {DAYS_OF_WEEK.map(d => <div key={d} style={s.dowCell}>{d}</div>)}
                      </div>
                      <div style={s.daysGrid}>
                        {cells.map((day, i) => {
                          if (!day) return <div key={`e${i}`} />;
                          const color   = cellColor(day);
                          const isToday = isCurrentMonth && day === todayDay;
                          const isSel   = selectedDay === day;
                          const data    = dayData[String(day)];
                          return (
                            <div key={day} style={s.dayCell(color, isToday, isSel)} onClick={() => openDay(day)}>
                              <span style={s.dayNum(isToday)}>{day}</span>
                              {data?.activities?.length > 0 && (
                                <span style={{ fontSize: "9px", color: "var(--success)", marginTop: "2px" }}>
                                  {data.activities.length} act.
                                </span>
                              )}
                              {data?.workable === false && (
                                <span style={{ fontSize: "9px", color: "var(--danger)", marginTop: "2px" }}>✕</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={s.legend}>
                        {[
                          { c: GREEN,  l: "Workable + Activities"  },
                          { c: YELLOW, l: "Workable, No Activities" },
                          { c: RED,    l: "Unworkable"              },
                        ].map(({ c, l }) => (
                          <div key={l} style={s.legItem}><div style={s.legDot(c)} />{l}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Day detail panel */}
                <div style={s.panelWrap}>
                  {!selectedDay && (
                    <div style={s.emptyPanel}>
                      <span style={{ fontSize: "28px" }}>📅</span>
                      <span>Click a day on the calendar<br />to view or log details</span>
                    </div>
                  )}

                  {selectedDay && (
                    <>
                      <div style={s.panelTitle}>
                        {MONTH_NAMES[viewMonth]} {selectedDay}, {viewYear}
                      </div>

                      {/* Weather */}
                      <label style={s.fLabel}>Weather</label>
                      {canEdit ? (
                        <input
                          style={s.textInput}
                          value={panel.weather}
                          onChange={e => setPanel(p => ({ ...p, weather: e.target.value }))}
                          placeholder="e.g. Sunny, Rainy…"
                        />
                      ) : (
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", padding: "4px 0" }}>
                          {panel.weather || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not set</span>}
                        </div>
                      )}

                      {/* Day Status */}
                      <label style={s.fLabel}>Day Status</label>
                      {canEdit ? (
                        <div style={s.togGroup}>
                          <button style={s.togBtn(panel.workable,  GREEN)} onClick={() => setPanel(p => ({ ...p, workable: true  }))}>✓ Workable</button>
                          <button style={s.togBtn(!panel.workable, RED)}   onClick={() => setPanel(p => ({ ...p, workable: false }))}>✕ Unworkable</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: "13px", color: panel.workable ? "var(--success)" : "var(--danger)", fontWeight: "600", padding: "4px 0" }}>
                          {panel.workable ? "Workable" : "Unworkable"}
                        </div>
                      )}

                      {/* Unworkable Reason */}
                      {!panel.workable && (
                        <>
                          <label style={s.fLabel}>Reason</label>
                          {canEdit ? (
                            <>
                              <select
                                style={s.selInput}
                                value={panel.unworkableReason}
                                onChange={e => setPanel(p => ({ ...p, unworkableReason: e.target.value }))}
                              >
                                <option value="">— Select reason —</option>
                                {unworkableReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                <option value="__other__">Other (specify below)</option>
                              </select>
                              {panel.unworkableReason === "__other__" && (
                                <input
                                  style={{ ...s.textInput, marginTop: "6px" }}
                                  value={panel.otherReason}
                                  onChange={e => setPanel(p => ({ ...p, otherReason: e.target.value }))}
                                  placeholder="Specify reason…"
                                />
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: "13px", color: "var(--text-primary)", padding: "4px 0" }}>
                              {panel.unworkableReason === "__other__"
                                ? (panel.otherReason || "Other")
                                : (panel.unworkableReason || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not specified</span>)}
                            </div>
                          )}
                        </>
                      )}

                      {/* Activities */}
                      <label style={{ ...s.fLabel, marginTop: "18px" }}>
                        Activities
                        {panel.activities.length > 0 && (
                          <span style={{ fontWeight: "400", color: "var(--text-muted)", marginLeft: "6px" }}>
                            ({panel.activities.length})
                          </span>
                        )}
                      </label>
                      {panel.activities.length === 0 && (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", padding: "4px 0" }}>
                          No activities logged yet.
                        </div>
                      )}
                      {panel.activities.map((act, i) => (
                        <div key={act.id || i} style={s.actItem}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{act.description || act}</span>
                            {act.displayName && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                {act.displayName} · {act.timestamp ? new Date(act.timestamp).toLocaleString() : ""}
                              </span>
                            )}
                          </div>
                          <button
                            style={s.rmBtn}
                            onClick={() => setPanel(p => ({ ...p, activities: p.activities.filter((_, ai) => ai !== i) }))}
                          >✕</button>
                        </div>
                      ))}

                      {/* Add activity — all roles */}
                      <div style={s.addRow}>
                        <input
                          style={s.addInput}
                          value={newActivity}
                          onChange={e => setNewActivity(e.target.value)}
                          placeholder="Add activity…"
                          onKeyDown={e => { if (e.key === "Enter") addActivity(); }}
                        />
                        <button style={s.addBtn} onClick={addActivity}>Add</button>
                      </div>

                      <button style={s.saveBtn(panelSaved)} onClick={saveDay} disabled={panelSaving}>
                        {panelSaving ? "Saving…" : panelSaved ? "✓ Saved" : "Save Day"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "overview" && (
            <ActivitiesOverview
              teamId={teamId}
              selectedProjId={selectedProjId}
              selectedProject={selectedProject}
              viewYear={viewYear}
              viewMonth={viewMonth}
              dayData={dayData}
              dataLoading={dataLoading}
              MONTH_NAMES={MONTH_NAMES}
              weatherMap={weatherMap}
            />
          )}
        </>
      )}
    </div>
  );
}
