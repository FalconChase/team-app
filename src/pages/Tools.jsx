export default function Tools() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px", color: "#1a3a5c" }}>Tools</h2>
      <iframe
        src="https://weather-tool.web.app"
        title="Weather Tool"
        style={{ flex: 1, border: "1px solid #dde4ed", borderRadius: "8px", background: "#fff" }}
      />
    </div>
  );
}