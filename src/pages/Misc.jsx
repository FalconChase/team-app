import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTeam } from "../contexts/TeamContext";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Settings is now its own full-featured page ────────────────────────────────
export { default as Settings } from "./Settings";

// ═══════════════════════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════════════════════
export function Setup() {
  const [teamName, setTeamName] = useState("");
  const [dept, setDept] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTeam } = useTeam();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile?.teamId) navigate("/");
  }, [userProfile?.teamId]);

  async function handleCreate() {
    if (!teamName.trim() || !dept.trim()) return;
    if (userProfile?.teamId) { navigate("/"); return; }
    setLoading(true);
    await createTeam(teamName.trim(), dept.trim());
    navigate("/");
  }

  const s = {
    page: { minHeight: "100vh", background: "#0f2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Tahoma,Geneva,sans-serif" },
    card: { background: "#fff", borderRadius: "12px", padding: "36px 32px", width: "100%", maxWidth: "440px" },
    title: { fontSize: "20px", fontWeight: "600", color: "#1a3a5c", marginBottom: "6px" },
    sub: { fontSize: "13px", color: "#888", marginBottom: "28px" },
    label: { display: "block", fontSize: "12px", color: "#5a7a9a", marginBottom: "4px", fontWeight: "500" },
    input: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #d0dde8", fontSize: "13px", fontFamily: "Tahoma,Geneva,sans-serif", boxSizing: "border-box", marginBottom: "16px" },
    btn: { width: "100%", padding: "11px", borderRadius: "6px", background: "#1a3a5c", color: "#fff", border: "none", fontSize: "13px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif" }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Set Up Your Team</div>
        <div style={s.sub}>You're the first admin. Enter your team and department details to get started.</div>
        <label style={s.label}>Department Name</label>
        <input style={s.input} value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Department of Public Works" autoFocus />
        <label style={s.label}>Team Name</label>
        <input style={s.input} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Infrastructure Team" />
        <button style={s.btn} onClick={handleCreate} disabled={loading || !teamName.trim() || !dept.trim()}>
          {loading ? "Creating..." : "Create Team & Continue"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pending
// ═══════════════════════════════════════════════════════════════════════════════
export function Pending() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const s = {
    page: { minHeight: "100vh", background: "#0f2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "Tahoma,Geneva,sans-serif" },
    card: { background: "#fff", borderRadius: "12px", padding: "36px 32px", width: "100%", maxWidth: "400px", textAlign: "center" }
  };
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#1a3a5c", marginBottom: "8px" }}>Request Sent!</div>
        <div style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Your request to join has been sent. The team admin will review and approve your request. You'll gain access once approved.</div>
        <button
          style={{ padding: "10px 24px", borderRadius: "6px", background: "#1a3a5c", color: "#fff", border: "none", fontSize: "13px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif" }}
          onClick={async () => { await logout(); navigate("/login"); }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════════════════════════════════════════
export function Reports() {
  const { userProfile } = useAuth();
  const { members, team } = useTeam();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function generatePDF() {
    setLoading(true);
    const q = query(collection(db, "papers"), where("teamId", "==", userProfile.teamId));
    const snap = await getDocs(q);
    const papers = snap.docs.map(d => d.data());

    const filtered = papers.filter(p => {
      if (!dateFrom && !dateTo) return true;
      const d = p.dotsDate || "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });

    const pdf = new jsPDF();
    const pageW = pdf.internal.pageSize.getWidth();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("TEAM APP — Document Status Report", pageW / 2, 20, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`${team?.department || ""} · ${team?.name || ""}`, pageW / 2, 28, { align: "center" });
    pdf.text(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, 34, { align: "center" });

    const stalled = filtered.filter(p => {
      const ts = p.lastUpdatedAt?.toDate ? p.lastUpdatedAt.toDate() : null;
      if (!ts) return false;
      return Math.floor((Date.now() - ts.getTime()) / 86400000) >= 7;
    });

    pdf.setFontSize(10);
    pdf.text(`Total Papers: ${filtered.length}   Stalled (7+ days): ${stalled.length}   Active: ${filtered.length - stalled.length}`, 14, 44);

    autoTable(pdf, {
      startY: 52,
      head: [["Title", "DoTS Ref", "DoTS Date", "Stage", "Priority", "Assigned To", "Days at Stage"]],
      body: filtered.map(p => {
        const member = members.find(m => m.uid === p.assignedTo);
        const ts = p.lastUpdatedAt?.toDate ? p.lastUpdatedAt.toDate() : null;
        const days = ts ? Math.floor((Date.now() - ts.getTime()) / 86400000) : "—";
        return [
          p.title || "—", p.dotsRef || "—", p.dotsDate || "—",
          p.stage || "—", p.priority || "—",
          member?.displayName || "Unassigned", days
        ];
      }),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [26, 58, 92], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 32 } }
    });

    pdf.save(`TeamApp_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    setLoading(false);
  }

  const s = {
    title: { fontSize: "18px", fontWeight: "600", color: "#1a3a5c", marginBottom: "20px" },
    card: { background: "#fff", borderRadius: "8px", border: "0.5px solid #e0e8f0", padding: "20px", maxWidth: "500px" },
    label: { display: "block", fontSize: "12px", color: "#5a7a9a", marginBottom: "4px", fontWeight: "500" },
    input: { width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #d0dde8", fontSize: "13px", fontFamily: "Tahoma,Geneva,sans-serif", boxSizing: "border-box", marginBottom: "14px" },
    btn: { padding: "10px 24px", borderRadius: "6px", background: "#1a3a5c", color: "#fff", border: "none", fontSize: "13px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif", width: "100%" }
  };

  return (
    <div>
      <div style={s.title}>Generate Report</div>
      <div style={s.card}>
        <div style={{ fontSize: "13px", color: "#555", marginBottom: "16px" }}>
          Generate a PDF summary of all papers and their current status. Optionally filter by DoTS date range.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={s.label}>From Date</label>
            <input style={s.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>To Date</label>
            <input style={s.input} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <button style={s.btn} onClick={generatePDF} disabled={loading}>
          {loading ? "Generating PDF..." : "Download PDF Report"}
        </button>
      </div>
    </div>
  );
}
