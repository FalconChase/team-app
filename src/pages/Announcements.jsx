import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#185fa5", wordBreak: "break-all" }}>{part}</a>
      : part
  );
}

export default function Announcements() {
  const { userProfile } = useAuth();
  const { isAdmin } = useTeam();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(collection(db, "announcements"), where("teamId", "==", userProfile.teamId), orderBy("pinned", "desc"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userProfile?.teamId]);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","application/pdf"];
    if (!allowed.includes(f.type)) {
      alert("Only images (JPG, PNG, GIF, WEBP) and PDF files are allowed.");
      e.target.value = ""; return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB.");
      e.target.value = ""; return;
    }
    setFile(f);
  }

  async function uploadFile(f) {
    const path = `announcements/${userProfile.teamId}/${Date.now()}_${f.name}`;
    const storageRef = ref(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, f);
      task.on("state_changed",
        snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path, name: f.name, type: f.type });
        }
      );
    });
  }

  async function post() {
    if (!text.trim() && !file) return;
    setLoading(true);
    let attachment = null;
    if (file) {
      setUploading(true);
      try {
        attachment = await uploadFile(file);
      } catch (e) {
        alert("File upload failed. Please try again.");
        setLoading(false); setUploading(false); return;
      }
      setUploading(false); setUploadProgress(0);
    }
    await addDoc(collection(db, "announcements"), {
      text: text.trim(), teamId: userProfile.teamId,
      authorId: userProfile.uid, authorName: userProfile.displayName,
      authorRole: userProfile.role, pinned: false,
      attachment: attachment || null,
      createdAt: serverTimestamp()
    });
    setText(""); setFile(null);
    const fi = document.getElementById("ann-file-input");
    if (fi) fi.value = "";
    setLoading(false);
  }

  async function togglePin(id, pinned) {
    await updateDoc(doc(db, "announcements", id), { pinned: !pinned });
  }

  async function remove(id, attachment) {
    if (!window.confirm("Remove this announcement?")) return;
    if (attachment?.path) {
      try { await deleteObject(ref(storage, attachment.path)); } catch (e) {}
    }
    await deleteDoc(doc(db, "announcements", id));
  }

  const roleColor = { admin: "#f0a500", manager: "#f0a500", supervisor: "#7ab3e0", member: "#a0b8c8" };
  const avatarColors = ["#e6f1fb","#eaf3de","#faeeda","#fcebeb","#e1f5ee","#f0e8fb"];
  const avatarText = ["#185fa5","#3b6d11","#854f0b","#a32d2d","#0f6e56","#5c2d96"];
  const initials = (name) => name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";
  const colorIdx = (name) => (name?.charCodeAt(0) || 0) % avatarColors.length;

  const s = {
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title: { fontSize: "18px", fontWeight: "600", color: "#1a3a5c" },
    composeBox: { background: "#fff", borderRadius: "8px", border: "0.5px solid #e0e8f0", padding: "16px", marginBottom: "20px" },
    textarea: { width: "100%", border: "1px solid #d0dde8", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", fontFamily: "Tahoma,Geneva,sans-serif", resize: "vertical", minHeight: "80px", boxSizing: "border-box", outline: "none", whiteSpace: "pre-wrap" },
    postBtn: { padding: "8px 20px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif" },
    card: { background: "#fff", borderRadius: "8px", border: "0.5px solid #e0e8f0", padding: "14px 16px", marginBottom: "10px" },
    pinnedCard: { background: "#fff", borderRadius: "8px", border: "1.5px solid #e6c94a", padding: "14px 16px", marginBottom: "10px" },
    avatar: (name) => ({ width: "32px", height: "32px", borderRadius: "50%", background: avatarColors[colorIdx(name)], color: avatarText[colorIdx(name)], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "600", flexShrink: 0 }),
    roleBadge: (role) => ({ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", background: roleColor[role] || "#ddd", color: role === "member" ? "#555" : "#fff", fontWeight: "600" }),
    body: { fontSize: "13px", color: "#333", lineHeight: "1.6", marginTop: "4px", whiteSpace: "pre-wrap" },
    actionBtn: { background: "none", border: "none", fontSize: "11px", color: "#888", cursor: "pointer", padding: "2px 6px", borderRadius: "4px", fontFamily: "Tahoma,Geneva,sans-serif" },
    pinBadge: { fontSize: "9px", background: "#faeeda", color: "#854f0b", padding: "2px 7px", borderRadius: "10px", fontWeight: "500" },
    empty: { textAlign: "center", padding: "40px", color: "#aaa", fontSize: "13px", background: "#fff", borderRadius: "8px", border: "0.5px solid #e0e8f0" },
    attachBtn: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #d0dde8", background: "#f8fafc", color: "#555", fontSize: "12px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif" },
    filePreview: { display: "flex", alignItems: "center", gap: "8px", background: "#f0f4f8", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: "#1a3a5c", marginTop: "8px" }
  };

  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>Announcements</div>
        <div style={{ fontSize: "12px", color: "#888" }}>Anyone can post</div>
      </div>

      <div style={s.composeBox}>
        <textarea style={s.textarea} value={text} onChange={e => setText(e.target.value)} placeholder="Write an announcement for the whole team..." onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) post(); }} />
        {file && (
          <div style={s.filePreview}>
            <span>{file.type.startsWith("image/") ? "🖼️" : "📄"}</span>
            <span style={{ flex: 1 }}>{file.name}</span>
            <button style={{ background: "none", border: "none", color: "#e24b4a", cursor: "pointer", fontSize: "13px" }} onClick={() => { setFile(null); document.getElementById("ann-file-input").value = ""; }}>✕</button>
          </div>
        )}
        {uploading && (
          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Uploading... {uploadProgress}%</div>
            <div style={{ height: "4px", background: "#e0e8f0", borderRadius: "4px" }}>
              <div style={{ height: "4px", background: "#1a3a5c", borderRadius: "4px", width: `${uploadProgress}%`, transition: "width 0.2s" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={s.attachBtn}>
              📎 Attach
              <input id="ann-file-input" type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileChange} />
            </label>
            <span style={{ fontSize: "10px", color: "#aaa" }}>Images or PDF only · Max 10MB</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", color: "#aaa" }}>Ctrl+Enter to post</span>
            <button style={s.postBtn} onClick={post} disabled={loading || uploading || (!text.trim() && !file)}>{loading ? "Posting..." : "Post Announcement"}</button>
          </div>
        </div>
      </div>

      {posts.length === 0 && <div style={s.empty}>No announcements yet. Be the first to post!</div>}

      {posts.map(p => (
        <div key={p.id} style={p.pinned ? s.pinnedCard : s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={s.avatar(p.authorName)}>{initials(p.authorName)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1a3a5c" }}>{p.authorName}</span>
                <span style={s.roleBadge(p.authorRole)}>{p.authorRole}</span>
                {p.pinned && <span style={s.pinBadge}>Pinned</span>}
              </div>
              <div style={{ fontSize: "11px", color: "#aaa" }}>
                {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
              </div>
            </div>
            {(isAdmin() || p.authorId === userProfile?.uid) && (
              <div style={{ display: "flex", gap: "4px" }}>
                {isAdmin() && <button style={s.actionBtn} onClick={() => togglePin(p.id, p.pinned)}>{p.pinned ? "Unpin" : "Pin"}</button>}
                {(isAdmin() || p.authorId === userProfile?.uid) && <button style={{ ...s.actionBtn, color: "#e24b4a" }} onClick={() => remove(p.id, p.attachment)}>Remove</button>}
              </div>
            )}
          </div>
          {p.text ? <div style={s.body}>{linkify(p.text)}</div> : null}
          {p.attachment && (
            <div style={{ marginTop: "10px" }}>
              {p.attachment.type?.startsWith("image/") ? (
                <a href={p.attachment.url} target="_blank" rel="noopener noreferrer">
                  <img src={p.attachment.url} alt={p.attachment.name} style={{ maxWidth: "100%", maxHeight: "320px", borderRadius: "8px", border: "0.5px solid #e0e8f0", objectFit: "contain", display: "block" }} />
                </a>
              ) : (
                <a href={p.attachment.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#f0f4f8", borderRadius: "6px", fontSize: "12px", color: "#1a3a5c", textDecoration: "none", border: "0.5px solid #e0e8f0" }}>
                  📄 {p.attachment.name}
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}