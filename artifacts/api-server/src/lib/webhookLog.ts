export interface WebhookLogEntry {
  id: number;
  timestamp: string;
  method: string;
  contentType: string;
  receivedKeys: string[];
  status: number;
  error: string | null;
  parsedFrom: string | null;
  parsedTo: string | null;
  parsedSubject: string | null;
  emailId: number | null;
  bodyPreview: string;
}

const MAX_ENTRIES = 50;
let seq = 0;
const log: WebhookLogEntry[] = [];

export function addWebhookLog(entry: Omit<WebhookLogEntry, "id">): void {
  log.unshift({ id: ++seq, ...entry });
  if (log.length > MAX_ENTRIES) log.splice(MAX_ENTRIES);
}

export function getWebhookLogs(): WebhookLogEntry[] {
  return log;
}
