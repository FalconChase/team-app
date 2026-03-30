import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TeamProvider } from "./contexts/TeamContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Projects from "./pages/Projects";
import Announcements from "./pages/Announcements";
import Members from "./pages/Members";
import Chat from "./pages/Chat";
import Records from "./pages/Records";
import Archive from "./pages/Archive";
import WeatherTool from "./pages/WeatherTool";
import { Setup, Pending, Settings, Reports } from "./pages/Misc";

function RequireAuth({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  // ✅ KEY FIX: Wait for auth + profile to fully load before any routing decision.
  // Without this, userProfile is null on first render and wrongly redirects to /setup.
  if (loading) return null;

  // Not logged in → login page
  if (!currentUser) return <Navigate to="/login" replace />;

  // Logged in but pending admin approval
  if (userProfile?.status === "pending") return <Navigate to="/pending" replace />;

  // Logged in, profile loaded, but no team yet → setup
  // Only triggers for brand new accounts that just registered
  if (userProfile && !userProfile.teamId) return <Navigate to="/setup" replace />;

  // ✅ Has teamId + active → always go straight to requested page, no detours
  return children;
}

function ProtectedPage({ children }) {
  return (
    <RequireAuth>
      <TeamProvider>
        <Layout>{children}</Layout>
      </TeamProvider>
    </RequireAuth>
  );
}

function AppRoutes() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={!currentUser ? <Login /> : <Navigate to="/" replace />}
      />
      <Route
        path="/setup"
        element={
          currentUser && userProfile && !userProfile.teamId
            ? <TeamProvider><Setup /></TeamProvider>
            : <Navigate to="/" replace />
        }
      />
      <Route
        path="/pending"
        element={
          currentUser && userProfile?.status === "pending"
            ? <Pending />
            : <Navigate to="/" replace />
        }
      />

      {/* Protected routes — existing users go straight here */}
      <Route path="/"              element={<ProtectedPage><Dashboard /></ProtectedPage>} />
      <Route path="/documents"     element={<ProtectedPage><Documents /></ProtectedPage>} />
      <Route path="/projects"      element={<ProtectedPage><Projects /></ProtectedPage>} />
      <Route path="/announcements" element={<ProtectedPage><Announcements /></ProtectedPage>} />
      <Route path="/members"       element={<ProtectedPage><Members /></ProtectedPage>} />
      <Route path="/chat"          element={<ProtectedPage><Chat /></ProtectedPage>} />
      <Route path="/records"       element={<ProtectedPage><Records /></ProtectedPage>} />
      <Route path="/archive"       element={<ProtectedPage><Archive /></ProtectedPage>} />
      <Route path="/weather-tool"  element={<ProtectedPage><WeatherTool /></ProtectedPage>} />
      <Route path="/settings"      element={<ProtectedPage><Settings /></ProtectedPage>} />
      <Route path="/reports"       element={<ProtectedPage><Reports /></ProtectedPage>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}