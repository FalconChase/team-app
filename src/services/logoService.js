import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';

const LOGO_DOC = doc(db, 'appSettings', 'logo');

// Fetch the current global logo URL from Firestore
export async function fetchLogoUrl() {
  const snap = await getDoc(LOGO_DOC);
  if (snap.exists()) return snap.data().logoUrl || null;
  return null;
}

// Upload new logo to Firebase Storage, then save URL to Firestore
export async function uploadLogo(file, uid) {
  const storageRef = ref(storage, `appSettings/logo`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  await setDoc(LOGO_DOC, {
    logoUrl: downloadUrl,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
  return downloadUrl;
}