export type WebhookLogEntry = {
  id: string;
  timestamp: string;
  status: "success" | "rejected" | "error" | "no_domain";
  from: string;
  to: string;
  subject: string;
  statusCode: number;
  message: string;
  receivedKeys: string[];
};

const MAX_ENTRIES = 30;
const log: WebhookLogEntry[] = [];

export function addWebhookLog(entry: Omit<WebhookLogEntry, "id" | "timestamp">) {
  log.unshift({
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (log.length > MAX_ENTRIES) log.splice(MAX_ENTRIES);
}

export function getWebhookLog(): WebhookLogEntry[] {
  return log;
}
