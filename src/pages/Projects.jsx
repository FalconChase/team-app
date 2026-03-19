import { useState, useEffect } from "react";
import {
  collection, query, orderBy, getDocs,
  addDoc, updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import styles from "./Projects.module.css";

// ── Compute Helpers ───────────────────────────────────────────────────────────

function computeExpiryFromDuration(dateStarted, durationDays) {
  if (!dateStarted || !durationDays || Number(durationDays) < 1) return "";
  const start = new Date(dateStarted + "T00:00:00");
  start.setDate(start.getDate() + Number(durationDays) - 1);
  return start.toISOString().split("T")[0];
}

function computeDurationFromExpiry(dateStarted, expiryDate) {
  if (!dateStarted || !expiryDate) return "";
  const start  = new Date(dateStarted  + "T00:00:00");
  const expiry = new Date(expiryDate   + "T00:00:00");
  const diffDays = Math.round((expiry - start) / 86400000) + 1;
  return diffDays > 0 ? String(diffDays) : "";
}

function computeRevisedExpiry(originalExpiry, ctes) {
  if (!originalExpiry || !ctes?.length) return null;
  const totalDays = ctes.reduce((sum, c) => sum + (Number(c.days) || 0), 0);
  if (!totalDays) return null;
  const base = new Date(originalExpiry + "T00:00:00");
  base.setDate(base.getDate() + totalDays);
  return base.toISOString().split("T")[0];
}

// ── Empty form factory ────────────────────────────────────────────────────────
function emptyForm() {
  return {
    projectId: "", projectName: "", contractor: "",
    location: "", dateStarted: "", projectDuration: "",
    originalDateOfExpiry: "", originalCost: "",
    plannedAccomplishment: "", actualAccomplishment: "",
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Projects() {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "admin";
  const teamId  = userProfile?.teamId;

  const [projects,     setProjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [expandedIds,  setExpandedIds]  = useState(new Set());

  const [showAddModal,   setShowAddModal]   = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [addError,       setAddError]       = useState("");
  const [form,           setForm]           = useState(emptyForm());

  const [editProject,    setEditProject]    = useState(null);
  const [editForm,       setEditForm]       = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editProjError,  setEditProjError]  = useState("");

  const [cteTarget,      setCteTarget]      = useState(null);
  const [cteForm,        setCteForm]        = useState({ label: "", inputMode: "days", days: "", expiryDate: "" });
  const [cteSubmitting,  setCteSubmitting]  = useState(false);
  const [cteError,       setCteError]       = useState("");

  const [editAccomp,      setEditAccomp]      = useState(null);
  const [accompSubmitting, setAccompSubmitting] = useState(false);
  const [accompError,      setAccompError]      = useState("");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { if (teamId) fetchProjects(); }, [teamId]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const q    = query(collection(db, "teams", teamId, "projects"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setProjects(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(docId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(docId) ? next.delete(docId) : next.add(docId);
      return next;
    });
  }

  // ── Duration ↔ Expiry sync ────────────────────────────────────────────────
  function syncDates(prev, name, value) {
    const next = { ...prev, [name]: value };
    if (name === "projectDuration" && next.dateStarted)
      next.originalDateOfExpiry = computeExpiryFromDuration(next.dateStarted, value);
    if (name === "originalDateOfExpiry" && next.dateStarted)
      next.projectDuration = computeDurationFromExpiry(next.dateStarted, value);
    if (name === "dateStarted") {
      if (next.projectDuration)
        next.originalDateOfExpiry = computeExpiryFromDuration(value, next.projectDuration);
      else if (next.originalDateOfExpiry)
        next.projectDuration = computeDurationFromExpiry(value, next.originalDateOfExpiry);
    }
    return next;
  }

  function handleFormChange(e)     { const { name, value } = e.target; setForm((prev)     => syncDates(prev, name, value)); }
  function handleEditFormChange(e) { const { name, value } = e.target; setEditForm((prev) => syncDates(prev, name, value)); }

  // ── Add Project ───────────────────────────────────────────────────────────
  async function handleAddProject(e) {
    e.preventDefault();
    setAddError("");
    const pid = form.projectId.trim().toUpperCase();
    if (!pid) { setAddError("Project ID is required."); return; }
    if (form.dateStarted && form.projectDuration && !form.originalDateOfExpiry) {
      setAddError("Both duration and expiry date must be provided together.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "teams", teamId, "projects"), {
        projectId:             pid,
        projectName:           form.projectName.trim()    || null,
        contractor:            form.contractor.trim()     || null,
        location:              form.location?.trim()      || null,
        dateStarted:           form.dateStarted           || null,
        projectDuration:       form.projectDuration       ? Number(form.projectDuration) : null,
        originalDateOfExpiry:  form.originalDateOfExpiry  || null,
        originalCost:          form.originalCost          ? parseFloat(form.originalCost.replace(/,/g, "")) : null,
        plannedAccomplishment: form.plannedAccomplishment !== "" ? parseFloat(form.plannedAccomplishment) : null,
        actualAccomplishment:  form.actualAccomplishment  !== "" ? parseFloat(form.actualAccomplishment)  : null,
        ctes: [], revisedExpiryDates: [], revisedAmounts: [],
        createdAt: serverTimestamp(), createdBy: userProfile.uid, teamId,
      });
      setShowAddModal(false);
      setForm(emptyForm());
      fetchProjects();
    } catch (err) {
      setAddError("Failed to add project. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit Project Details ──────────────────────────────────────────────────
  function openEditProject(p) {
    setEditProject(p);
    setEditForm({
      projectId:            p.projectId            || "",
      projectName:          p.projectName          || "",
      contractor:           p.contractor           || "",
      location:             p.location             || "",
      dateStarted:          p.dateStarted          || "",
      projectDuration:      p.projectDuration?.toString() || "",
      originalDateOfExpiry: p.originalDateOfExpiry || "",
      originalCost:         p.originalCost?.toString()    || "",
    });
    setEditProjError("");
  }

  async function handleSaveEditProject(e) {
    e.preventDefault();
    setEditProjError("");
    if (!editForm.projectId?.trim()) { setEditProjError("Project ID is required."); return; }
    setEditSubmitting(true);
    try {
      const updates = {
        projectId:            editForm.projectId.toUpperCase().trim(),
        projectName:          editForm.projectName.trim()  || null,
        contractor:           editForm.contractor.trim()   || null,
        location:             editForm.location?.trim()    || null,
        dateStarted:          editForm.dateStarted         || null,
        projectDuration:      editForm.projectDuration     ? Number(editForm.projectDuration) : null,
        originalDateOfExpiry: editForm.originalDateOfExpiry || null,
        originalCost:         editForm.originalCost        ? parseFloat(editForm.originalCost.toString().replace(/,/g, "")) : null,
      };
      await updateDoc(doc(db, "teams", teamId, "projects", editProject.docId), updates);
      setProjects((prev) => prev.map((p) => p.docId === editProject.docId ? { ...p, ...updates } : p));
      setEditProject(null);
    } catch (err) {
      setEditProjError("Failed to save changes. Please try again.");
      console.error(err);
    } finally {
      setEditSubmitting(false);
    }
  }

  // ── CTE Management ────────────────────────────────────────────────────────
  function openAddCTE(p) {
    const nextNum = (p.ctes?.length || 0) + 1;
    setCteTarget({ docId: p.docId, ctes: p.ctes || [], existingCte: null });
    setCteForm({ label: `CTE #${nextNum}`, inputMode: "days", days: "", expiryDate: "" });
    setCteError("");
  }

  function openEditCTE(p, cte, index) {
    setCteTarget({ docId: p.docId, ctes: p.ctes || [], existingCte: { ...cte, index } });
    setCteForm({ label: cte.label, inputMode: "days", days: cte.days?.toString() || "", expiryDate: "" });
    setCteError("");
  }

  async function handleSaveCTE(e) {
    e.preventDefault();
    setCteError("");
    let days = 0;
    if (cteForm.inputMode === "days") {
      days = parseInt(cteForm.days);
      if (!days || days <= 0) { setCteError("Please enter a valid number of days (must be > 0)."); return; }
    } else {
      if (!cteForm.expiryDate) { setCteError("Please select a new expiry date."); return; }
      const project   = projects.find((p) => p.docId === cteTarget.docId);
      const prevCtes  = cteTarget.existingCte
        ? cteTarget.ctes.filter((_, i) => i !== cteTarget.existingCte.index)
        : cteTarget.ctes;
      const prevExpiry = computeRevisedExpiry(project.originalDateOfExpiry, prevCtes) || project.originalDateOfExpiry;
      const prev = new Date(prevExpiry + "T00:00:00");
      const next = new Date(cteForm.expiryDate + "T00:00:00");
      days = Math.round((next - prev) / 86400000);
      if (days <= 0) { setCteError("New expiry date must be after the current expiry date."); return; }
    }
    if (!cteForm.label.trim()) { setCteError("Please provide a label for this CTE."); return; }
    setCteSubmitting(true);
    try {
      let newCtes;
      if (cteTarget.existingCte) {
        newCtes = cteTarget.ctes.map((c, i) =>
          i === cteTarget.existingCte.index ? { ...c, label: cteForm.label.trim(), days } : c
        );
      } else {
        newCtes = [...cteTarget.ctes, { id: `cte_${Date.now()}`, label: cteForm.label.trim(), days }];
      }
      await updateDoc(doc(db, "teams", teamId, "projects", cteTarget.docId), { ctes: newCtes });
      setProjects((prev) => prev.map((p) => p.docId === cteTarget.docId ? { ...p, ctes: newCtes } : p));
      setCteTarget(null);
    } catch (err) {
      setCteError("Failed to save CTE. Please try again.");
      console.error(err);
    } finally {
      setCteSubmitting(false);
    }
  }

  async function handleDeleteCTE(p, index) {
    const newCtes = p.ctes.filter((_, i) => i !== index);
    try {
      await updateDoc(doc(db, "teams", teamId, "projects", p.docId), { ctes: newCtes });
      setProjects((prev) => prev.map((pr) => pr.docId === p.docId ? { ...pr, ctes: newCtes } : pr));
    } catch (err) { console.error("Failed to delete CTE:", err); }
  }

  // ── Accomplishment ────────────────────────────────────────────────────────
  function openEditAccomplishment(p) {
    setEditAccomp({
      docId:   p.docId,
      planned: p.plannedAccomplishment?.toString() ?? "",
      actual:  p.actualAccomplishment?.toString()  ?? "",
    });
    setAccompError("");
  }

  async function handleSaveAccomplishment(e) {
    e.preventDefault();
    setAccompError("");
    const planned = editAccomp.planned !== "" ? parseFloat(editAccomp.planned) : null;
    const actual  = editAccomp.actual  !== "" ? parseFloat(editAccomp.actual)  : null;
    if (
      (planned !== null && (planned < 0 || planned > 100)) ||
      (actual  !== null && (actual  < 0 || actual  > 100))
    ) { setAccompError("Values must be between 0 and 100."); return; }
    setAccompSubmitting(true);
    try {
      await updateDoc(doc(db, "teams", teamId, "projects", editAccomp.docId), {
        plannedAccomplishment: planned,
        actualAccomplishment:  actual,
      });
      setProjects((prev) =>
        prev.map((p) => p.docId === editAccomp.docId
          ? { ...p, plannedAccomplishment: planned, actualAccomplishment: actual } : p)
      );
      setEditAccomp(null);
    } catch (err) {
      setAccompError("Failed to update. Please try again.");
      console.error(err);
    } finally {
      setAccompSubmitting(false);
    }
  }

  // ── Formatters ────────────────────────────────────────────────────────────
  const fmtCurrency = (n) =>
    n == null ? "—" : `Php ${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (str) => {
    if (!str) return "—";
    return new Date(str + "T00:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  };
  const fmtPct = (n) => (n == null ? "—" : `${Number(n).toFixed(3)}%`);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Page Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>
            {loading ? "Loading…" : `${projects.length} project${projects.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        {isAdmin && (
          <button className={styles.addBtn} onClick={() => { setAddError(""); setShowAddModal(true); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Project
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>Loading projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="6" width="32" height="36" rx="3" stroke="var(--border-main)" strokeWidth="2"/>
              <path d="M16 16h16M16 22h16M16 28h10" stroke="var(--border-main)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className={styles.emptyTitle}>No projects yet</p>
          {isAdmin && <p className={styles.emptyHint}>Click "Add Project" to register the first one.</p>}
        </div>
      ) : (
        <div className={styles.list}>
          {projects.map((p) => {
            const isOpen        = expandedIds.has(p.docId);
            const ctes          = p.ctes || [];
            const revisedExpiry = computeRevisedExpiry(p.originalDateOfExpiry, ctes);

            return (
              <div key={p.docId} className={`${styles.card} ${isOpen ? styles.cardOpen : ""}`}>

                {/* ── Card Header ── */}
                <div className={styles.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={styles.idBadge}>{p.projectId}</span>
                    {p.projectName
                      ? <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{p.projectName}</span>
                      : isAdmin && (
                          <span style={{ fontSize: "0.78rem", color: "var(--text-disabled)", fontStyle: "italic" }}>
                            Details not yet filled — click Show Details to edit
                          </span>
                        )
                    }
                  </div>
                  <button
                    className={`${styles.toggleBtn} ${isOpen ? styles.toggleOpen : ""}`}
                    onClick={() => toggleExpand(p.docId)}
                  >
                    {isOpen ? "Hide Details" : "Show Details"}
                    <svg
                      className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`}
                      width="12" height="12" viewBox="0 0 12 12" fill="none"
                    >
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* ── Expanded Details ── */}
                {isOpen && (
                  <div className={styles.details}>
                    <div className={styles.detailsGrid}>

                      {/* ── Left: Project Info ── */}
                      <div className={styles.detailSection}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <p className={styles.sectionLabel} style={{ marginBottom: 0 }}>Project Info</p>
                          {isAdmin && (
                            <button className={styles.editBtn} onClick={() => openEditProject(p)}>
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Edit Details
                            </button>
                          )}
                        </div>

                        <Row label="Project ID"><span className={styles.monoVal}>{p.projectId}</span></Row>
                        <Row label="Project Name">{p.projectName || <Em>Not yet filled</Em>}</Row>
                        <Row label="Contractor">{p.contractor   || <Em>Not yet filled</Em>}</Row>
                        <Row label="Location">{p.location       || <Em>Not yet filled</Em>}</Row>
                        <Row label="Date Started">{fmtDate(p.dateStarted)}</Row>
                        <Row label="Original Duration">
                          {p.projectDuration
                            ? <><span className={styles.monoVal}>{p.projectDuration}</span>{" "}calendar days</>
                            : <Em>Not yet filled</Em>}
                        </Row>
                        <Row label="Original Expiry">{fmtDate(p.originalDateOfExpiry)}</Row>

                        {/* ── CTEs Section ── */}
                        <div className={styles.autoSection} style={{ marginTop: "0.85rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                            <p className={styles.autoLabel} style={{ marginBottom: 0 }}>
                              <span className={styles.autoDot} />
                              Contract Time Extensions
                            </p>
                            {isAdmin && (
                              <button className={styles.editBtn} style={{ fontSize: "0.72rem" }} onClick={() => openAddCTE(p)}>
                                + Add CTE
                              </button>
                            )}
                          </div>

                          {ctes.length === 0 ? (
                            <p style={{ fontSize: "0.78rem", color: "var(--text-disabled)", padding: "0.3rem 0" }}>No CTEs recorded yet.</p>
                          ) : (
                            ctes.map((cte, i) => {
                              const runningExpiry = computeRevisedExpiry(p.originalDateOfExpiry, ctes.slice(0, i + 1));
                              return (
                                <div key={cte.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px dashed var(--border-main)" }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>{cte.label}</span>
                                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>+{cte.days} calendar days</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <span className={styles.blueVal} style={{ fontSize: "0.82rem" }}>{fmtDate(runningExpiry)}</span>
                                    {isAdmin && (
                                      <>
                                        <button className={styles.editBtn} style={{ padding: "0.15rem 0.45rem", fontSize: "0.7rem" }} onClick={() => openEditCTE(p, cte, i)}>Edit</button>
                                        <button className={styles.editBtn} style={{ padding: "0.15rem 0.45rem", fontSize: "0.7rem", color: "var(--danger)" }} onClick={() => handleDeleteCTE(p, i)}>✕</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {revisedExpiry && (
                            <div style={{ marginTop: "0.6rem", padding: "0.45rem 0.75rem", background: "var(--info-bg)", borderRadius: "7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.78rem", color: "var(--info)", fontWeight: 600 }}>Revised Expiry Date</span>
                              <span style={{ fontSize: "0.85rem", color: "var(--info)", fontWeight: 700 }}>{fmtDate(revisedExpiry)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Right: Cost & Accomplishment ── */}
                      <div className={styles.detailSection}>
                        <p className={styles.sectionLabel}>Cost & Accomplishment</p>
                        <Row label="Original Cost">
                          {p.originalCost != null
                            ? <span className={styles.monoVal}>{fmtCurrency(p.originalCost)}</span>
                            : <Em>Not yet filled</Em>}
                        </Row>

                        {p.revisedAmounts?.length > 0 && (
                          <div className={styles.autoSection}>
                            <p className={styles.autoLabel}>
                              <span className={styles.autoDot} />Auto-populated · Revised Amounts
                            </p>
                            {p.revisedAmounts.map((ra, i) => (
                              <Row key={i} label="Revised Amount">
                                <span className={styles.blueVal}>{fmtCurrency(ra.amount)}</span>
                                <span className={styles.dueTag}>due to {ra.dueTo}</span>
                              </Row>
                            ))}
                          </div>
                        )}

                        {/* ── Accomplishment ── */}
                        <div className={styles.accomplishWrap}>
                          <div className={styles.accomplishHeader}>
                            <span className={styles.sectionLabel} style={{ marginBottom: 0 }}>Accomplishment</span>
                            <button className={styles.editBtn} onClick={() => openEditAccomplishment(p)}>
                              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {isAdmin ? "Edit" : "Log"}
                            </button>
                          </div>
                          <div className={styles.progressGroup}>
                            <div className={styles.progressRow}>
                              <span className={styles.progressLabel}>Planned</span>
                              <span className={styles.progressPct}>{fmtPct(p.plannedAccomplishment)}</span>
                            </div>
                            <div className={styles.bar}>
                              <div className={styles.barPlanned} style={{ width: `${Math.min(p.plannedAccomplishment || 0, 100)}%` }} />
                            </div>
                          </div>
                          <div className={styles.progressGroup}>
                            <div className={styles.progressRow}>
                              <span className={styles.progressLabel}>Actual</span>
                              <span className={styles.progressPct}>{fmtPct(p.actualAccomplishment)}</span>
                            </div>
                            <div className={styles.bar}>
                              <div className={styles.barActual} style={{ width: `${Math.min(p.actualAccomplishment || 0, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Project Modal ── */}
      {showAddModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Add New Project</h2>
                <p className={styles.modalSub}>
                  Only <span className={styles.req}>Project ID</span> is required.
                  All other details can be filled in later via <strong>Edit Details</strong>.
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddProject} className={styles.form}>
              <div className={styles.formSection}>
                <p className={styles.formSectionLabel}>Required <span className={styles.req}>*</span></p>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Project ID <span className={styles.req}>*</span></label>
                    <input name="projectId" value={form.projectId} onChange={handleFormChange}
                      placeholder="e.g. 25N00247" className={styles.input} autoFocus />
                    <span className={styles.hint}>Format: YYCCNNNN</span>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <p className={styles.formSectionLabel}>Optional <span className={styles.optTag}>fill in later</span></p>
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Project Name</label>
                    <input name="projectName" value={form.projectName} onChange={handleFormChange}
                      placeholder="Enter full project name" className={styles.input} />
                  </div>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Contractor</label>
                    <input name="contractor" value={form.contractor} onChange={handleFormChange}
                      placeholder="Enter contractor name" className={styles.input} />
                  </div>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Location</label>
                    <input name="location" value={form.location || ""} onChange={handleFormChange}
                      placeholder="e.g. Poblacion, Sibagat, Agusan del Sur" className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>Date Started</label>
                    <input type="date" name="dateStarted" value={form.dateStarted} onChange={handleFormChange} className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>Duration (Calendar Days)</label>
                    <input type="number" name="projectDuration" value={form.projectDuration}
                      onChange={handleFormChange} placeholder="e.g. 195" className={styles.input} min="1" />
                    <span className={styles.hint}>↔ Auto-fills expiry date below</span>
                  </div>
                  <div className={styles.field}>
                    <label>Original Date of Expiry</label>
                    <input type="date" name="originalDateOfExpiry" value={form.originalDateOfExpiry}
                      onChange={handleFormChange} className={styles.input} />
                    <span className={styles.hint}>↔ Auto-fills duration above</span>
                  </div>
                  <div className={styles.field}>
                    <label>Original Cost (Php)</label>
                    <input name="originalCost" value={form.originalCost} onChange={handleFormChange}
                      placeholder="e.g. 1500000" className={styles.input} />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <p className={styles.formSectionLabel}>Accomplishment <span className={styles.optTag}>optional</span></p>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Planned Accomplishment (%)</label>
                    <input type="number" name="plannedAccomplishment" value={form.plannedAccomplishment}
                      onChange={handleFormChange} placeholder="e.g. 75.500" className={styles.input} step="0.001" min="0" max="100" />
                  </div>
                  <div className={styles.field}>
                    <label>Actual Accomplishment (%)</label>
                    <input type="number" name="actualAccomplishment" value={form.actualAccomplishment}
                      onChange={handleFormChange} placeholder="e.g. 62.300" className={styles.input} step="0.001" min="0" max="100" />
                  </div>
                </div>
              </div>

              {addError && <p className={styles.errorMsg}>{addError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "Saving…" : "Add Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Project Details Modal ── */}
      {editProject && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setEditProject(null)}>
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>Edit Project Details</h2>
                <p className={styles.modalSub}>
                  Editing <span style={{ fontWeight: 700, color: "var(--primary)" }}>{editProject.projectId}</span>
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditProject(null)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEditProject} className={styles.form}>
              <div className={styles.formSection}>
                <p className={styles.formSectionLabel}>Project Details</p>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Project ID <span className={styles.req}>*</span></label>
                    <input name="projectId" value={editForm.projectId} onChange={handleEditFormChange} className={styles.input} />
                  </div>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Project Name</label>
                    <input name="projectName" value={editForm.projectName} onChange={handleEditFormChange}
                      placeholder="Enter full project name" className={styles.input} />
                  </div>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Contractor</label>
                    <input name="contractor" value={editForm.contractor} onChange={handleEditFormChange}
                      placeholder="Enter contractor name" className={styles.input} />
                  </div>
                  <div className={`${styles.field} ${styles.span2}`}>
                    <label>Location</label>
                    <input name="location" value={editForm.location || ""} onChange={handleEditFormChange}
                      placeholder="e.g. Poblacion, Sibagat, Agusan del Sur" className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>Date Started</label>
                    <input type="date" name="dateStarted" value={editForm.dateStarted} onChange={handleEditFormChange} className={styles.input} />
                  </div>
                  <div className={styles.field}>
                    <label>Duration (Calendar Days)</label>
                    <input type="number" name="projectDuration" value={editForm.projectDuration}
                      onChange={handleEditFormChange} className={styles.input} min="1" />
                    <span className={styles.hint}>↔ Auto-fills expiry date</span>
                  </div>
                  <div className={styles.field}>
                    <label>Original Date of Expiry</label>
                    <input type="date" name="originalDateOfExpiry" value={editForm.originalDateOfExpiry}
                      onChange={handleEditFormChange} className={styles.input} />
                    <span className={styles.hint}>↔ Auto-fills duration</span>
                  </div>
                  <div className={styles.field}>
                    <label>Original Cost (Php)</label>
                    <input name="originalCost" value={editForm.originalCost} onChange={handleEditFormChange}
                      placeholder="e.g. 1500000" className={styles.input} />
                  </div>
                </div>
              </div>
              {editProjError && <p className={styles.errorMsg}>{editProjError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditProject(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={editSubmitting}>
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit CTE Modal ── */}
      {cteTarget && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setCteTarget(null)}>
          <div className={styles.modal} style={{ maxWidth: 480 }}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>
                  {cteTarget.existingCte ? "Edit Contract Time Extension" : "Add Contract Time Extension"}
                </h2>
                <p className={styles.modalSub}>Enter duration in days or set the new expiry date directly</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setCteTarget(null)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveCTE} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.span2}`}>
                  <label>CTE Label <span className={styles.req}>*</span></label>
                  <input value={cteForm.label} onChange={(e) => setCteForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="e.g. CTE #1" className={styles.input} />
                </div>
                <div className={`${styles.field} ${styles.span2}`}>
                  <label>Input Method</label>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
                    {[{ mode: "days", label: "Enter Days" }, { mode: "date", label: "Enter New Expiry Date" }].map(({ mode, label }) => (
                      <button key={mode} type="button"
                        onClick={() => setCteForm((p) => ({ ...p, inputMode: mode }))}
                        style={{
                          padding: "0.4rem 1rem", borderRadius: "7px", border: "1.5px solid",
                          borderColor: cteForm.inputMode === mode ? "var(--primary)" : "var(--border-input)",
                          background:  cteForm.inputMode === mode ? "var(--primary)" : "var(--bg-input)",
                          color:       cteForm.inputMode === mode ? "#fff" : "var(--text-secondary)",
                          fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                          fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {cteForm.inputMode === "days" ? (
                  <div className={styles.field}>
                    <label>Number of Calendar Days <span className={styles.req}>*</span></label>
                    <input type="number" min="1" value={cteForm.days}
                      onChange={(e) => setCteForm((p) => ({ ...p, days: e.target.value }))}
                      placeholder="e.g. 22" className={styles.input} />
                    <span className={styles.hint}>Will be added on top of current expiry</span>
                  </div>
                ) : (
                  <div className={styles.field}>
                    <label>New Expiry Date <span className={styles.req}>*</span></label>
                    <input type="date" value={cteForm.expiryDate}
                      onChange={(e) => setCteForm((p) => ({ ...p, expiryDate: e.target.value }))}
                      className={styles.input} />
                    <span className={styles.hint}>Days are auto-calculated from current expiry</span>
                  </div>
                )}
              </div>
              {cteError && <p className={styles.errorMsg}>{cteError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setCteTarget(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={cteSubmitting}>
                  {cteSubmitting ? "Saving…" : cteTarget.existingCte ? "Save CTE" : "Add CTE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Accomplishment Modal ── */}
      {editAccomp && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setEditAccomp(null)}>
          <div className={styles.modal} style={{ maxWidth: 420 }}>
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalTitle}>{isAdmin ? "Edit Accomplishment" : "Log Accomplishment"}</h2>
                <p className={styles.modalSub}>
                  {isAdmin ? "Update planned and actual accomplishment percentages" : "Enter your planned and actual accomplishment for this period"}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditAccomp(null)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveAccomplishment} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Planned Accomplishment (%)</label>
                  <input type="number" value={editAccomp.planned}
                    onChange={(e) => setEditAccomp((p) => ({ ...p, planned: e.target.value }))}
                    placeholder="e.g. 75.500" className={styles.input} step="0.001" min="0" max="100" />
                </div>
                <div className={styles.field}>
                  <label>Actual Accomplishment (%)</label>
                  <input type="number" value={editAccomp.actual}
                    onChange={(e) => setEditAccomp((p) => ({ ...p, actual: e.target.value }))}
                    placeholder="e.g. 62.300" className={styles.input} step="0.001" min="0" max="100" />
                </div>
              </div>
              {accompError && <p className={styles.errorMsg}>{accompError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditAccomp(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={accompSubmitting}>
                  {accompSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.45rem 0", borderBottom: "1px dashed var(--border-main)", gap: "1rem" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500, textAlign: "right" }}>{children}</span>
    </div>
  );
}

function Em({ children }) {
  return <span style={{ color: "var(--text-disabled)", fontStyle: "italic", fontWeight: 400 }}>{children}</span>;
}