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
  { path: "/logbook",     label: "Logbook",      icon: "📋" },
];

export default function Layout({ children }) {
  const { userProfile, logout } = useAuth();
  const { team, pendingRequests, isAdmin, viewingTeamId, isGuestView, guestPermissions, guestTeamsList, setViewingTeam } = useTeam();
  const navigate = useNavigate();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebarOpen") !== "false");

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const roleColor = { owner: "#f0a500", admin: "#f0a500", manager: "#f0a500", supervisor: "#7ab3e0", member: "#aaa" };
  const roleLabel = { owner: "Admin I", admin: "Admin", manager: "Manager", supervisor: "Supervisor", member: "Member" };

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

  // The team shown in the sidebar header — own team or the guest team being viewed
  const displayTeam = isGuestView
    ? guestTeamsList.find(t => t.teamId === viewingTeamId)
    : team;

  // Nav items visible in the current view
  const TAB_TO_PATH = { records: "/records", projects: "/projects", logbook: "/logbook", documents: "/documents", announcements: "/announcements", members: "/members", chat: "/chat" };
  const visibleNav = isGuestView
    ? NAV.filter(n => {
        if (n.path === "/") return true; // Dashboard always visible
        const tab = Object.entries(TAB_TO_PATH).find(([, p]) => p === n.path)?.[0];
        return tab && (guestPermissions?.allowedTabs || []).includes(tab);
      })
    : NAV;

  return (
    <div style={s.shell}>

      {/* ── Sidebar ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <div style={s.logo}>
            TEAM APP
            <span style={s.logosub}>{displayTeam?.department || "Loading..."} — {displayTeam?.name || ""}</span>
          </div>

          {/* ── Team switcher (only when guest links exist) ── */}
          {(guestTeamsList.length > 0) && (
            <div style={{ position: "relative", marginTop: "10px" }}>
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                style={{
                  width: "100%", background: isGuestView ? "rgba(55,138,221,0.2)" : "rgba(255,255,255,0.08)",
                  border: isGuestView ? "1px solid rgba(55,138,221,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "6px", padding: "6px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  color: "#fff", fontSize: "11px", fontFamily: "Tahoma,Geneva,sans-serif",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isGuestView
                    ? (displayTeam?.department || "Guest View")
                    : (team?.department || "Home")}
                </span>
                <span style={{ marginLeft: "6px", opacity: 0.7 }}>▾</span>
              </button>

              {switcherOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "#1a3a5c", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)", zIndex: 300, overflow: "hidden",
                }}>
                  {/* Own team */}
                  <button
                    onClick={() => { setViewingTeam(team?.id || userProfile?.teamId); setSwitcherOpen(false); }}
                    style={{
                      width: "100%", padding: "9px 12px", background: !isGuestView ? "rgba(55,138,221,0.2)" : "transparent",
                      border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: "#fff", fontSize: "11px", fontFamily: "Tahoma,Geneva,sans-serif",
                      cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "8px",
                    }}
                  >
                    <span style={{ opacity: !isGuestView ? 1 : 0 }}>✓</span>
                    <span>
                      <span style={{ display: "block", fontWeight: "600" }}>{team?.department || "Home"}</span>
                      <span style={{ fontSize: "10px", opacity: 0.6 }}>Your team</span>
                    </span>
                  </button>

                  {/* Guest teams */}
                  {guestTeamsList.map(gt => (
                    <button
                      key={gt.teamId}
                      onClick={() => { setViewingTeam(gt.teamId); setSwitcherOpen(false); }}
                      style={{
                        width: "100%", padding: "9px 12px",
                        background: viewingTeamId === gt.teamId ? "rgba(55,138,221,0.2)" : "transparent",
                        border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)",
                        color: "#fff", fontSize: "11px", fontFamily: "Tahoma,Geneva,sans-serif",
                        cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "8px",
                      }}
                    >
                      <span style={{ opacity: viewingTeamId === gt.teamId ? 1 : 0 }}>✓</span>
                      <span>
                        <span style={{ display: "block", fontWeight: "600" }}>{gt.department}</span>
                        <span style={{ fontSize: "10px", opacity: 0.6 }}>Guest access</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Guest view indicator strip ── */}
          {isGuestView && (
            <div style={{
              marginTop: "8px", background: "rgba(55,138,221,0.15)",
              borderRadius: "5px", padding: "4px 8px",
              fontSize: "10px", color: "#7ab3e0", letterSpacing: "0.3px",
            }}>
              {guestPermissions?.canEdit ? "👁 Guest — limited edit" : "👁 Guest — read only"}
            </div>
          )}
        </div>

        <nav style={s.navList}>
          {visibleNav.map(n => (
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
              {n.path === "/members" && isAdmin() && !isGuestView && pendingRequests.length > 0 && (
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