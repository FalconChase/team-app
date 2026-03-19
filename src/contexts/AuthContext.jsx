import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs,
  updateDoc, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const toEmail = (username) => `${username.toLowerCase().trim()}@teamapp.internal`;

  async function register(username, password, displayName, teamId) {
    await setPersistence(auth, browserLocalPersistence);
    const email = toEmail(username);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      username: username.toLowerCase().trim(),
      displayName,
      email,
      role: "member",
      teamId: teamId || null,
      status: teamId ? "pending" : "active",
      createdAt: serverTimestamp(),
      profilePhoto: null,
      contactInfo: "",
      designation: ""
    });
    return cred;
  }

  async function login(username, password) {
    await setPersistence(auth, browserLocalPersistence);
    const email = toEmail(username);
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      setUserProfile(data);
      return data;
    }
    return null;
  }

  async function checkUsernameAvailable(username) {
    const q = query(collection(db, "users"), where("username", "==", username.toLowerCase().trim()));
    const snap = await getDocs(q);
    return snap.empty;
  }

  async function updateUserProfile(uid, updates) {
    await updateDoc(doc(db, "users", uid), updates);
    if (currentUser?.uid === uid) {
      setUserProfile(prev => ({ ...prev, ...updates }));
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) await fetchUserProfile(user.uid);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    fetchUserProfile,
    checkUsernameAvailable,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
