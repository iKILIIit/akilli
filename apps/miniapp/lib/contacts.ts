"use client";

const CONTACTS_KEY = "akili_contacts_v1";

export type Contact = {
  address: string;
  name: string;
};

export function getContacts(): Contact[] {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? "[]") as Contact[]; }
  catch { return []; }
}

export function saveContacts(contacts: Contact[]): void {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function getContactMap(): Map<string, string> {
  return new Map(getContacts().map(c => [c.address.toLowerCase(), c.name]));
}

export function upsertContact(address: string, name: string): void {
  const key = address.toLowerCase();
  const existing = getContacts().filter(c => c.address.toLowerCase() !== key);
  if (name.trim()) {
    saveContacts([...existing, { address: key, name: name.trim() }]);
  } else {
    saveContacts(existing);
  }
}

export function removeContact(address: string): void {
  saveContacts(getContacts().filter(c => c.address.toLowerCase() !== address.toLowerCase()));
}

export function resolveLabel(rawLabel: string, contactMap: Map<string, string>): string {
  // rawLabel is either a truncated address like "0xABCD…1234" or a named label from the API
  // We try to match it as an address first
  const lower = rawLabel.toLowerCase();
  if (contactMap.has(lower)) return contactMap.get(lower)!;
  // Also try matching the full pattern for truncated labels
  for (const [addr, name] of contactMap) {
    if (rawLabel.startsWith(addr.slice(0, 6)) && rawLabel.endsWith(addr.slice(-4))) {
      return name;
    }
  }
  return rawLabel;
}
