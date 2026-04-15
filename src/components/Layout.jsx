import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

const NAV = [
  { path: "/", label: "Dashboard", icon: "⊞" },
  { path: "/documents", label: "Documents", icon: "📄" },
  { path: "/records", label: "Records", icon: "🗂️" },
  { path: "/projects", label: "Projects", icon: "🏗️" },
  { path: "/announcements", label: "Announcements", icon: "📢" },
  { path: "/members", label: "Members", icon: "👥" },
  { path: "/chat", label: "Group Chat", icon: "💬" },
  { path: "/weather-tool", label: "Weather Tool", icon: "🌤️" },
];

export default function Layout({ children }) {
  const { userProfile, logout } = useAuth();
  const { team, pendingRequests, isAdmin } = useTeam();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebarOpen") !== "false");

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const roleColor = { owner: "#f0a500", admin: "#f0a500", manager: "#f0a500", supervisor: "#7ab3e0", member: "#aaa" };
  const roleLabel = { owner: "Admin", admin: "Admin", manager: "Manager", supervisor: "Supervisor", member: "Member" };

  const s = {
    shell: { display: "flex", flexDirection: "row", minHeight: "100vh", fontFamily: "Tahoma, Geneva, sans-serif", background: "#f4f6f9" },

    // ── Sidebar ──────────────────────────────────────────────────────────
    sidebar: { width: sidebarOpen ? "200px" : "0px", minWidth: sidebarOpen ? "200px" : "0px", background: "#0f2440", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", zIndex: 100, boxSizing: "border-box", overflow: "hidden", transition: "width 0.22s ease, min-width 0.22s ease" },
    sidebarHeader: { padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", minWidth: "200px" },
    logo: { color: "#fff", fontSize: "13px", fontWeight: "600", letterSpacing: "1.5px", whiteSpace: "nowrap" },
    logosub: { color: "#7ab3e0", fontSize: "9px", display: "block", fontWeight: "400", letterSpacing: "0.3px", marginTop: "2px", whiteSpace: "nowrap" },
    navList: { flex: 1, padding: "8px 0", overflowY: "auto", minWidth: "200px" },
    navLink: { color: "rgba(255,255,255,0.55)", fontSize: "12px", padding: "9px 16px", textDecoration: "none", display: "flex", alignItems: "center", gap: "9px", whiteSpace: "nowrap", transition: "color 0.15s, background 0.15s", borderLeft: "3px solid transparent", boxSizing: "border-box" },
    pendingBadge: { background: "#e24b4a", color: "#fff", fontSize: "9px", borderRadius: "50%", width: "16px", height: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: "auto" },

    // ── Right column (topbar + main) ─────────────────────────────────────
    rightCol: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
    topbar: { background: "#1a3a5c", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: "52px", position: "sticky", top: 0, zIndex: 99 },
    topLeft: { display: "flex", alignItems: "center", gap: "12px" },
    toggleBtn: { background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", justifyContent: "center" },
    toggleBar: { width: "18px", height: "2px", background: "rgba(255,255,255,0.7)", borderRadius: "2px", display: "block", transition: "background 0.15s" },
    divisionLabel: { color: "#7ab3e0", fontSize: "11px", letterSpacing: "0.4px", whiteSpace: "nowrap" },
    topRight: { display: "flex", alignItems: "center", gap: "12px" },
    userChip: { display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.12)", borderRadius: "20px", padding: "4px 12px 4px 4px", cursor: "pointer", position: "relative" },
    avatar: { width: "28px", height: "28px", borderRadius: "50%", background: "#7ab3e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", color: "#1a3a5c" },
    userName: { color: "#fff", fontSize: "12px" },
    rolePill: { fontSize: "9px", padding: "2px 7px", borderRadius: "10px", fontWeight: "600" },
    main: { flex: 1, padding: "20px", maxWidth: "1100px", width: "100%", margin: "0 auto", boxSizing: "border-box" },
    dropdown: { position: "absolute", top: "36px", right: 0, background: "#fff", borderRadius: "8px", border: "1px solid #e0e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: "160px", zIndex: 200 },
    dropItem: { padding: "10px 16px", fontSize: "12px", color: "#1a3a5c", cursor: "pointer", display: "block", width: "100%", textAlign: "left", background: "none", border: "none", fontFamily: "Tahoma, Geneva, sans-serif" }
  };

  const initials = userProfile?.displayName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div style={s.shell}>

      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.logo}>
            TEAM APP
            <span style={s.logosub}>{team?.department || "Loading..."} — {team?.name || ""}</span>
          </div>
        </div>
        <nav style={s.navList}>
          {NAV.map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              end={n.path === "/"}
              style={({ isActive }) => ({
                ...s.navLink,
                color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                borderLeftColor: isActive ? "#378ADD" : "transparent",
                background: isActive ? "rgba(55,138,221,0.12)" : "transparent",
              })}
            >
              <span style={{ fontSize: "14px" }}>{n.icon}</span>
              {n.label}
              {n.path === "/members" && isAdmin() && pendingRequests.length > 0 && (
                <span style={s.pendingBadge}>{pendingRequests.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Right column ── */}
      <div style={s.rightCol}>

        {/* Slim topbar */}
        <div style={s.topbar}>
          <div style={s.topLeft}>
            {/* Hamburger toggle */}
            <button style={s.toggleBtn} onClick={() => setSidebarOpen(o => { localStorage.setItem("sidebarOpen", !o); return !o; })} title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
              <span style={s.toggleBar} />
              <span style={s.toggleBar} />
              <span style={s.toggleBar} />
            </button>
            <span style={s.divisionLabel}>CD — ALA</span>
          </div>

          <div style={s.topRight}>
            {isAdmin() && pendingRequests.length > 0 && (
              <div style={{ fontSize: "11px", background: "#e24b4a", color: "#fff", borderRadius: "12px", padding: "3px 10px", cursor: "pointer" }} onClick={() => navigate("/members")}>
                {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}
              </div>
            )}
            <div style={{ position: "relative" }}>
              <div style={s.userChip} onClick={() => setMenuOpen(o => !o)}>
                <div style={s.avatar}>{initials}</div>
                <span style={s.userName}>{userProfile?.displayName?.split(" ")[0] || "User"}</span>
                <span style={{ ...s.rolePill, background: roleColor[userProfile?.role] || "#aaa", color: userProfile?.role === "member" ? "#333" : "#fff" }}>
                  {roleLabel[userProfile?.role] || "Member"}
                </span>
              </div>
              {menuOpen && (
                <div style={s.dropdown} onClick={() => setMenuOpen(false)}>
                  <div style={{ padding: "10px 16px 6px", borderBottom: "1px solid #eee" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#1a3a5c" }}>{userProfile?.displayName}</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>@{userProfile?.username}</div>
                  </div>
                  <button style={s.dropItem} onClick={() => navigate(`/members/${userProfile?.uid}`)}>My Profile & Files</button>
                  {isAdmin() && <button style={s.dropItem} onClick={() => navigate("/settings")}>Team Settings</button>}
                  <button style={{ ...s.dropItem, color: "#a32d2d", borderTop: "1px solid #eee" }} onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main style={s.main}>{children}</main>
      </div>

    </div>
  );
}