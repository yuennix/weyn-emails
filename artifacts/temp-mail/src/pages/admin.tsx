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
  Activity, ShieldCheck, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ADMIN_PASSWORD = "yuennix";
const SESSION_KEY = "admin_authed";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-background/60 px-3.5 py-2.5">
        <code className="font-mono text-sm text-primary flex-1 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
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
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Domain
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate({ data: { name: newName.trim() } }); }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-primary">New Domain</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. mail.example.com"
              className="flex-1 bg-background/80 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold disabled:opacity-40 transition-all"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-3 py-2.5 rounded-lg border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">Emails to any address @this-domain will be captured</p>
        </form>
      )}

      <div className="rounded-xl border border-white/8 bg-card overflow-hidden divide-y divide-white/5">
        {isLoading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="h-9 w-9 rounded-lg bg-white/8 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 bg-white/8 rounded" />
                <div className="h-3 w-24 bg-white/5 rounded" />
              </div>
            </div>
          ))
        ) : subdomains && subdomains.length > 0 ? (
          subdomains.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {sub.emailCount} email{sub.emailCount !== 1 ? "s" : ""}
                  </span>
                  {sub.unreadCount > 0 && (
                    <span className="text-xs font-semibold text-primary">{sub.unreadCount} new</span>
                  )}
                  <span className="text-xs text-muted-foreground/50">
                    Added {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {deleteConfirm === sub.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">Remove?</span>
                  <button
                    onClick={() => remove.mutate({ id: sub.id })}
                    disabled={remove.isPending}
                    className="px-2.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(sub.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No domains yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Add a domain above to start receiving emails</p>
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
        <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-white/8 bg-card overflow-hidden divide-y divide-white/5">
        {loading ? (
          <div className="px-5 py-4 text-xs text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No webhook calls yet</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Waiting for incoming emails</p>
          </div>
        ) : (
          logs.map((log) => {
            const cfg = STATUS_CONFIG[log.status] ?? { label: log.status, cls: "bg-white/5 text-muted-foreground border-white/10", dot: "bg-white/40" };
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
                <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground truncate">{log.to || "–"}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 truncate">{log.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/40 shrink-0 mt-0.5 font-mono">
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
      <div className="rounded-xl border border-white/8 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Webhook Endpoint</span>
        </div>
        <CopyBlock label="POST URL" value={webhookUrl} />
        <div className="grid grid-cols-2 gap-4">
          <CopyBlock label="Method" value="POST" />
          <CopyBlock label="Content-Type" value="application/json" />
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Payload Schema</span>
        </div>

        <div className="rounded-lg border border-white/8 overflow-hidden">
          <div className="px-4 py-2 bg-white/3 border-b border-white/5">
            <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
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
            <div key={f} className="grid grid-cols-12 items-center px-4 py-2.5 border-t border-white/5 hover:bg-white/2 transition-colors text-xs">
              <code className="col-span-3 font-mono text-primary">{f}</code>
              <code className="col-span-2 font-mono text-muted-foreground">{t}</code>
              <span className="col-span-2">
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${r ? "bg-primary/10 text-primary border-primary/20" : "bg-white/5 text-muted-foreground border-white/10"}`}>
                  {r ? "required" : "optional"}
                </span>
              </span>
              <span className="col-span-5 text-muted-foreground">{d}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Example JSON</p>
            <button
              onClick={() => { navigator.clipboard.writeText(PAYLOAD); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {copiedPayload ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              {copiedPayload ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="rounded-lg border border-white/8 bg-background/60 p-4 font-mono text-xs text-muted-foreground whitespace-pre overflow-x-auto">{PAYLOAD}</pre>
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
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-primary" />
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
                className="w-full bg-card border border-white/10 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all shadow-lg shadow-primary/20 active:scale-[0.99]"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Manage domains and webhook settings</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(""); }}
          className="text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border border-white/8 rounded-lg overflow-hidden bg-card p-1">
        {(["domains", "webhook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
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
