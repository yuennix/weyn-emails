import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shuffle, Copy, Check, Mail, MailOpen, Trash2,
  RefreshCw, ChevronRight, ChevronDown, Inbox, ArrowRight,
} from "lucide-react";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";

const ADJECTIVES = ["swift", "dark", "cool", "bold", "quick", "lazy", "bright", "wild", "silent", "sharp"];
const NOUNS = ["fox", "bear", "hawk", "wolf", "lynx", "raven", "pike", "crane", "viper", "jade"];

function randomAlias() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${a}${n}${num}`;
}

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

export default function Home() {
  const [alias, setAlias] = useState(randomAlias);
  const [domainId, setDomainId] = useState<number | null>(null);
  const [anyAddress, setAnyAddress] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);

  const [activeAddress, setActiveAddress] = useState("");
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: subdomains } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  useEffect(() => {
    if (subdomains && subdomains.length > 0 && domainId === null) {
      setDomainId(subdomains[0].id);
    }
  }, [subdomains, domainId]);

  const selectedDomain = subdomains?.find((s) => s.id === domainId);
  const fullAddress = selectedDomain && alias.trim()
    ? `${alias.trim().toLowerCase()}@${selectedDomain.name}`
    : "";

  const load = useCallback(async (address: string, silent = false) => {
    if (!address) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await fetchInbox(address);
      setEmails(data.emails);
      setLastRefreshed(new Date());
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load inbox");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const openInbox = (address: string) => {
    if (!address) return;
    setActiveAddress(address);
    setSelectedId(null);
    setEmails([]);
    setError(null);
    load(address);
  };

  useEffect(() => {
    if (!activeAddress) return;
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => load(activeAddress, true), 15000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [activeAddress, load]);

  useEffect(() => {
    if (fullAddress && !activeAddress) {
      openInbox(fullAddress);
    }
  }, [fullAddress]);

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
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const selectedEmail = emails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-3">
      {/* ── Compact address picker ── */}
      <div className="rounded-xl border border-white/8 bg-card shadow-lg shadow-black/20 overflow-hidden">
        {/* Row 1: alias builder */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/5">
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openInbox(fullAddress)}
            placeholder="alias"
            className="flex-1 min-w-0 bg-transparent text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none"
          />
          <span className="text-muted-foreground font-mono text-xs shrink-0 select-none">@</span>
          {subdomains && subdomains.length > 0 ? (
            <select
              value={domainId ?? ""}
              onChange={(e) => setDomainId(Number(e.target.value))}
              className="bg-transparent font-mono text-xs text-white focus:outline-none cursor-pointer shrink-0 max-w-[130px]"
            >
              {subdomains.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0c1220] text-white">{s.name}</option>
              ))}
            </select>
          ) : (
            <span className="font-mono text-xs text-muted-foreground/50 shrink-0">no domain</span>
          )}
          <button
            onClick={() => setAlias(randomAlias())}
            title="Generate random alias"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors shrink-0"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openInbox(fullAddress)}
            disabled={!fullAddress}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-xs font-semibold transition-all"
          >
            Open
          </button>
        </div>

        {/* Row 2: access any inbox */}
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="text"
            value={anyAddress}
            onChange={(e) => setAnyAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && anyAddress.trim() && openInbox(anyAddress.trim())}
            placeholder={selectedDomain ? `or type any address @${selectedDomain.name}` : "or enter any full address"}
            className="flex-1 min-w-0 bg-transparent text-xs font-mono text-white placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <button
            onClick={() => anyAddress.trim() && openInbox(anyAddress.trim())}
            disabled={!anyAddress.trim()}
            className="shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-white/8 hover:bg-white/15 disabled:opacity-30 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Inbox ── */}
      {activeAddress && (
        <div className="rounded-xl border border-white/8 bg-card overflow-hidden shadow-xl shadow-black/20">
          {/* Inbox header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-white truncate">{activeAddress}</span>
                <button
                  onClick={copyAddress}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  {copiedAddress ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{emails.length} messages</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold text-primary">{unreadCount} unread</span>
                )}
                {lastRefreshed && (
                  <span className="text-[10px] text-muted-foreground/40">
                    refreshed {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => load(activeAddress, true)}
              disabled={refreshing}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors disabled:opacity-40"
              title="Refresh inbox"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Email list */}
          {loading ? (
            <div className="divide-y divide-white/5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-white/8 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 bg-white/8 rounded" />
                    <div className="h-2.5 w-52 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
                <Mail className="h-5 w-5 text-destructive/60" />
              </div>
              <p className="text-sm font-semibold text-white">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Make sure this domain is registered under Domains</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-3">
                <Inbox className="h-6 w-6 text-primary/40" />
              </div>
              <p className="text-sm font-semibold text-white">Inbox is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Emails will appear here automatically</p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground/50">
                <RefreshCw className="h-3 w-3" />
                Auto-refreshes every 15 seconds
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {emails.map((email) => {
                const isSelected = selectedId === email.id;
                const color = avatarColor(email.fromAddress);
                return (
                  <div key={email.id}>
                    <div
                      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/8 border-l-2 border-primary"
                          : "hover:bg-white/3 border-l-2 border-transparent"
                      }`}
                      onClick={() => handleSelect(email)}
                    >
                      {/* Avatar */}
                      <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0 text-white text-[11px] font-bold`}>
                        {senderInitials(email.fromAddress)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!email.isRead && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span className={`text-xs truncate ${email.isRead ? "text-muted-foreground" : "text-white font-semibold"}`}>
                            {senderName(email.fromAddress)}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${email.isRead ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                          {email.subject}
                        </p>
                      </div>

                      {/* Time + actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                        </span>
                        <button
                          onClick={(e) => handleDelete(email.id, e)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {isSelected
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />}
                      </div>
                    </div>

                    {/* Expanded email content */}
                    {isSelected && selectedEmail && (
                      <div className="border-t border-white/5 bg-background/50">
                        <div className="px-4 py-3 border-b border-white/5 space-y-1">
                          <p className="text-sm font-semibold text-white">{selectedEmail.subject}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono text-muted-foreground">
                            <span><span className="text-muted-foreground/40">From </span>{selectedEmail.fromAddress}</span>
                            <span><span className="text-muted-foreground/40">To </span><span className="text-primary">{selectedEmail.toAddress}</span></span>
                            <span>{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy HH:mm")}</span>
                          </div>
                        </div>
                        <div className="px-4 py-4">
                          {selectedEmail.bodyHtml ? (
                            <div
                              className="prose prose-sm max-w-none text-foreground/85 leading-relaxed
                                [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline
                                [&_img]:max-w-full [&_img]:rounded-lg
                                [&_p]:text-foreground/75 [&_p]:mb-3 [&_p]:text-sm
                                [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white
                                [&_blockquote]:border-l-2 [&_blockquote]:border-white/10 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
                              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                            />
                          ) : (
                            <pre className="font-mono text-xs text-foreground/75 whitespace-pre-wrap break-words leading-relaxed">
                              {selectedEmail.bodyText || "(no content)"}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: auto-refresh indicator */}
          {emails.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 px-4 py-2 border-t border-white/5 bg-white/1">
              <div className="h-1 w-1 rounded-full bg-green-400/60 animate-pulse" />
              <span className="text-[10px] text-muted-foreground/40">Auto-refreshing every 15 seconds</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
