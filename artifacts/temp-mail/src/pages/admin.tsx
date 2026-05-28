import { useState, useEffect, useCallback } from "react";
import {
  useListSubdomains,
  useCreateSubdomain,
  useDeleteSubdomain,
  getListSubdomainsQueryKey,
  useListRecentEmails,
  useMarkEmailRead,
  useDeleteEmail,
  getListRecentEmailsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Globe, Plus, Trash2, Loader2, Eye, EyeOff,
  Webhook, Copy, Check, Code2, Lock,
  Activity, ShieldCheck, AlertCircle, Mail, Zap, RefreshCw, Send, ExternalLink,
  Inbox, ChevronRight, ChevronDown, Search, X, MailOpen,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import DOMPurify from "dompurify";

const ADMIN_PASSWORD = "yuennix";
const SESSION_KEY = "admin_authed";

/* ─── Domain Panel ─────────────────────────────────────── */
function DomainsPanel() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [sendingTest, setSendingTest] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; ok: boolean; msg: string } | null>(null);

  const webhookUrl = __REPLIT_DEV_DOMAIN__
    ? `https://${__REPLIT_DEV_DOMAIN__}/api/webhook/email`
    : `${window.location.origin}/api/webhook/email`;

  const sendTestEmail = async (sub: { id: number; name: string }) => {
    setSendingTest(sub.id);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: "test-sender@example.com",
          to: `test@${sub.name}`,
          subject: "✅ Test Email — Weyn Mail",
          text: "This is an automated test email injected via the admin panel to verify your inbox is working.",
          html: "<p>This is an automated <strong>test email</strong> injected via the admin panel to verify your inbox is working.</p>",
        }),
      });
      if (res.ok) {
        setTestResult({ id: sub.id, ok: true, msg: `Delivered to test@${sub.name} — check your inbox!` });
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
      } else {
        const j = await res.json().catch(() => ({}));
        setTestResult({ id: sub.id, ok: false, msg: (j as { error?: string }).error ?? "Failed to send" });
      }
    } catch (e) {
      setTestResult({ id: sub.id, ok: false, msg: (e as Error).message });
    } finally {
      setSendingTest(null);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const { data: subdomains, isLoading } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  const create = useCreateSubdomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
        setNewName("");
      },
    },
  });

  const createError = create.error
    ? ((create.error as { data?: { error?: string } })?.data?.error ?? (create.error as Error)?.message ?? "Failed to add domain")
    : null;

  const remove = useDeleteSubdomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
        setDeleteConfirm(null);
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Add form */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate({ data: { name: newName.trim() } }); }}
        className="flex gap-2"
      >
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-3 focus-within:border-indigo-500/50 focus-within:bg-indigo-950/30 transition-all">
          <Globe className="h-4 w-4 text-indigo-400/60 shrink-0" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="mail.example.com"
            className="flex-1 bg-transparent text-sm font-mono text-white placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending || !newName.trim()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl btn-gradient text-white text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.98] shrink-0"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add</>}
        </button>
      </form>
      {createError && (
        <p className="flex items-center gap-2 text-xs text-red-400 px-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {createError}
        </p>
      )}

      {/* Webhook setup info */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-300">Email Routing Setup Required</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure your email provider (Mailwip, Cloudflare, ImprovMX, etc.) to forward emails to this webhook:
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/8 px-3 py-2">
          <code className="font-mono text-xs text-indigo-300 flex-1 break-all">{webhookUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(webhookUrl); }}
            className="shrink-0 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            title="Copy URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <a
          href="https://mailwip.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Open Mailwip →
        </a>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-medium border ${
          testResult.ok
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {testResult.ok ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {testResult.msg}
        </div>
      )}

      {/* Domain list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-white/8 to-white/4 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 bg-white/8 rounded-lg" />
                  <div className="h-3 w-28 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : subdomains && subdomains.length > 0 ? (
          <div className="divide-y divide-border">
            {subdomains.map((sub) => (
              <div key={sub.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-indigo-950/20 transition-all">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-white truncate">{sub.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {sub.emailCount} email{sub.emailCount !== 1 ? "s" : ""}
                    </span>
                    {sub.unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[11px] font-bold">
                        {sub.unreadCount} new
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground/30">
                      {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Send test email */}
                  {deleteConfirm !== sub.id && (
                    <button
                      onClick={() => sendTestEmail(sub)}
                      disabled={sendingTest === sub.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
                      title={`Send test email to test@${sub.name}`}
                    >
                      {sendingTest === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Test
                    </button>
                  )}

                  {deleteConfirm === sub.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">Remove?</span>
                      <button
                        onClick={() => remove.mutate({ id: sub.id })}
                        disabled={remove.isPending}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, remove"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(sub.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-rose-500/40 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 text-xs font-medium transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/15 flex items-center justify-center mb-4">
              <Globe className="h-7 w-7 text-indigo-400/40" />
            </div>
            <p className="text-sm font-bold text-white">No domains yet</p>
            <p className="text-xs text-muted-foreground mt-1.5">Type a domain above and press Add</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground/30 px-1">
        All emails sent to any address @your-domain are captured automatically.
      </p>
    </div>
  );
}

/* ─── Webhook Panel ─────────────────────────────────────── */
function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-3">
        <code className="font-mono text-sm text-indigo-400 flex-1 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-all"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

const PAYLOAD = `{
  "from": "sender@example.com",
  "to": "alias@yourdomain.com",
  "subject": "Hello",
  "bodyText": "Plain text body",
  "bodyHtml": "<p>Optional HTML</p>"
}`;

type WebhookLogEntry = {
  id: string; timestamp: string;
  status: "success" | "rejected" | "error" | "no_domain";
  from: string; to: string; subject: string;
  statusCode: number; message: string; receivedKeys: string[];
};

const STATUS_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  success:   { label: "Delivered", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  rejected:  { label: "Rejected",  cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",         dot: "bg-rose-400" },
  no_domain: { label: "No Domain", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",      dot: "bg-amber-400" },
  error:     { label: "Error",     cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",         dot: "bg-rose-400" },
};

function WebhookPanel() {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const webhookUrl = import.meta.env.VITE_PUBLIC_URL
    ? `${import.meta.env.VITE_PUBLIC_URL}/api/webhook/email`
    : __REPLIT_DEV_DOMAIN__
      ? `https://${__REPLIT_DEV_DOMAIN__}/api/webhook/email`
      : `${window.location.origin}/api/webhook/email`;

  const fetchLogs = async () => {
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/webhook/logs`);
      if (res.ok) setLogs(await res.json());
    } catch {}
    setLogsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
            <Webhook className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <span className="text-sm font-bold text-white">Webhook Endpoint</span>
        </div>
        <CopyBlock label="POST URL" value={webhookUrl} />
        <div className="grid grid-cols-2 gap-3">
          <CopyBlock label="Method" value="POST" />
          <CopyBlock label="Content-Type" value="application/json" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/20 flex items-center justify-center">
            <Code2 className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <span className="text-sm font-bold text-white">Payload Schema</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-950/40 to-transparent border-b border-border">
            <div className="grid grid-cols-12 text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest">
              <span className="col-span-3">Field</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-2">Req</span>
              <span className="col-span-5">Description</span>
            </div>
          </div>
          {[
            { f: "from",     t: "string", r: true,  d: "Sender email address" },
            { f: "to",       t: "string", r: true,  d: "Recipient — must match a registered domain" },
            { f: "subject",  t: "string", r: true,  d: "Email subject line" },
            { f: "bodyText", t: "string", r: false, d: "Plain text body" },
            { f: "bodyHtml", t: "string", r: false, d: "HTML body (optional)" },
          ].map(({ f, t, r, d }) => (
            <div key={f} className="grid grid-cols-12 items-center px-4 py-2.5 border-t border-border hover:bg-indigo-950/10 text-xs transition-colors">
              <code className="col-span-3 font-mono text-indigo-400 font-semibold">{f}</code>
              <code className="col-span-2 font-mono text-muted-foreground">{t}</code>
              <span className="col-span-2">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${r ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                  {r ? "req" : "opt"}
                </span>
              </span>
              <span className="col-span-5 text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">Example JSON</p>
            <button
              onClick={() => { navigator.clipboard.writeText(PAYLOAD); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-indigo-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-indigo-500/10"
            >
              {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedPayload ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl border border-border bg-indigo-950/20 p-4 font-mono text-xs text-indigo-300/70 whitespace-pre overflow-x-auto">{PAYLOAD}</pre>
        </div>
      </div>

      {/* Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-white">Recent Activity</span>
          </div>
          <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-indigo-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-indigo-500/10">
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {logsLoading ? (
            <div className="px-5 py-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> Loading activity...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-7 w-7 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for incoming emails</p>
            </div>
          ) : (
            logs.map((log) => {
              const cfg = STATUS_CFG[log.status] ?? { label: log.status, cls: "bg-white/5 text-muted-foreground border-white/10", dot: "bg-white/30" };
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                      <span className="font-mono text-xs text-muted-foreground truncate">{log.to || "–"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/50 truncate">{log.message}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground/30 shrink-0 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Webmail Panel ─────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-blue-600","bg-violet-600","bg-emerald-600",
  "bg-amber-600","bg-rose-600","bg-cyan-600","bg-indigo-600","bg-teal-600",
];
function avatarColor(from: string) {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function senderInitials(from: string) {
  const name = from.split("<")[0].trim() || from;
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function senderDisplayName(from: string) {
  const match = from.match(/^([^<]+)</);
  return match ? match[1].trim() : from.split("@")[0];
}

function AdminWebmailPanel() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: emails, isLoading, refetch } = useListRecentEmails(
    { limit: 200 },
    { query: { queryKey: getListRecentEmailsQueryKey({ limit: 200 }), refetchInterval: 8000 } }
  );

  const markRead = useMarkEmailRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRecentEmailsQueryKey() }),
    },
  });

  const deleteEmail = useDeleteEmail({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRecentEmailsQueryKey() }),
    },
  });

  const handleExpand = (id: number, isRead: boolean) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (!isRead) markRead.mutate({ id });
  };

  const filtered = (emails ?? []).filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.fromAddress?.toLowerCase().includes(q) ||
      e.toAddress?.toLowerCase().includes(q) ||
      e.subject?.toLowerCase().includes(q) ||
      e.subdomainName?.toLowerCase().includes(q)
    );
  });

  const unread = (emails ?? []).filter((e) => !e.isRead).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: emails?.length ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Unread", value: unread, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
          { label: "Domains", value: [...new Set((emails ?? []).map(e => e.subdomainName))].length, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border ${bg} px-4 py-3 text-center`}>
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sender, subject, domain…"
            className="w-full pl-9 pr-9 h-10 rounded-xl border border-border bg-card text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-400 transition-all flex items-center justify-center"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Email list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-44 bg-white/8 rounded" />
                  <div className="h-3 w-64 bg-white/5 rounded" />
                </div>
                <div className="h-3 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-emerald-400/40" />
            </div>
            <p className="text-sm font-bold text-white">{search ? "No results found" : "No emails yet"}</p>
            <p className="text-xs text-muted-foreground mt-1">{search ? "Try a different search term" : "Emails will appear here as they arrive"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((email) => {
              const expanded = expandedId === email.id;
              const color = avatarColor(email.fromAddress);
              return (
                <div key={email.id}>
                  <div
                    className={`group flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all ${
                      expanded ? "bg-emerald-500/5 border-l-2 border-emerald-500" : "hover:bg-white/[0.025] border-l-2 border-transparent"
                    }`}
                    onClick={() => handleExpand(email.id, email.isRead)}
                  >
                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-full ${color} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                      {senderInitials(email.fromAddress)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {!email.isRead && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />}
                        <span className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "text-white font-semibold"}`}>
                          {senderDisplayName(email.fromAddress)}
                        </span>
                        <span className="text-muted-foreground/30 text-xs shrink-0">→</span>
                        <span className="text-xs text-emerald-400/70 font-mono truncate">{email.toAddress}</span>
                      </div>
                      <p className={`text-xs truncate ${email.isRead ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                        {email.subject || "(no subject)"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/30 font-mono">
                          <Globe className="h-2.5 w-2.5" />{email.subdomainName}
                        </span>
                        <span className="text-[10px] text-muted-foreground/25">·</span>
                        <span className="text-[10px] text-muted-foreground/30">{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEmail.mutate({ id: email.id }); }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/15 text-muted-foreground/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {email.isRead
                        ? <MailOpen className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
                        : <Mail className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />
                      }
                      {expanded
                        ? <ChevronDown className="h-4 w-4 text-emerald-400 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                    </div>
                  </div>

                  {/* Expanded body */}
                  {expanded && (
                    <div className="border-t border-border bg-background/50">
                      <div className="px-5 py-3 border-b border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-xs">
                        <div><span className="text-muted-foreground/40">From: </span><span className="text-white">{email.fromAddress}</span></div>
                        <div><span className="text-muted-foreground/40">To: </span><span className="text-emerald-400">{email.toAddress}</span></div>
                        <div><span className="text-muted-foreground/40">Domain: </span><span className="text-muted-foreground">{email.subdomainName}</span></div>
                        <div><span className="text-muted-foreground/40">Received: </span><span className="text-muted-foreground">{format(new Date(email.receivedAt), "MMM d, yyyy · HH:mm")}</span></div>
                      </div>
                      <div className="px-5 py-4">
                        {email.bodyHtml
                          ? <div className="prose prose-sm prose-invert max-w-none text-xs" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.bodyHtml) }} />
                          : <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{email.bodyText || "(empty)"}</pre>
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground/30 px-1 text-center">
          Showing {filtered.length} of {emails?.length ?? 0} email{(emails?.length ?? 0) !== 1 ? "s" : ""} — no filters applied
        </p>
      )}
    </div>
  );
}

/* ─── Admin Page ──────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"domains" | "webhook" | "webmail">("webmail");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  };

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-fit">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-xl opacity-30" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Lock className="h-7 w-7 text-indigo-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Access</h1>
              <p className="text-sm text-muted-foreground mt-1">Enter your password to continue</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-400 transition-colors"
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2.5 text-sm text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl btn-gradient text-white font-bold text-sm transition-all active:scale-[0.99]"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-md opacity-25" />
            <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-xs text-muted-foreground">Webmail · Domains · Webhook</p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(""); }}
          className="text-sm text-muted-foreground hover:text-white border border-border hover:border-white/20 rounded-xl px-4 py-2 transition-all"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {(["webmail", "domains", "webhook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              t === tab
                ? t === "webmail"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "btn-gradient text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {t === "webmail" ? "Webmail" : t === "domains" ? "Domains" : "Webhook"}
          </button>
        ))}
      </div>

      {tab === "webmail" ? <AdminWebmailPanel /> : tab === "domains" ? <DomainsPanel /> : <WebhookPanel />}
    </div>
  );
}
