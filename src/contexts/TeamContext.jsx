import { createContext, useContext, useEffect, useState } from "react";
import {
  doc, updateDoc, collection, query,
  where, onSnapshot, getDocs, serverTimestamp, addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { logAction } from "../utils/logAction";

const TeamContext = createContext();
export const useTeam = () => useContext(TeamContext);

export function TeamProvider({ children }) {
  const { userProfile } = useAuth();
  const [team,            setTeam]            = useState(null);
  const [members,         setMembers]         = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Derive admin flag from userProfile directly — stable, no function reference
  const adminRoles = ["admin", "manager", "supervisor"];
  const userIsAdmin = adminRoles.includes(userProfile?.role);

  function isAdmin() {
    return adminRoles.includes(userProfile?.role);
  }

  // ── Team listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.teamId) return;
    const unsub = onSnapshot(doc(db, "teams", userProfile.teamId), (snap) => {
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [userProfile?.teamId]);

  // ── Active members listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(
      collection(db, "users"),
      where("teamId", "==", userProfile.teamId),
      where("status", "==", "active")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userProfile?.teamId]);

  // ── Pending requests listener (admin only) ─────────────────────────────────
  // Use the stable `userIsAdmin` boolean instead of calling isAdmin() in deps
  useEffect(() => {
    if (!userProfile?.teamId || !userIsAdmin) return;
    const q = query(
      collection(db, "users"),
      where("teamId", "==", userProfile.teamId),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userProfile?.teamId, userIsAdmin]);

  // ── Team actions ───────────────────────────────────────────────────────────
  async function createTeam(teamName, departmentName) {
    if (userProfile?.teamId) return userProfile.teamId;
    const teamRef = await addDoc(collection(db, "teams"), {
      name: teamName,
      department: departmentName,
      createdAt: serverTimestamp(),
      createdBy: userProfile.uid,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
    });
    await updateDoc(doc(db, "users", userProfile.uid), {
      teamId: teamRef.id,
      role: "admin",
      status: "active",
    });
    return teamRef.id;
  }

  async function approveRequest(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const targetName = userSnap.exists() ? userSnap.data().displayName : "Unknown";
    await updateDoc(doc(db, "users", userId), {
      status: "active",
      teamId: userProfile.teamId  // ✅ FIX: Always ensure teamId is set on approval
    });
    await logAction({
      teamId: userProfile.teamId,
      action: "Approved join request",
      category: "member",
      performedBy: userProfile.displayName || userProfile.email,
      targetName,
    });
  }

  async function rejectRequest(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const targetName = userSnap.exists() ? userSnap.data().displayName : "Unknown";
    await updateDoc(doc(db, "users", userId), { teamId: null, status: "rejected" });
    await logAction({
      teamId: userProfile.teamId,
      action: "Rejected join request",
      category: "member",
      performedBy: userProfile.displayName || userProfile.email,
      targetName,
    });
  }

  async function removeMember(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const targetName = userSnap.exists() ? userSnap.data().displayName : "Unknown";
    await updateDoc(doc(db, "users", userId), { teamId: null, status: "removed" });
    await logAction({
      teamId: userProfile.teamId,
      action: "Removed member from team",
      category: "member",
      performedBy: userProfile.displayName || userProfile.email,
      targetName,
    });
  }

  async function grantAdmin(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const targetName = userSnap.exists() ? userSnap.data().displayName : "Unknown";
    await updateDoc(doc(db, "users", userId), { role: "admin" });
    await logAction({
      teamId: userProfile.teamId,
      action: "Promoted to Admin",
      category: "member",
      performedBy: userProfile.displayName || userProfile.email,
      targetName,
    });
  }

  async function revokeAdmin(userId) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const targetName = userSnap.exists() ? userSnap.data().displayName : "Unknown";
    await updateDoc(doc(db, "users", userId), { role: "member" });
    await logAction({
      teamId: userProfile.teamId,
      action: "Demoted to Member",
      category: "member",
      performedBy: userProfile.displayName || userProfile.email,
      targetName,
    });
  }

  async function updateTeamSettings(updates, logMessage = null) {
    if (!userProfile?.teamId) return;
    await updateDoc(doc(db, "teams", userProfile.teamId), updates);
    if (logMessage) {
      await logAction({
        teamId: userProfile.teamId,
        action: logMessage,
        category: "settings",
        performedBy: userProfile.displayName || userProfile.email,
      });
    }
  }

  async function getTeamByInviteCode(code) {
    const q = query(collection(db, "teams"), where("inviteCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  return (
    <TeamContext.Provider value={{
      team, members, pendingRequests, isAdmin,
      createTeam, approveRequest, rejectRequest,
      removeMember, grantAdmin, revokeAdmin,
      updateTeamSettings, getTeamByInviteCode,
    }}>
      {children}
    </TeamContext.Provider>
  );
}