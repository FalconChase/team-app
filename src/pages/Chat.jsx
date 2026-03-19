import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTeam } from "../contexts/TeamContext";

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#4a9eda", wordBreak: "break-all" }}>{part}</a>
      : part
  );
}

const avatarColors = ["#e6f1fb","#eaf3de","#faeeda","#fcebeb","#e1f5ee","#f0e8fb"];
const avatarText = ["#185fa5","#3b6d11","#854f0b","#a32d2d","#0f6e56","#5c2d96"];
const colorIdx = (name) => (name?.charCodeAt(0) || 0) % avatarColors.length;
const initials = (name) => name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) || "?";

export default function Chat() {
  const { userProfile } = useAuth();
  const { members, team } = useTeam();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userProfile?.teamId) return;
    const q = query(collection(db, "messages"), where("teamId", "==", userProfile.teamId), orderBy("createdAt", "asc"), limit(100));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userProfile?.teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setText("");
    await addDoc(collection(db, "messages"), {
      text: t, teamId: userProfile.teamId,
      senderId: userProfile.uid, senderName: userProfile.displayName,
      senderRole: userProfile.role, createdAt: serverTimestamp()
    });
    setSending(false);
  }

  function formatTime(ts) {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function groupMessages(msgs) {
    const groups = [];
    msgs.forEach((m, i) => {
      const prev = msgs[i-1];
      const sameAuthor = prev?.senderId === m.senderId;
      const withinMinute = prev?.createdAt && m.createdAt && Math.abs((m.createdAt?.seconds || 0) - (prev.createdAt?.seconds || 0)) < 60;
      groups.push({ ...m, showHeader: !sameAuthor || !withinMinute });
    });
    return groups;
  }

  const roleColors = { admin: "#f0a500", manager: "#f0a500", supervisor: "#7ab3e0", member: "#aaa" };

  const s = {
    container: { display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: "400px" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
    title: { fontSize: "18px", fontWeight: "600", color: "#1a3a5c" },
    chatBox: { flex: 1, background: "#fff", borderRadius: "8px 8px 0 0", border: "0.5px solid #e0e8f0", borderBottom: "none", overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "2px" },
    inputArea: { background: "#fff", border: "0.5px solid #e0e8f0", borderRadius: "0 0 8px 8px", borderTop: "none", padding: "12px 16px", display: "flex", gap: "10px", alignItems: "flex-end" },
    input: { flex: 1, border: "1px solid #d0dde8", borderRadius: "20px", padding: "9px 16px", fontSize: "13px", fontFamily: "Tahoma,Geneva,sans-serif", outline: "none", resize: "none", maxHeight: "100px", background: "#f8fafc" },
    sendBtn: { padding: "9px 20px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontFamily: "Tahoma,Geneva,sans-serif", flexShrink: 0 },
    msg: (isMe) => ({ display: "flex", gap: "8px", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", marginBottom: "2px" }),
    avatar: (name) => ({ width: "28px", height: "28px", borderRadius: "50%", background: avatarColors[colorIdx(name)], color: avatarText[colorIdx(name)], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "600", flexShrink: 0, marginBottom: "2px" }),
    bubble: (isMe) => ({ maxWidth: "72%", padding: "8px 12px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMe ? "#1a3a5c" : "#f0f4f8", color: isMe ? "#fff" : "#222", fontSize: "13px", lineHeight: "1.5", wordBreak: "break-word", whiteSpace: "pre-wrap" }),
    senderName: (isMe) => ({ fontSize: "10px", color: "#888", marginBottom: "3px", textAlign: isMe ? "right" : "left" }),
    time: (isMe) => ({ fontSize: "10px", color: "#aaa", marginTop: "2px", textAlign: isMe ? "right" : "left" }),
  };

  const grouped = groupMessages(messages);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>Group Chat</div>
        <div style={{ fontSize: "12px", color: "#888" }}>{members.length} member{members.length !== 1 ? "s" : ""} · {team?.name || ""}</div>
      </div>

      <div style={s.chatBox}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: "13px", margin: "auto" }}>
            No messages yet. Say hello to the team!
          </div>
        )}
        {grouped.map(m => {
          const isMe = m.senderId === userProfile?.uid;
          return (
            <div key={m.id} style={{ marginBottom: m.showHeader ? "10px" : "2px" }}>
              {m.showHeader && !isMe && <div style={s.senderName(false)}>{m.senderName} <span style={{ color: roleColors[m.senderRole], fontWeight: "500" }}>· {m.senderRole}</span></div>}
              {m.showHeader && isMe && <div style={s.senderName(true)}>You</div>}
              <div style={s.msg(isMe)}>
                {m.showHeader && !isMe && <div style={s.avatar(m.senderName)}>{initials(m.senderName)}</div>}
                {(!m.showHeader || isMe) && !isMe && <div style={{ width: "28px" }} />}
                <div>
                  <div style={s.bubble(isMe)}>{linkify(m.text)}</div>
                  {m.showHeader && <div style={s.time(isMe)}>{formatTime(m.createdAt)}</div>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputArea}>
        <textarea style={s.input} value={text} onChange={e => setText(e.target.value)} placeholder="Type a message to the team..." rows={1}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button style={s.sendBtn} onClick={send} disabled={sending || !text.trim()}>Send</button>
      </div>
    </div>
  );
}
