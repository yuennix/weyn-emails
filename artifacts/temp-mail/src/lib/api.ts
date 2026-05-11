const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface InboxEmail {
  id: number;
  subdomainId: number;
  subdomainName: string;
  addressId: number | null;
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: string;
  isRead: boolean;
}

export interface InboxResponse {
  domain: string;
  subdomainId: number;
  emails: InboxEmail[];
}

export async function fetchInbox(address: string): Promise<InboxResponse> {
  const url = `${BASE}/api/inbox?address=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Not found" }));
    throw new Error(err.error ?? "Failed to load inbox");
  }
  return res.json();
}

export async function markEmailRead(id: number): Promise<void> {
  await fetch(`${BASE}/api/emails/${id}/read`, { method: "PATCH" });
}

export async function deleteEmail(id: number): Promise<void> {
  await fetch(`${BASE}/api/emails/${id}`, { method: "DELETE" });
}
