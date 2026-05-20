"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

export function toast(message: string, type: ToastType = "info") {
  const msg: ToastMessage = { id: `${Date.now()}-${Math.random()}`, message, type };
  toastListeners.forEach((fn) => fn(msg));
}

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");
toast.info = (message: string) => toast(message, "info");

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 3500);
    };
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {messages.map((msg) => (
        <div key={msg.id} className={`toast toast--${msg.type}`} role="status">
          <span className="toast__dot" aria-hidden="true" />
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
}
