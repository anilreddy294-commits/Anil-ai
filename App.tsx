import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type Note = { id: string; title: string; body: string; created: number };
type Reminder = { id: string; text: string; due: string; done: boolean };
type Message = { id: string; text: string; who: "you" | "system" };

const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [tab, setTab] = useState<"chat" | "notes" | "reminders">("chat");
  const [online, setOnline] = useState(navigator.onLine);
  const [messages, setMessages] = useState<Message[]>(() => read("anil.messages", []));
  const [notes, setNotes] = useState<Note[]>(() => read("anil.notes", []));
  const [reminders, setReminders] = useState<Reminder[]>(() => read("anil.reminders", []));
  const [chatText, setChatText] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remText, setRemText] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => { localStorage.setItem("anil.messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem("anil.notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem("anil.reminders", JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener("online", on); addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);

  const send = () => {
    const text = chatText.trim(); if (!text) return;
    setMessages((old) => [...old, { id: makeId(), text, who: "you" }]);
    setChatText("");
    setStatus("ఈ APKలో ఇంకా AI మోడల్ కనెక్ట్ కాలేదు. మీ సందేశం ఫోన్‌లో సేవ్ అయింది; ఇది AI సమాధానం కాదు.");
  };

  const addNote = () => {
    if (!title.trim() && !body.trim()) { setStatus("దయచేసి నోట్ రాయండి."); return; }
    setNotes((old) => [{ id: makeId(), title: title.trim() || "శీర్షిక లేదు", body: body.trim(), created: Date.now() }, ...old]);
    setTitle(""); setBody(""); setStatus("నోట్ ఫోన్‌లో సేవ్ అయింది.");
  };

  const addReminder = async () => {
    if (!remText.trim() || !due) { setStatus("రిమైండర్ వివరాలు, తేదీ మరియు సమయం ఇవ్వండి."); return; }
    const date = new Date(due);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) { setStatus("భవిష్యత్తు తేదీ, సమయం ఎంచుకోండి."); return; }
    const item = { id: makeId(), text: remText.trim(), due: date.toISOString(), done: false };
    setReminders((old) => [item, ...old]);
    setRemText(""); setDue("");
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === "granted") {
          await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Date.now() % 2147483000), title: "ANIL AI Reminder", body: item.text, schedule: { at: date }, extra: { reminderId: item.id } }] });
          setStatus("రిమైండర్ సేవ్ అయింది. నోటిఫికేషన్ షెడ్యూల్ చేశాం.");
        } else setStatus("రిమైండర్ సేవ్ అయింది. నోటిఫికేషన్ అనుమతి ఇవ్వలేదు.");
      } catch { setStatus("రిమైండర్ సేవ్ అయింది. ఈ Androidలో నోటిఫికేషన్ షెడ్యూల్ కాలేదు."); }
    } else setStatus("రిమైండర్ సేవ్ అయింది. బ్రౌజర్‌లో సమయానికి నోటిఫికేషన్ హామీ లేదు; APKలో Native Notifications పనిచేస్తాయి.");
  };

  const removeNote = (id: string) => setNotes((old) => old.filter((n) => n.id !== id));
  const toggleReminder = (id: string) => setReminders((old) => old.map((r) => r.id === id ? { ...r, done: !r.done } : r));
  const removeReminder = (id: string) => setReminders((old) => old.filter((r) => r.id !== id));

  return <div className="app">
    <header><div className="brand"><div className="logo">✦</div><div><h1>ANIL AI</h1><p>మీ వ్యక్తిగత సహాయకుడు</p></div></div><span className={online ? "online" : "offline"}>{online ? "● Online" : "● Offline"}</span></header>
    <nav>{(["chat","notes","reminders"] as const).map((v) => <button className={tab === v ? "active" : ""} onClick={() => setTab(v)} key={v}>{v === "chat" ? "చాట్" : v === "notes" ? "నోట్స్" : "రిమైండర్లు"}</button>)}</nav>
    {status && <div className="status" role="status">{status}<button onClick={() => setStatus("")}>✕</button></div>}
    {tab === "chat" && <section className="panel"><div className="notice">AI మోడల్ ఇంకా కనెక్ట్ కాలేదు. నిజమైన AI సమాధానాల కోసం Offline AI Engine జోడించాలి. మీ చాట్ సందేశాలు ఈ ఫోన్‌లోనే సేవ్ అవుతాయి.</div><div className="messages">{messages.length === 0 ? <p className="empty">ఇంకా సందేశాలు లేవు</p> : messages.map(m => <div className={m.who === "you" ? "bubble you" : "bubble"} key={m.id}>{m.text}</div>)}</div><div className="composer"><input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="తెలుగులో సందేశం రాయండి..." /><button onClick={send}>పంపు</button></div></section>}
    {tab === "notes" && <section className="panel"><h2>నా నోట్స్</h2><input value={title} onChange={e => setTitle(e.target.value)} placeholder="నోట్ శీర్షిక" /><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="మీ నోట్ ఇక్కడ రాయండి..." rows={4}/><button className="primary" onClick={addNote}>నోట్ సేవ్ చేయి</button><div className="list">{notes.map(n => <article key={n.id}><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created).toLocaleString("te-IN")}</small></div><button className="danger" onClick={() => removeNote(n.id)}>తొలగించు</button></article>)}{notes.length === 0 && <p className="empty">ఇంకా నోట్స్ సేవ్ చేయలేదు.</p>}</div></section>}
    {tab === "reminders" && <section className="panel"><h2>నా రిమైండర్లు</h2><input value={remText} onChange={e => setRemText(e.target.value)} placeholder="ఏమి గుర్తు చేయాలి?" /><label>తేదీ మరియు సమయం</label><input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} /><button className="primary" onClick={addReminder}>రిమైండర్ జోడించు</button><div className="list">{reminders.map(r => <article key={r.id}><button className={r.done ? "check done" : "check"} onClick={() => toggleReminder(r.id)}>{r.done ? "✓" : "○"}</button><div className="reminderText"><strong>{r.text}</strong><small>{new Date(r.due).toLocaleString("te-IN")}</small></div><button className="danger" onClick={() => removeReminder(r.id)}>తొలగించు</button></article>)}{reminders.length === 0 && <p className="empty">ఇంకా రిమైండర్లు లేవు.</p>}</div></section>}
    <footer>ANIL AI · డేటా ఈ పరికరంలో సేవ్ అవుతుంది · {Capacitor.isNativePlatform() ? "Android App" : "Web Preview"}</footer>
  </div>;
}
