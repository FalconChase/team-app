import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

const avatarColors = ["#e6f1fb","#eaf3de","#faeeda","#fcebeb","#e1f5ee","#f0e8fb"];
const avatarText   = ["#185fa5","#3b6d11","#854f0b","#a32d2d","#0f6e56","#5c2d96"];
const colorIdx = (name) => (name?.charCodeAt(0) || 0) % avatarColors.length;
const initials = (name) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

function MemberFiles({ member, isOwner }) {
  const [folders,        setFolders]        = useState([]);
  const [newFolder,      setNewFolder]      = useState("");
  const [openFolder,     setOpenFolder]     = useState(null);
  const [folderFiles,    setFolderFiles]    = useState({});
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "memberFiles"), where("ownerId", "==", member.uid), where("type", "==", "folder"));
    return onSnapshot(q, snap => setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [member.uid]);

  useEffect(() => {
    if (!openFolder) return;
    const q = query(collection(db, "memberFiles"), where("ownerId", "==", member.uid), where("type", "==", "file"), where("folderId", "==", openFolder.id));
    return onSnapshot(q, snap => {
      setFolderFiles(prev => ({ ...prev, [openFolder.id]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    });
  }, [openFolder, member.uid]);

  async function createFolder() {
    if (!newFolder.trim()) return;
    await addDoc(collection(db, "memberFiles"), {
      ownerId: member.uid, name: newFolder.trim(), type: "folder",
      createdAt: serverTimestamp()
    });
    setNewFolder("");
  }

  async function deleteFolder(id) {
    if (!window.confirm("Delete this folder and all its files?")) return;
    const files = folderFiles[id] || [];
    for (const f of files) {
      if (f.storagePath) { try { await deleteObject(ref(storage, f.storagePath)); } catch (e) {} }
      await deleteDoc(doc(db, "memberFiles", f.id));
    }
    await deleteDoc(doc(db, "memberFiles", id));
    if (openFolder?.id === id) setOpenFolder(null);
  }

  async function handleFileUpload(e) {
    const f = e.target.files[0];
    if (!f || !openFolder) return;
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","application/pdf",
      "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain"];
    if (!allowed.includes(f.type)) { alert("Allowed: Images, PDF, Word, Excel, and text files."); e.target.value = ""; return; }
    if (f.size > 20 * 1024 * 1024) { alert("File must be under 20MB."); e.target.value = ""; return; }
    setUploading(true); setUploadProgress(0);
    const path = `memberFiles/${member.uid}/${openFolder.id}/${Date.now()}_${f.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, f);
    task.on("state_changed",
      snap => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      () => { alert("Upload failed."); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, "memberFiles"), {
          ownerId: member.uid, folderId: openFolder.id, type: "file",
          name: f.name, fileType: f.type, url, storagePath: path,
          size: f.size, createdAt: serverTimestamp()
        });
        setUploading(false); setUploadProgress(0); e.target.value = "";
      }
    );
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    if (file.storagePath) { try { await deleteObject(ref(storage, file.storagePath)); } catch (e) {} }
    await deleteDoc(doc(db, "memberFiles", file.id));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function fileIcon(type) {
    if (type?.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type?.includes("word")) return "📝";
    if (type?.includes("excel") || type?.includes("sheet")) return "📊";
    return "📎";
  }

  const s = {
    folderGrid:   { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" },
    folder:       { background: "var(--bg-secondary)", border: "0.5px solid var(--border-main)", borderRadius: "8px", padding: "14px", minWidth: "110px", textAlign: "center", cursor: "pointer", position: "relative" },
    folderActive: { background: "var(--primary-light)", border: "1.5px solid var(--primary)", borderRadius: "8px", padding: "14px", minWidth: "110px", textAlign: "center", cursor: "pointer", position: "relative" },
    folderIcon:   { fontSize: "28px", marginBottom: "4px" },
    folderName:   { fontSize: "11px", color: "var(--text-primary)", wordBreak: "break-word" },
    addRow:       { display: "flex", gap: "8px", marginTop: "8px" },
    input:        { flex: 1, padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", fontSize: "12px", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-input)", color: "var(--text-primary)" },
    btn:          { padding: "7px 14px", borderRadius: "6px", background: "var(--primary)", color: "#fff", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
    fileRow:      { display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "6px", border: "0.5px solid var(--border-main)", background: "var(--bg-card)", marginBottom: "6px" },
    uploadBtn:    { display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border-input)", background: "var(--bg-hover)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)" },
  };

  const currentFiles = openFolder ? (folderFiles[openFolder.id] || []) : [];

  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "10px" }}>
        {isOwner ? "My Files" : `${member.displayName.split(" ")[0]}'s Files`}
        {!isOwner && <span style={{ fontSize: "10px", color: "var(--text-disabled)", fontWeight: "400", marginLeft: "8px" }}>View only</span>}
      </div>

      <div style={s.folderGrid}>
        {folders.map(f => (
          <div key={f.id} style={openFolder?.id === f.id ? s.folderActive : s.folder}
            onClick={() => setOpenFolder(openFolder?.id === f.id ? null : f)}>
            <div style={s.folderIcon}>📁</div>
            <div style={s.folderName}>{f.name}</div>
            {isOwner && (
              <button
                style={{ position: "absolute", top: "4px", right: "6px", background: "none", border: "none", fontSize: "11px", color: "var(--danger)", cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); deleteFolder(f.id); }}>✕</button>
            )}
          </div>
        ))}
        {folders.length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--text-disabled)", padding: "8px" }}>No folders yet.</div>
        )}
      </div>

      {openFolder && (
        <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "12px", marginBottom: "12px", border: "0.5px solid var(--border-main)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>📁 {openFolder.name}</div>
            {isOwner && (
              <label style={s.uploadBtn}>
                ⬆️ Upload File
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {uploading && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Uploading... {uploadProgress}%</div>
              <div style={{ height: "4px", background: "var(--border-light)", borderRadius: "4px" }}>
                <div style={{ height: "4px", background: "var(--primary)", borderRadius: "4px", width: `${uploadProgress}%`, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {currentFiles.length === 0 && !uploading && (
            <div style={{ fontSize: "12px", color: "var(--text-disabled)", textAlign: "center", padding: "16px" }}>
              {isOwner ? "No files yet. Click Upload File to add files." : "No files in this folder."}
            </div>
          )}

          {currentFiles.map(f => (
            <div key={f.id} style={s.fileRow}>
              <span style={{ fontSize: "18px" }}>{fileIcon(f.fileType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.name}
                </a>
                <div style={{ fontSize: "10px", color: "var(--text-disabled)" }}>{formatSize(f.size)}</div>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "11px", color: "var(--text-secondary)", padding: "3px 8px", border: "0.5px solid var(--border-main)", borderRadius: "4px", textDecoration: "none", background: "var(--bg-card)" }}>
                Open
              </a>
              {isOwner && (
                <button style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "13px" }}
                  onClick={() => deleteFile(f)}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div style={s.addRow}>
          <input style={s.input} value={newFolder} onChange={e => setNewFolder(e.target.value)}
            placeholder="New folder name..." onKeyDown={e => e.key === "Enter" && createFolder()} />
          <button style={s.btn} onClick={createFolder}>+ Add Folder</button>
        </div>
      )}
    </div>
  );
}

export default function Members() {
  const { userProfile, updateUserProfile } = useAuth();
  const { members, pendingRequests, isAdmin, approveRequest, rejectRequest, removeMember, grantAdmin, revokeAdmin, team } = useTeam();
  const [selected, setSelected] = useState(null);

  const s = {
    page:         { fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", padding: "20px" },
    header:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
    title:        { fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" },
    sectionLabel: { fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: "500", marginTop: "20px" },
    grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" },
    card:         { background: "var(--bg-card)", borderRadius: "8px", border: "0.5px solid var(--border-main)", padding: "16px", cursor: "pointer", transition: "box-shadow 0.15s" },
    avatar:       (name, large) => ({
      width: large ? "48px" : "36px", height: large ? "48px" : "36px",
      borderRadius: "50%",
      background: avatarColors[colorIdx(name)],
      color: avatarText[colorIdx(name)],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: large ? "16px" : "13px", fontWeight: "600", flexShrink: 0,
    }),
    rolePill: (role) => ({
      fontSize: "9px", padding: "2px 7px", borderRadius: "10px", fontWeight: "600",
      background: role === "admin" || role === "manager" ? "#faeeda" : role === "supervisor" ? "#e6f1fb" : "var(--bg-secondary)",
      color:      role === "admin" || role === "manager" ? "#854f0b" : role === "supervisor" ? "#185fa5" : "var(--text-muted)",
    }),
    modal:        { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" },
    modalBox:     { background: "var(--bg-card)", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "520px", marginTop: "20px", border: "1px solid var(--border-main)", boxShadow: "var(--shadow-lg)" },
    btn:          (primary, danger) => ({
      padding: "7px 14px", borderRadius: "6px",
      border:      danger ? "1px solid var(--danger)" : primary ? "none" : "1px solid var(--primary)",
      background:  danger ? "transparent"             : primary ? "var(--primary)" : "transparent",
      color:       danger ? "var(--danger)"            : primary ? "#fff"          : "var(--primary)",
      fontSize: "12px", cursor: "pointer",
      fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)",
    }),
    pendingCard:  { background: "var(--bg-card)", border: "0.5px solid var(--border-main)", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" },
    infoBox:      { background: "var(--bg-secondary)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px" },
    editBox:      { background: "var(--bg-secondary)", borderRadius: "8px", padding: "12px", marginBottom: "16px" },
    editInput:    { width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--border-input)", fontSize: "12px", fontFamily: "var(--font-family, Tahoma, Geneva, sans-serif)", boxSizing: "border-box", marginBottom: "8px", background: "var(--bg-input)", color: "var(--text-primary)" },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Team Members</div>
        {isAdmin() && (
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Share invite code:{" "}
            <strong style={{ background: "var(--primary-light)", color: "var(--primary)", padding: "2px 8px", borderRadius: "4px", letterSpacing: "1px" }}>
              {team?.inviteCode || "—"}
            </strong>
          </div>
        )}
      </div>

      {isAdmin() && pendingRequests.length > 0 && (
        <>
          <div style={s.sectionLabel}>Pending Join Requests</div>
          {pendingRequests.map(r => (
            <div key={r.id} style={s.pendingCard}>
              <div style={s.avatar(r.displayName, false)}>{initials(r.displayName)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{r.displayName}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>@{r.username}</div>
              </div>
              <button style={s.btn(true,  false)} onClick={() => approveRequest(r.id)}>Approve</button>
              <button style={s.btn(false, true)}  onClick={() => rejectRequest(r.id)}>Reject</button>
            </div>
          ))}
        </>
      )}

      <div style={s.sectionLabel}>Active Members — {members.length}</div>
      <div style={s.grid}>
        {members.map(m => (
          <div key={m.uid} style={s.card} onClick={() => setSelected(m)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={s.avatar(m.displayName, false)}>{initials(m.displayName)}</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{m.displayName}</div>
                <span style={s.rolePill(m.role)}>{m.role}</span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.designation || "No designation set"}</div>
            <div style={{ fontSize: "11px", color: "var(--text-disabled)", marginTop: "4px" }}>{m.contactInfo || "No contact info"}</div>
            {m.uid === userProfile?.uid && (
              <div style={{ fontSize: "10px", color: "var(--accent)", marginTop: "6px" }}>This is you</div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={s.modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={s.avatar(selected.displayName, true)}>{initials(selected.displayName)}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>{selected.displayName}</div>
                  <span style={s.rolePill(selected.role)}>{selected.role}</span>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>@{selected.username}</div>
                </div>
              </div>
              <button style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={s.infoBox}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Designation: </span>
                <span style={{ color: "var(--text-primary)" }}>{selected.designation || "—"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Contact: </span>
                <span style={{ color: "var(--text-primary)" }}>{selected.contactInfo || "—"}</span>
              </div>
            </div>

            {selected.uid === userProfile?.uid && (
              <div style={s.editBox}>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>Edit My Info</div>
                <input
                  style={s.editInput}
                  defaultValue={selected.designation || ""}
                  placeholder="Your designation / position"
                  onBlur={async e => {
                    await updateUserProfile(selected.uid, { designation: e.target.value });
                    setSelected(s => ({ ...s, designation: e.target.value }));
                  }}
                />
                <input
                  style={{ ...s.editInput, marginBottom: 0 }}
                  defaultValue={selected.contactInfo || ""}
                  placeholder="Email or phone number"
                  onBlur={async e => {
                    await updateUserProfile(selected.uid, { contactInfo: e.target.value });
                    setSelected(s => ({ ...s, contactInfo: e.target.value }));
                  }}
                />
              </div>
            )}

            <MemberFiles member={selected} isOwner={selected.uid === userProfile?.uid} />

            {isAdmin() && selected.uid !== userProfile?.uid && (
              <div style={{ borderTop: "0.5px solid var(--border-main)", paddingTop: "16px", marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selected.role !== "admin"
                  ? <button style={s.btn(true, false)} onClick={async () => { await grantAdmin(selected.uid);  setSelected(s => ({ ...s, role: "admin" })); }}>Grant Admin</button>
                  : <button style={s.btn(false, false)} onClick={async () => { await revokeAdmin(selected.uid); setSelected(s => ({ ...s, role: "member" })); }}>Revoke Admin</button>
                }
                <button style={s.btn(false, true)} onClick={async () => {
                  if (window.confirm(`Remove ${selected.displayName} from team?`)) {
                    await removeMember(selected.uid);
                    setSelected(null);
                  }
                }}>Remove from Team</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}