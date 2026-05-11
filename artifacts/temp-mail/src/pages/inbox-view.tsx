import { useState, useEffect, useCallback } from "react";
import { useSearch, useLocation } from "wouter";
import { ArrowLeft, Mail, MailOpen, Trash2, ChevronDown, ChevronRight, RefreshCw, Copy, Check } from "lucide-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";

export default function InboxView() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const address = params.get("address") ?? "";

  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  const handleExpand = async (email: InboxEmail) => {
    const isOpen = expandedId === email.id;
    setExpandedId(isOpen ? null : email.id);
    if (!isOpen && !email.isRead) {
      await markEmailRead(email.id);
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, isRead: true } : e));
    }
  };

  const handleDelete = async (id: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    await deleteEmail(id);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;

  if (!address) { navigate("/"); return null; }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm font-bold text-white truncate">{address}</h1>
            <button
              onClick={copyAddress}
              className="shrink-0 p-1 rounded hover:bg-white/5 text-white/30 hover:text-violet-400 transition-colors"
            >
              {copiedAddress ? <Check className="h-3.5 w-3.5 text-violet-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-white/30">{emails.length} emails</span>
            {unreadCount > 0 && (
              <span className="text-xs font-mono font-bold text-violet-400">{unreadCount} unread</span>
            )}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="shrink-0 p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <h2 className="text-xl font-bold text-white">Inbox</h2>

      <div className="rounded-2xl border border-white/10 bg-[#13112a] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-white/5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
                <div className="h-3.5 w-48 bg-white/10 rounded" />
                <div className="h-3 w-64 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-red-400/60" />
            </div>
            <p className="font-semibold text-white">{error}</p>
            <p className="text-sm text-white/40 mt-1">Make sure this domain is registered under Domains</p>
          </div>
        ) : emails.length > 0 ? (
          <div className="divide-y divide-white/5">
            {emails.map((email) => {
              const expanded = expandedId === email.id;
              return (
                <div key={email.id}>
                  <div
                    className="group flex items-start gap-3 px-4 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleExpand(email)}
                  >
                    <div className="mt-1 shrink-0">
                      {email.isRead
                        ? <MailOpen className="h-4 w-4 text-white/20" />
                        : <div className="h-2.5 w-2.5 rounded-full bg-violet-500 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${email.isRead ? "text-white/40" : "text-white"}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-white/30 truncate mt-0.5">{email.fromAddress}</p>
                      <p className="font-mono text-[11px] text-white/20 mt-1">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDelete(email.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-600/10 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {expanded
                        ? <ChevronDown className="h-4 w-4 text-white/30" />
                        : <ChevronRight className="h-4 w-4 text-white/30" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-white/5 bg-[#0f0d1f] px-4 py-4 space-y-4">
                      <div className="grid grid-cols-1 gap-1.5 font-mono text-xs text-white/40">
                        <div><span className="text-white/25">From:</span> <span className="text-white/70">{email.fromAddress}</span></div>
                        <div><span className="text-white/25">To:</span> <span className="text-violet-400">{email.toAddress}</span></div>
                        <div><span className="text-white/25">Date:</span> <span className="text-white/70">{format(new Date(email.receivedAt), "MMM d, yyyy 'at' HH:mm")}</span></div>
                      </div>
                      <div className="border-t border-white/5 pt-4">
                        {email.bodyHtml ? (
                          <div
                            className="text-sm text-white/75 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                          />
                        ) : (
                          <pre className="font-mono text-xs text-white/60 whitespace-pre-wrap break-words leading-relaxed">{email.bodyText || "(no content)"}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-600/10 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-violet-500/30" />
            </div>
            <p className="font-semibold text-white">No emails yet</p>
            <p className="text-sm font-mono text-white/30 mt-1">{address}</p>
            <p className="text-xs text-white/20 mt-1">Emails will appear here automatically</p>
          </div>
        )}
      </div>
    </div>
  );
}
