import { createContext, useContext, useEffect, useState } from "react";
import {
  doc, getDoc, setDoc, updateDoc, collection, query,
  where, onSnapshot, getDocs, serverTimestamp, addDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const TeamContext = createContext();
export const useTeam = () => useContext(TeamContext);

export function TeamProvider({ children }) {
  const { userProfile } = useAuth();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const unsub = onSnapshot(doc(db, "teams", userProfile.teamId), (snap) => {
      if (snap.exists()) setTeam({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!userProfile?.teamId) return;

    console.log("Querying with teamId:", userProfile.teamId);

    const q = query(
      collection(db, "users"),
      where("teamId", "==", userProfile.teamId),
      where("status", "==", "active")
    );

    const unsub = onSnapshot(q, (snap) => {
      console.log("Members found:", snap.docs.length);
      console.log("Members data:", snap.docs.map(d => d.data()));
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, [userProfile?.teamId]);

  useEffect(() => {
    if (!userProfile?.teamId || !isAdmin()) return;
    const q = query(collection(db, "users"), where("teamId", "==", userProfile.teamId), where("status", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userProfile?.teamId, userProfile?.role]);

  function isAdmin() {
    return userProfile?.role === "admin" || userProfile?.role === "manager" || userProfile?.role === "supervisor";
  }

  async function createTeam(teamName, departmentName) {
    // ✅ FIX: Never create a new team if user already has one
    if (userProfile?.teamId) {
      return userProfile.teamId;
    }
    const teamRef = await addDoc(collection(db, "teams"), {
      name: teamName,
      department: departmentName,
      createdAt: serverTimestamp(),
      createdBy: userProfile.uid,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    });
    await updateDoc(doc(db, "users", userProfile.uid), {
      teamId: teamRef.id,
      role: "admin",
      status: "active"
    });
    return teamRef.id;
  }

  async function approveRequest(userId) {
    await updateDoc(doc(db, "users", userId), {
      status: "active",
      teamId: userProfile.teamId  // ✅ FIX: Always ensure teamId is set on approval
    });
  }

  async function rejectRequest(userId) {
    await updateDoc(doc(db, "users", userId), { teamId: null, status: "rejected" });
  }

  async function removeMember(userId) {
    await updateDoc(doc(db, "users", userId), { teamId: null, status: "removed" });
  }

  async function grantAdmin(userId) {
    await updateDoc(doc(db, "users", userId), { role: "admin" });
  }

  async function revokeAdmin(userId) {
    await updateDoc(doc(db, "users", userId), { role: "member" });
  }

  async function updateTeamSettings(updates) {
    if (!userProfile?.teamId) return;
    await updateDoc(doc(db, "teams", userProfile.teamId), updates);
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
      updateTeamSettings, getTeamByInviteCode
    }}>
      {children}
    </TeamContext.Provider>
  );
}