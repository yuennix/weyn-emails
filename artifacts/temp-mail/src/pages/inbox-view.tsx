import { useState, useEffect, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import {
  ArrowLeft, Mail, MailOpen, Trash2, RefreshCw,
  Copy, Check, ChevronRight, ChevronDown, Inbox,
} from "lucide-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { EmailBody } from "@/components/email-body";

function senderInitials(from: string) {
  const name = from.split("<")[0].trim() || from;
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function senderName(from: string) {
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return from.split("@")[0];
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-emerald-600",
  "bg-amber-600", "bg-rose-600", "bg-cyan-600",
];

function avatarColor(from: string) {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function InboxView() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const address = params.get("address") ?? "";

  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
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
  }, [address]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  const handleSelect = async (email: InboxEmail) => {
    setSelectedId((prev) => prev === email.id ? null : email.id);
    if (!email.isRead) {
      await markEmailRead(email.id);
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, isRead: true } : e));
    }
  };

  const handleDelete = async (id: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    await deleteEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const selectedEmail = emails.find((e) => e.id === selectedId);

  if (!address) { navigate("/"); return null; }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/")}
          className="mt-0.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white tracking-tight truncate font-mono">{address}</h1>
            <button
              onClick={copyAddress}
              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
              title="Copy address"
            >
              {copiedAddress ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">{emails.length} messages</span>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-primary">{unreadCount} unread</span>
            )}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="mt-0.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Email list */}
      <div className="rounded-xl border border-white/8 bg-card overflow-hidden shadow-xl shadow-black/20">
        {loading ? (
          <div className="divide-y divide-white/5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 bg-white/8 rounded" />
                  <div className="h-3 w-64 bg-white/5 rounded" />
                </div>
                <div className="h-3 w-16 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-14 w-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-destructive/60" />
            </div>
            <p className="font-semibold text-white text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">Make sure this domain is registered in the Domains page.</p>
            <button
              onClick={() => navigate("/domains")}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Manage domains →
            </button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-primary/40" />
            </div>
            <p className="font-semibold text-white text-sm">Inbox is empty</p>
            <p className="text-xs text-muted-foreground mt-1.5 font-mono">{address}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Emails will appear here automatically</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-white/5 bg-white/2">
              <div className="w-9 shrink-0" />
              <div className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Sender / Subject</div>
              <div className="w-24 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right shrink-0">Time</div>
              <div className="w-8 shrink-0" />
            </div>
            <div className="divide-y divide-white/5">
              {emails.map((email) => {
                const isSelected = selectedId === email.id;
                const color = avatarColor(email.fromAddress);
                return (
                  <div key={email.id}>
                    <div
                      className={`group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/8 border-l-2 border-primary"
                          : "hover:bg-white/3 border-l-2 border-transparent"
                      }`}
                      onClick={() => handleSelect(email)}
                    >
                      {/* Avatar */}
                      <div className={`h-9 w-9 rounded-full ${color} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                        {senderInitials(email.fromAddress)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!email.isRead && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span className={`text-sm truncate ${email.isRead ? "text-muted-foreground font-normal" : "text-white font-semibold"}`}>
                            {senderName(email.fromAddress)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${email.isRead ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {email.subject}
                        </p>
                      </div>

                      {/* Time + actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
                          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                        </span>
                        <button
                          onClick={(e) => handleDelete(email.id, e)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {isSelected
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
                      </div>
                    </div>

                    {/* Expanded email */}
                    {isSelected && selectedEmail && (
                      <div className="border-t border-white/5 bg-background/40">
                        {/* Meta */}
                        <div className="px-5 py-4 border-b border-white/5 space-y-1.5">
                          <h2 className="text-base font-semibold text-white">{selectedEmail.subject}</h2>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
                            <span><span className="text-muted-foreground/50">From </span>{selectedEmail.fromAddress}</span>
                            <span><span className="text-muted-foreground/50">To </span><span className="text-primary">{selectedEmail.toAddress}</span></span>
                            <span>{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy 'at' HH:mm")}</span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-5">
                          <EmailBody bodyHtml={selectedEmail.bodyHtml} bodyText={selectedEmail.bodyText} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
