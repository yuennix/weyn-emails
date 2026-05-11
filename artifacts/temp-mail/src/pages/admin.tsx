import { useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ADMIN_PASSWORD = "yuennix";
const SESSION_KEY = "admin_authed";

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs text-white/30 uppercase tracking-wider">{label}</p>
      <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e1a3a] px-3 py-2.5">
        <code className="font-mono text-sm text-violet-400 flex-1 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1 rounded hover:bg-violet-500/10 text-white/30 hover:text-violet-400 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-violet-400" /> : <Copy className="h-3.5 w-3.5" />}
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

  const { data: subdomains, isLoading } = useListSubdomains({
    query: { queryKey: getListSubdomainsQueryKey() },
  });

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
        <span className="text-sm text-white/40">
          {subdomains?.length ?? 0} domain{subdomains?.length !== 1 ? "s" : ""} registered
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add domain
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate({ data: { name: newName.trim() } }); }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. exceweyn.run.place"
              className="flex-1 bg-[#1e1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-3 py-2.5 rounded-xl border border-white/10 bg-[#1e1a3a] text-sm text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="font-mono text-[10px] text-white/25 px-1">
            Emails sent to any address @this-domain will be captured
          </p>
        </form>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0f0d1f] overflow-hidden divide-y divide-white/5">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
              <div className="h-3.5 w-48 bg-white/10 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          ))
        ) : subdomains && subdomains.length > 0 ? (
          subdomains.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
              <div className="h-8 w-8 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
                <Globe className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-white/30">
                    <Mail className="h-3 w-3" />
                    {sub.emailCount} emails
                    {sub.unreadCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 font-mono text-[10px]">
                        {sub.unreadCount} new
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-white/20">
                    {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {deleteConfirm === sub.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40">Remove?</span>
                  <button
                    onClick={() => remove.mutate({ id: sub.id })}
                    disabled={remove.isPending}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                  >
                    {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-white text-xs transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(sub.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-red-600/10 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove domain"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Globe className="h-7 w-7 text-white/15 mb-2" />
            <p className="text-sm text-white/40">No domains yet — add one above</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookPanel() {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const webhookUrl = `${window.location.origin}/api/webhook/email`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0f0d1f] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-white text-sm">Webhook Endpoint</span>
        </div>
        <CopyBlock label="URL" value={webhookUrl} />
        <CopyBlock label="Method" value="POST" />
        <CopyBlock label="Content-Type" value="application/json" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0f0d1f] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-white text-sm">Payload Format</span>
        </div>
        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {[
            { f: "from", t: "string", r: true, d: "Sender email" },
            { f: "to", t: "string", r: true, d: "Recipient — must match a registered domain" },
            { f: "subject", t: "string", r: true, d: "Email subject" },
            { f: "bodyText", t: "string", r: true, d: "Plain text body" },
            { f: "bodyHtml", t: "string", r: false, d: "Optional HTML body" },
          ].map(({ f, t, r, d }) => (
            <div key={f} className="flex items-center gap-3 px-3 py-2 text-xs">
              <code className="font-mono text-violet-400 w-20 shrink-0">{f}</code>
              <code className="font-mono text-white/30 w-14 shrink-0">{t}</code>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${r ? "bg-violet-600/20 text-violet-400" : "bg-white/5 text-white/30"}`}>
                {r ? "req" : "opt"}
              </span>
              <span className="text-white/40">{d}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-white/30 uppercase tracking-wider">Example</p>
            <button
              onClick={() => { navigator.clipboard.writeText(PAYLOAD); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000); }}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-violet-400 transition-colors"
            >
              {copiedPayload ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Copy
            </button>
          </div>
          <pre className="rounded-xl border border-white/10 bg-[#1e1a3a] p-3 font-mono text-xs text-white/60 whitespace-pre overflow-x-auto">{PAYLOAD}</pre>
        </div>
      </div>
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
      setError("Incorrect password");
    }
  };

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-violet-600/15 flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7 text-violet-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-white/40">Enter the admin password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full bg-[#1e1a3a] border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-white/40 mt-0.5">Manage domains and webhook settings</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(""); }}
          className="text-sm text-white/30 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#13112a] rounded-2xl border border-white/5">
        {(["domains", "webhook"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-violet-600 text-white shadow"
                : "text-white/40 hover:text-white"
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
