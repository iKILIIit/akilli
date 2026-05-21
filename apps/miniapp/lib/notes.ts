"use client";

const NOTES_KEY = "akili_tx_notes_v1";

export function getAllNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}") as Record<string, string>; }
  catch { return {}; }
}

export function getNote(txHash: string): string {
  return getAllNotes()[txHash] ?? "";
}

export function setNote(txHash: string, note: string): void {
  const notes = getAllNotes();
  if (note.trim()) {
    notes[txHash] = note.trim();
  } else {
    delete notes[txHash];
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
