import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Writes a single log entry to the teamLogs collection.
 * Fails silently — a log failure should never break the action that triggered it.
 */
export async function logAction({ teamId, action, category, performedBy, targetName = null }) {
  if (!teamId || !action || !performedBy) return;
  try {
    await addDoc(collection(db, "teamLogs"), {
      teamId,
      action,
      category,
      performedBy,
      targetName,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("logAction failed:", err);
  }
}