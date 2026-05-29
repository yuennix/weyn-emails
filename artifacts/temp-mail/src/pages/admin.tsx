import { useState, useEffect, useCallback, useRef } from "react";
import {
  useListSubdomains,
  useCreateSubdomain,
  useDeleteSubdomain,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Globe, Plus, Trash2, Loader2, Eye, EyeOff,
  Webhook, Copy, Check, Code2, Lock,
  Activity, ShieldCheck, AlertCircle, Mail, RefreshCw, Send, ExternalLink,
  Inbox, ChevronDown, Search, X, Shuffle, ArrowRight, Radio,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import DOMPurify from "dompurify";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";

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
          subject: "✅ Test Email — PhantomMail",
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
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-red-900/40 bg-black/40 px-4 py-3 focus-within:border-red-700/60 focus-within:shadow-[0_0_10px_rgba(220,38,38,0.1)] transition-all">
          <Globe className="h-4 w-4 text-red-800/60 shrink-0" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="mail.example.com"
            className="flex-1 bg-transparent text-sm font-mono text-white placeholder:text-red-900/40 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending || !newName.trim()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl grad-animated text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-[0.98] shrink-0 glow-red-sm"
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
      <div className="rounded-xl border border-red-900/30 bg-black/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-red-500/70 shrink-0" />
          <span className="text-xs font-bold text-red-400">Email Routing Setup</span>
        </div>
        <p className="text-xs text-red-900/60 leading-relaxed">
          Configure your email provider (Mailwip, Cloudflare, ImprovMX) to forward emails to:
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-black/50 border border-red-900/30 px-3 py-2">
          <code className="font-mono text-xs text-red-300/80 flex-1 break-all">{webhookUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(webhookUrl); }}
            className="shrink-0 p-1 rounded hover:bg-red-900/30 text-red-800/60 hover:text-red-400 transition-colors"
            title="Copy URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <a
          href="https://mailwip.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Open Mailwip →
        </a>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-medium border ${
          testResult.ok
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {testResult.ok ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {testResult.msg}
        </div>
      )}

      {/* Domain list */}
      <div className="rounded-xl border border-red-900/30 bg-black/30 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-red-900/20">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-11 w-11 rounded-xl bg-red-950/30 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 bg-red-950/30 rounded-lg" />
                  <div className="h-3 w-28 bg-red-950/20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : subdomains && subdomains.length > 0 ? (
          <div className="divide-y divide-red-900/20">
            {subdomains.map((sub) => (
              <div key={sub.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-red-950/10 transition-all">
                <div className="h-11 w-11 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-red-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-white truncate">{sub.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-red-900/60">
                      <Mail className="h-3 w-3" />
                      {sub.emailCount} email{sub.emailCount !== 1 ? "s" : ""}
                    </span>
                    {sub.unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[11px] font-bold">
                        {sub.unreadCount} new
                      </span>
                    )}
                    <span className="text-[11px] text-red-900/40">
                      {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {deleteConfirm !== sub.id && (
                    <button
                      onClick={() => sendTestEmail(sub)}
                      disabled={sendingTest === sub.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/30 bg-red-950/10 text-red-600 hover:bg-red-950/30 hover:text-red-400 text-xs font-medium transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    >
                      {sendingTest === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Test
                    </button>
                  )}

                  {deleteConfirm === sub.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-700/60 hidden sm:block">Remove?</span>
                      <button
                        onClick={() => remove.mutate({ id: sub.id })}
                        disabled={remove.isPending}
                        className="px-3 py-1.5 rounded-lg grad-animated text-white text-xs font-bold transition-all disabled:opacity-40"
                      >
                        {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, remove"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 rounded-lg border border-red-900/30 text-red-900/60 hover:text-white text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(sub.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/20 hover:border-red-700/40 hover:bg-red-950/20 text-red-900/40 hover:text-red-500 text-xs font-medium transition-all opacity-0 group-hover:opacity-100"
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
            <div className="h-14 w-14 rounded-2xl bg-red-950/20 border border-red-900/20 flex items-center justify-center mb-4">
              <Globe className="h-7 w-7 text-red-900/40" />
            </div>
            <p className="text-sm font-bold text-white">No domains yet</p>
            <p className="text-xs text-red-900/50 mt-1.5">Type a domain above and press Add</p>
          </div>
        )}
      </div>
      <p className="text-xs text-red-900/30 px-1">
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
      <p className="text-[11px] font-bold text-red-900/50 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-red-900/30 bg-black/40 px-4 py-3">
        <code className="font-mono text-sm text-red-300/80 flex-1 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1.5 rounded-lg hover:bg-red-900/30 text-red-800/60 hover:text-red-400 transition-all"
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
  rejected:  { label: "Rejected",  cls: "bg-red-500/10 text-red-400 border-red-500/20",             dot: "bg-red-400" },
  no_domain: { label: "No Domain", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",        dot: "bg-amber-400" },
  error:     { label: "Error",     cls: "bg-red-500/10 text-red-400 border-red-500/20",             dot: "bg-red-400" },
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
      <div className="rounded-xl border border-red-900/30 bg-black/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-red-950/30 border border-red-900/30 flex items-center justify-center">
            <Webhook className="h-3.5 w-3.5 text-red-600" />
          </div>
          <span className="text-sm font-bold text-white">Webhook Endpoint</span>
        </div>
        <CopyBlock label="POST URL" value={webhookUrl} />
        <div className="grid grid-cols-2 gap-3">
          <CopyBlock label="Method" value="POST" />
          <CopyBlock label="Content-Type" value="application/json" />
        </div>
      </div>

      <div className="rounded-xl border border-red-900/30 bg-black/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-red-950/30 border border-red-900/30 flex items-center justify-center">
            <Code2 className="h-3.5 w-3.5 text-red-600" />
          </div>
          <span className="text-sm font-bold text-white">Payload Schema</span>
        </div>
        <div className="rounded-xl border border-red-900/30 overflow-hidden">
          <div className="px-4 py-2.5 bg-red-950/20 border-b border-red-900/20">
            <div className="grid grid-cols-12 text-[11px] font-bold text-red-900/50 uppercase tracking-widest">
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
            <div key={f} className="grid grid-cols-12 items-center px-4 py-2.5 border-t border-red-900/20 hover:bg-red-950/10 text-xs transition-colors">
              <code className="col-span-3 font-mono text-red-400 font-semibold">{f}</code>
              <code className="col-span-2 font-mono text-red-900/60">{t}</code>
              <span className="col-span-2">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${r ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-white/5 text-red-900/40 border-white/10"}`}>
                  {r ? "req" : "opt"}
                </span>
              </span>
              <span className="col-span-5 text-red-900/50">{d}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-red-900/40 uppercase tracking-widest">Example JSON</p>
            <button
              onClick={() => { navigator.clipboard.writeText(PAYLOAD); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000); }}
              className="flex items-center gap-1.5 text-xs text-red-800/60 hover:text-red-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-900/20"
            >
              {copiedPayload ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedPayload ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl border border-red-900/30 bg-black/40 p-4 font-mono text-xs text-red-300/60 whitespace-pre overflow-x-auto">{PAYLOAD}</pre>
        </div>
      </div>

      {/* Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-red-950/30 border border-red-900/30 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-red-600" />
            </div>
            <span className="text-sm font-bold text-white">Recent Activity</span>
          </div>
          <button onClick={fetchLogs} className="text-xs text-red-800/60 hover:text-red-400 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-900/20">
            Refresh
          </button>
        </div>
        <div className="rounded-xl border border-red-900/30 bg-black/30 overflow-hidden divide-y divide-red-900/20">
          {logsLoading ? (
            <div className="px-5 py-5 flex items-center gap-2 text-sm text-red-800/60">
              <Loader2 className="h-4 w-4 animate-spin text-red-600" /> Loading activity...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-7 w-7 text-red-900/30 mb-3" />
              <p className="text-sm font-bold text-white">No activity yet</p>
              <p className="text-xs text-red-900/40 mt-1">Waiting for incoming emails</p>
            </div>
          ) : (
            logs.map((log) => {
              const cfg = STATUS_CFG[log.status] ?? { label: log.status, cls: "bg-white/5 text-red-900/40 border-white/10", dot: "bg-white/30" };
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-red-950/10 transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                      <span className="font-mono text-xs text-red-800/60 truncate">{log.to || "–"}</span>
                    </div>
                    <p className="text-xs text-red-900/40 truncate">{log.message}</p>
                  </div>
                  <span className="text-[11px] text-red-900/30 shrink-0 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
const ADMIN_AUTO_REFRESH = 5000;

function adminGeneratePrefix(): string {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const adj = ["Alpha","Beta","Cosmic","Delta","Echo","Flash","Ghost","Hyper","Iron","Jade","Keen","Lunar","Mega","Neon","Omega","Prime","Quartz","Royal","Solar","Turbo"];
  const noun = ["Agent","Blade","Cloud","Drake","Ember","Falcon","Guard","Haven","Intel","Judge","Knight","Lance","Matrix","Nexus","Orbit","Proxy","Quill","Radar","Scout","Tower"];
  return pick(adj) + pick(noun) + String(Math.floor(Math.random() * 99) + 1);
}

function adminSenderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  return match ? match[1].trim() : from.split("@")[0];
}
function adminSenderInitial(from: string): string {
  return (adminSenderName(from).charAt(0) || "?").toUpperCase();
}

function AdminWebmailPanel() {
  const [alias, setAlias] = useState(() => adminGeneratePrefix());
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  const [activeAddress, setActiveAddress] = useState("");
  const [directInput, setDirectInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const domainRef = useRef<HTMLDivElement>(null);

  const { data: subdomainsData } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });
  const domains = subdomainsData ?? [];

  useEffect(() => {
    if (!domains.length) return;
    if (!domains.some((d) => d.name === selectedDomain)) setSelectedDomain(domains[0].name);
  }, [domains]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) setDomainOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = useCallback(async (address: string, silent = false) => {
    if (!address) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await fetchInbox(address);
      setEmails(data.emails);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load inbox");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const doRefetch = useCallback(() => {
    if (activeAddress) load(activeAddress, true);
  }, [activeAddress, load]);

  useEffect(() => {
    if (!activeAddress) return;
    const id = setInterval(() => load(activeAddress, true), ADMIN_AUTO_REFRESH);
    return () => clearInterval(id);
  }, [activeAddress, load]);

  const openInbox = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) return;
    const prefix = alias.trim().toLowerCase() || adminGeneratePrefix();
    const addr = `${prefix}@${domain}`;
    setAlias(prefix);
    setActiveAddress(addr);
    setSelectedId(null);
    setEmails([]);
    setError(null);
    load(addr);
  };

  const handleShuffle = () => {
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) return;
    const prefix = adminGeneratePrefix();
    const addr = `${prefix}@${domain}`;
    setAlias(prefix);
    setActiveAddress(addr);
    setSelectedId(null);
    setEmails([]);
    load(addr);
  };

  const openDirectInbox = (e: React.FormEvent) => {
    e.preventDefault();
    const val = directInput.trim().toLowerCase();
    if (!val.includes("@")) return;
    const [a, d] = val.split("@");
    setAlias(a);
    setSelectedDomain(d);
    setActiveAddress(val);
    setSelectedId(null);
    setEmails([]);
    setSearch("");
    setDirectInput("");
    load(val);
  };

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInbox = async () => {
    if (!activeAddress) return;
    if (!confirm(`Delete all messages in ${activeAddress}?`)) return;
    setClearing(true);
    try {
      for (const email of emails) await deleteEmail(email.id);
      setEmails([]);
      setSelectedId(null);
    } catch { } finally { setClearing(false); }
  };

  const handleSelect = async (email: InboxEmail) => {
    setSelectedId((prev) => (prev === email.id ? null : email.id));
    if (!email.isRead) {
      await markEmailRead(email.id);
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
    }
  };

  const handleDeleteEmail = async (id: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    await deleteEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const visibleEmails = search.trim()
    ? emails.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.fromAddress?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.bodyText?.toLowerCase().includes(q) ||
          e.toAddress?.toLowerCase().includes(q)
        );
      })
    : emails;

  const unread = visibleEmails.filter((e) => !e.isRead).length;
  const selectedEmail = visibleEmails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Address form card */}
      <div className="rounded-2xl overflow-hidden border border-red-900/30 bg-black/40 shadow-xl">
        <div className="h-1 w-full grad-animated" />
        <div className="p-4 space-y-4">
          <form onSubmit={openInbox} className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-red-900/40 bg-black/50 focus-within:border-red-700/60 transition-all min-w-0 overflow-hidden">
              <input
                type="text"
                placeholder="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
                className="flex-1 px-3.5 h-10 bg-transparent text-sm font-mono text-white placeholder:text-red-900/40 focus:outline-none min-w-0"
              />
              <span className="px-2.5 text-sm text-red-800/50 font-mono select-none shrink-0 border-l border-red-900/30 h-10 flex items-center">@</span>
            </div>

            <div className="relative shrink-0" ref={domainRef}>
              <button
                type="button"
                onClick={() => setDomainOpen(!domainOpen)}
                className="flex items-center gap-1.5 h-10 px-3 font-mono text-sm text-white bg-black/50 border border-red-900/40 rounded-xl hover:border-red-700/50 transition-all"
              >
                <span className="truncate max-w-[80px]">{selectedDomain || domains[0]?.name || "…"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-red-700/50 shrink-0 transition-transform ${domainOpen ? "rotate-180" : ""}`} />
              </button>
              {domainOpen && domains.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 bg-black border border-red-900/40 rounded-xl shadow-2xl z-50 min-w-[150px] overflow-hidden">
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 font-mono text-sm transition-colors ${
                        selectedDomain === d.name ? "text-red-400 font-semibold bg-red-950/40" : "text-white hover:bg-red-950/20 hover:text-red-300"
                      }`}
                      onClick={() => { setSelectedDomain(d.name); setDomainOpen(false); }}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              title="Open inbox"
              className="h-10 w-10 shrink-0 grad-animated text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity glow-red-sm"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              title="Random alias"
              className="h-10 w-10 shrink-0 border border-red-900/40 bg-black/50 rounded-xl flex items-center justify-center hover:border-red-700/50 hover:bg-red-950/20 text-red-700 hover:text-red-400 transition-all"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-red-900/20 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/50 mb-2">Direct access</p>
            <form onSubmit={openDirectInbox} className="flex gap-2">
              <input
                type="text"
                placeholder="anything@domain.com"
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                className="flex-1 font-mono text-sm h-9 px-3.5 rounded-xl border border-red-900/40 bg-black/50 text-white placeholder:text-red-900/40 focus:outline-none focus:border-red-700/50 transition-all"
              />
              <button
                type="submit"
                className="h-9 w-9 shrink-0 grad-animated text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Active address bar */}
      {activeAddress && (
        <div className="rounded-xl border border-red-900/30 bg-black/30 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="font-mono text-sm text-white truncate">{activeAddress}</span>
            {unread > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
                {unread} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                copied
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-900/20 border-red-800/30 text-red-500 hover:bg-red-900/40"
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={doRefetch}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-900/30 bg-black/30 text-red-700 hover:text-red-400 hover:border-red-800/50 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            {emails.length > 0 && (
              <button
                onClick={clearInbox}
                disabled={clearing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-800/40 bg-red-950/20 text-red-500 hover:bg-red-950/40 transition-all disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">{clearing ? "…" : "Clear"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {activeAddress && emails.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-900/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 h-10 bg-black/40 border border-red-900/30 rounded-xl text-sm text-white placeholder:text-red-900/40 focus:outline-none focus:border-red-700/50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-700/50 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-xl border border-red-900/20 bg-black/30 p-4 flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-red-950/30 shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 w-40 bg-red-950/30 rounded" />
                <div className="h-3 w-1/2 bg-red-950/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-6 text-center">
          <p className="text-sm font-bold text-red-400">{error}</p>
          <p className="text-xs text-red-700/50 mt-1">Make sure this domain is registered in the Domains tab</p>
        </div>
      ) : !activeAddress ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/20 border border-red-900/20 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-red-900/40" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No inbox open</h3>
          <p className="text-red-700/50 text-sm max-w-xs leading-relaxed">
            Generate an address above — all emails arrive here unfiltered.
          </p>
          {domains.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {domains.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDomain(d.name);
                    const prefix = adminGeneratePrefix();
                    const addr = `${prefix}@${d.name}`;
                    setAlias(prefix);
                    setActiveAddress(addr);
                    load(addr);
                  }}
                  className="px-4 py-2 rounded-full border border-red-900/30 bg-black/30 hover:border-red-700/50 hover:bg-red-950/20 transition-all text-sm font-mono text-red-800 hover:text-red-400"
                >
                  @{d.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-red-950/20 border border-red-900/20 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-red-900/30" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Inbox is empty</h3>
          <p className="text-red-800/50 text-sm">
            Waiting at <span className="font-mono text-red-600/70">{activeAddress}</span>
          </p>
          <p className="text-xs text-red-900/40 mt-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-red-700" />
            Checking every 5 seconds
          </p>
        </div>
      ) : visibleEmails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <Search className="w-8 h-8 text-red-900/30 mb-3" />
          <p className="text-sm font-bold text-white">No results for "{search}"</p>
          <button onClick={() => setSearch("")} className="text-xs text-red-500 hover:text-red-400 hover:underline mt-2">Clear search</button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleEmails.map((email) => {
            const isSelected = selectedId === email.id;
            return (
              <div key={email.id} className={`rounded-xl border overflow-hidden transition-all ${
                isSelected
                  ? "border-red-700/50 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                  : email.isRead
                  ? "border-red-900/20 bg-black/30 hover:border-red-900/40"
                  : "border-red-800/40 bg-black/40 hover:border-red-700/50"
              }`}>
                <div
                  className="flex gap-3 p-4 cursor-pointer group relative"
                  onClick={() => handleSelect(email)}
                >
                  {!email.isRead && (
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full grad-animated" />
                  )}

                  <div className="relative shrink-0 ml-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      !email.isRead ? "grad-animated text-white" : "bg-red-950/30 text-red-800 border border-red-900/30"
                    }`}>
                      {adminSenderInitial(email.fromAddress)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-0.5">
                      <span className={`text-sm font-bold truncate ${email.isRead ? "text-red-800/60" : "text-white"}`}>
                        {adminSenderName(email.fromAddress)}
                      </span>
                      <span className="text-[11px] text-red-900/50 whitespace-nowrap shrink-0 font-mono">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${email.isRead ? "text-red-900/50" : "text-red-300/70 font-medium"}`}>
                      {email.subject || "(No Subject)"}
                    </p>
                    <p className="text-[11px] text-red-900/35 font-mono truncate mt-0.5">{email.toAddress}</p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteEmail(email.id, e)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-900/25 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 shrink-0 self-start"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isSelected && selectedEmail && (
                  <div className="border-t border-red-900/30 bg-black/40">
                    <div className="px-5 py-4 border-b border-red-900/20 space-y-1.5">
                      <p className="text-base font-bold text-white">{selectedEmail.subject}</p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono">
                        <span><span className="text-red-900/50">From </span><span className="text-red-300">{selectedEmail.fromAddress}</span></span>
                        <span><span className="text-red-900/50">To </span><span className="text-red-400">{selectedEmail.toAddress}</span></span>
                        <span className="text-red-900/40">{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy · HH:mm")}</span>
                      </div>
                    </div>
                    <div className="px-5 py-5">
                      {selectedEmail.bodyHtml
                        ? <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.bodyHtml) }} />
                        : <pre className="text-sm text-red-300/60 whitespace-pre-wrap font-mono leading-relaxed">{selectedEmail.bodyText || "(empty)"}</pre>
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
  );
}

/* ─── Admin Page ──────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(SESSION_KEY) === "1");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"domains" | "webhook" | "webmail">("webmail");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "1");
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
              <div className="absolute inset-0 rounded-2xl grad-animated blur-xl opacity-30" />
              <div className="relative h-16 w-16 rounded-2xl bg-red-950/30 border border-red-800/40 flex items-center justify-center">
                <Lock className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Access</h1>
              <p className="text-sm text-red-900/60 mt-1">Enter your password to continue</p>
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
                className="w-full bg-black/50 border border-red-900/40 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder:text-red-900/40 focus:outline-none focus:border-red-700/60 focus:shadow-[0_0_12px_rgba(220,38,38,0.15)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-800/60 hover:text-red-400 transition-colors"
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2.5 text-sm text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl grad-animated text-white font-bold text-sm transition-all active:scale-[0.99] glow-red-sm hover:opacity-90"
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
            <div className="absolute inset-0 rounded-xl grad-animated blur-md opacity-25" />
            <div className="relative h-10 w-10 rounded-xl bg-red-950/30 border border-red-800/40 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-red-900/50">Webmail · Domains · Webhook</p>
          </div>
        </div>
        <button
          onClick={() => { localStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(""); }}
          className="text-xs text-red-800/60 hover:text-red-400 border border-red-900/30 hover:border-red-700/40 rounded-xl px-4 py-2 transition-all"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/40 border border-red-900/30 rounded-xl p-1">
        {(["webmail", "domains", "webhook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              t === tab
                ? "grad-animated text-white shadow-sm glow-red-sm"
                : "text-red-800/60 hover:text-white hover:bg-red-950/20"
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
