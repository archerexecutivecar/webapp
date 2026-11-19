"use client";

import { useEffect, useState } from "react";
import { Shell, useDriver } from "@/components/Shell";
import { api, errorText, type DriverNote } from "@/lib/api";

function Chat() {
  const { refresh } = useDriver();
  const [notes, setNotes] = useState<DriverNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await api<{ notifications: DriverNote[] }>("/driver/notifications");
    setNotes(res.notifications);
  };

  useEffect(() => {
    void load().catch((e) => setError(errorText(e)));
    const timer = setInterval(() => { void load().catch(() => undefined); }, 20000);
    return () => clearInterval(timer);
  }, []);

  const open = async (note: DriverNote) => {
    if (note.is_read) return;
    try {
      await api(`/driver/notifications/${note.id}/read`, { method: "PUT" });
      setNotes((prev) => prev?.map((n) => n.id === note.id ? { ...n, is_read: true } : n) ?? null);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="stack">
      <h1 className="title">Dispatch</h1>
      <p className="muted" style={{ margin: 0 }}>Messages dispatch sends you. New offers also appear under Requests.</p>
      {error && <div role="alert" className="alert">{error}</div>}
      {notes == null && !error && <p className="muted">Loading messages…</p>}
      {notes?.length === 0 && <div className="empty">No dispatch messages yet.</div>}
      {notes?.map((note) => (
        <button
          key={note.id}
          type="button"
          className={`card ${note.is_read ? "" : "unread"}`}
          onClick={() => void open(note)}
          style={{ textAlign: "left", color: "inherit", cursor: "pointer" }}
        >
          <div className="row">
            <strong>{note.title}</strong>
            {!note.is_read && <span className="pill warn">New</span>}
          </div>
          <div>{note.message}</div>
          <div className="muted" style={{ fontSize: 12 }}>{new Date(note.created_at).toLocaleString()}</div>
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  return <Shell><Chat /></Shell>;
}
