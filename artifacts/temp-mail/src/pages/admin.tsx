import { useState, useEffect } from "react";
import {
  useListSubdomains,
  useCreateSubdomain,
  useDeleteSubdomain,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Globe, Plus, Trash2, Loader2, Eye, EyeOff,
  Webhook, Copy, Check, Code2, Lock, Mail,
  Activity, ShieldCheck, AlertCircle, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ADMIN_PASSWORD = "yuennix";
const SESSION_KEY = "admin_authed";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-3">
        <code className="font-mono text-sm text-primary flex-1 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
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

function DomainsPanel() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: subdomains, isLoading } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  const create = useCreateSubdomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
        setNewName("");
        setShowAdd(false);
      },
    },
  });

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subdomains?.length ?? 0} domain{subdomains?.length !== 1 ? "s" : ""} registered
        </p>
        <button
          onClick={() => { setShowAdd((v) => !v); setNewName(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md shadow-primary/25 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">New Domain</p>
            <button onClick={() => { setShowAdd(false); setNewName(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate({ data: { name: newName.trim() } }); }}
            className="space-y-3"
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. mail.example.com"
              className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <p className="text-xs text-muted-foreground">All emails to any address @this-domain will be captured</p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={create.isPending || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold disabled:opacity-40 transition-all"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Domain"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewName(""); }}
                className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-5 animate-pulse">
              <div className="h-11 w-11 rounded-xl bg-white/8 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-white/8 rounded-lg" />
                <div className="h-3 w-28 bg-white/5 rounded-lg" />
              </div>
            </div>
          ))
        ) : subdomains && subdomains.length > 0 ? (
          subdomains.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {sub.emailCount} email{sub.emailCount !== 1 ? "s" : ""}
                  </span>
                  {sub.unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                      {sub.unreadCount} new
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/40">
                    Added {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {deleteConfirm === sub.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => remove.mutate({ id: sub.id })}
                    disabled={remove.isPending}
                    className="px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
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
                  className="shrink-0 p-2 rounded-xl hover:bg-destructive/12 text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-white">No domains yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a domain above to start receiving emails</p>
          </div>
        )}
      </div>
    </div>
  );
}

type WebhookLogEntry = {
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

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  success:   { label: "Delivered",  cls: "bg-green-500/10 text-green-400 border-green-500/20",   dot: "bg-green-400" },
  rejected:  { label: "Rejected",   cls: "bg-red-500/10 text-red-400 border-red-500/20",         dot: "bg-red-400" },
  no_domain: { label: "No Domain",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",   dot: "bg-amber-400" },
  error:     { label: "Error",      cls: "bg-red-500/10 text-red-400 border-red-500/20",         dot: "bg-red-400" },
};

function WebhookActivityLog() {
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/webhook/logs`);
      if (res.ok) setLogs(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Recent Activity</span>
        </div>
        <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {loading ? (
          <div className="px-5 py-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-white">No webhook activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">Waiting for incoming emails</p>
          </div>
        ) : (
          logs.map((log) => {
            const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, cls: "bg-white/5 text-muted-foreground border-white/10", dot: "bg-white/40" };
            return (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
                <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{log.to || "–"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/60 truncate">{log.message}</p>
                </div>
                <span className="text-[11px] text-muted-foreground/40 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function WebhookPanel() {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const webhookUrl = import.meta.env.VITE_PUBLIC_URL
    ? `${import.meta.env.VITE_PUBLIC_URL}/api/webhook/email`
    : __REPLIT_DEV_DOMAIN__
      ? `https://${__REPLIT_DEV_DOMAIN__}/api/webhook/email`
      : `${window.location.origin}/api/webhook/email`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Webhook Endpoint</span>
        </div>
        <CopyBlock label="POST URL" value={webhookUrl} />
        <div className="grid grid-cols-2 gap-3">
          <CopyBlock label="Method" value="POST" />
          <CopyBlock label="Content-Type" value="application/json" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Payload Schema</span>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-white/3 border-b border-border">
            <div className="grid grid-cols-12 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span className="col-span-3">Field</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-2">Required</span>
              <span className="col-span-5">Description</span>
            </div>
          </div>
          {[
            { f: "from",     t: "string",  r: true,  d: "Sender email address" },
            { f: "to",       t: "string",  r: true,  d: "Recipient — must match a registered domain" },
            { f: "subject",  t: "string",  r: true,  d: "Email subject line" },
            { f: "bodyText", t: "string",  r: false, d: "Plain text body" },
            { f: "bodyHtml", t: "string",  r: false, d: "HTML body (optional)" },
          ].map(({ f, t, r, d }) => (
            <div key={f} className="grid grid-cols-12 items-center px-4 py-3 border-t border-border hover:bg-white/2 transition-colors text-xs">
              <code className="col-span-3 font-mono text-primary">{f}</code>
              <code className="col-span-2 font-mono text-muted-foreground">{t}</code>
              <span className="col-span-2">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r ? "bg-primary/10 text-primary border-primary/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                  {r ? "required" : "optional"}
                </span>
              </span>
              <span className="col-span-5 text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Example JSON</p>
            <button
              onClick={() => { navigator.clipboard.writeText(PAYLOAD); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-lg hover:bg-white/5"
            >
              {copiedPayload ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedPayload ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl border border-border bg-background/60 p-4 font-mono text-xs text-muted-foreground whitespace-pre overflow-x-auto">{PAYLOAD}</pre>
        </div>
      </div>

      <WebhookActivityLog />
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"domains" | "webhook">("domains");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Access</h1>
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
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.99]"
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
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage domains and webhook settings</p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(""); }}
          className="text-sm text-muted-foreground hover:text-foreground border border-border hover:border-white/20 rounded-xl px-4 py-2 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border border-border rounded-xl overflow-hidden bg-card/50 p-1">
        {(["domains", "webhook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {t === "domains" ? "Domains" : "Webhook Setup"}
          </button>
        ))}
      </div>

      {tab === "domains" ? <DomainsPanel /> : <WebhookPanel />}
    </div>
  );
}
