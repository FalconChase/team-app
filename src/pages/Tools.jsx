import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Tools() {
  const { userProfile } = useAuth();
  const teamId = userProfile?.teamId;
  const iframeRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    async function fetchProjects() {
      try {
        const q = query(
          collection(db, "teams", teamId, "projects"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setProjects(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching projects:", err);
      }
    }
    fetchProjects();
  }, [teamId]);

  // Listen for the iframe signalling it's ready to receive messages
  useEffect(() => {
    function handleMessage(e) {
      if (e.origin !== "https://weather-tool.web.app") return;
      if (e.data === "WEATHER_TOOL_READY") setIframeReady(true);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send data whenever selection changes and iframe is ready
  useEffect(() => {
    if (!selectedId || !iframeReady || !iframeRef.current) return;
    const project = projects.find((p) => p.projectId === selectedId);
    if (!project) return;

    const payload = {
      type: "FILL_CONTRACT_INFO",
      contractId: project.projectId || "",
      projectName: project.projectName || "",
      contractor: project.contractor || "",
    };

    iframeRef.current.contentWindow.postMessage(
      payload,
      "https://weather-tool.web.app"
    );
  }, [selectedId, iframeReady, projects]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#1a3a5c" }}>Tools</h2>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            padding: "6px 10px", borderRadius: "6px",
            border: "1px solid #dde4ed", fontSize: "13px",
            color: "#1a3a5c", background: "#fff", cursor: "pointer",
          }}
        >
          <option value="">— Select a Project —</option>
          {projects.map((p) => (
            <option key={p.docId} value={p.projectId}>
              {p.projectId}{p.projectName ? ` · ${p.projectName}` : ""}
            </option>
          ))}
        </select>
      </div>
      <iframe
        ref={iframeRef}
        src="https://weather-tool.web.app"
        title="Weather Tool"
        style={{ flex: 1, border: "1px solid #dde4ed", borderRadius: "8px", background: "#fff" }}
      />
    </div>
  );
}