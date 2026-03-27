import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Tools() {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(
          collection(db, "teams", userProfile.teamId, "projects")
        );
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProjects(list);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();
  }, [userProfile?.teamId]);

  const handleSelect = (e) => {
    const contractId = e.target.value;
    setSelectedId(contractId);

    if (!contractId) return;

    const project = projects.find((p) => p.contractId === contractId);
    if (!project || !iframeRef.current) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "PROJECT_AUTOFILL",
        contractId: project.contractId,
        projectName: project.projectName,
        contractor: project.contractor,
        location: project.location,
      },
      "https://weather-tool.web.app"
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px", color: "#1a3a5c" }}>Tools</h2>

      {/* Project selector */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
        padding: "10px 14px",
        background: "#f0f4f9",
        borderRadius: "8px",
        border: "1px solid #dde4ed",
      }}>
        <label style={{ fontSize: "13px", fontWeight: 600, color: "#1a3a5c", whiteSpace: "nowrap" }}>
          Auto-fill Project:
        </label>
        <select
          value={selectedId}
          onChange={handleSelect}
          style={{
            flex: 1,
            padding: "7px 10px",
            fontSize: "13px",
            border: "1px solid #c5d0de",
            borderRadius: "6px",
            background: "#fff",
            color: "#1a3a5c",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">— Select a project to auto-fill —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.contractId}>
              {p.contractId} — {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* Weather tool iframe */}
      <iframe
        ref={iframeRef}
        src="https://weather-tool.web.app"
        title="Weather Tool"
        style={{ flex: 1, border: "1px solid #dde4ed", borderRadius: "8px", background: "#fff" }}
      />
    </div>
  );
}