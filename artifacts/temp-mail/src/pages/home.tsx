import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shuffle, Copy, Check, Mail, Trash2,
  RefreshCw, Inbox, ChevronDown, ChevronRight, ArrowRight,
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
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [anyAddress, setAnyAddress] = useState("");

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
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;
  const selectedEmail = emails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-4">

      {/* ── Address Generator Card ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/20">
        {/* Header label */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Your Temporary Email</p>

          {/* Alias + domain builder */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openInbox(fullAddress)}
              placeholder="alias"
              className="flex-1 min-w-0 bg-transparent text-base font-mono text-white placeholder:text-muted-foreground focus:outline-none"
            />
            <span className="text-muted-foreground font-mono text-sm shrink-0 select-none">@</span>
            {subdomains && subdomains.length > 0 ? (
              <select
                value={domainId ?? ""}
                onChange={(e) => setDomainId(Number(e.target.value))}
                className="bg-transparent font-mono text-sm text-white focus:outline-none cursor-pointer shrink-0 max-w-[140px]"
              >
                {subdomains.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0c1220] text-white">{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-sm text-muted-foreground/50 shrink-0">no domain</span>
            )}
            <button
              onClick={() => setAlias(randomAlias())}
              title="Generate random alias"
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Copy + Open buttons */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={copyAddress}
            disabled={!fullAddress}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              copiedAddress
                ? "bg-green-500/15 border border-green-500/30 text-green-400"
                : "bg-white/6 border border-border hover:bg-white/10 text-foreground disabled:opacity-40"
            }`}
          >
            {copiedAddress ? (
              <><Check className="h-4 w-4" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy Address</>
            )}
          </button>
          <button
            onClick={() => openInbox(fullAddress)}
            disabled={!fullAddress}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-semibold text-sm transition-all shadow-md shadow-primary/25 active:scale-[0.98]"
          >
            <Inbox className="h-4 w-4" />
            Open Inbox
          </button>
        </div>

        {/* Divider + any address row */}
        <div className="border-t border-border px-5 py-3 flex items-center gap-2 bg-white/1">
          <input
            type="text"
            value={anyAddress}
            onChange={(e) => setAnyAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && anyAddress.trim() && openInbox(anyAddress.trim())}
            placeholder={selectedDomain ? `or check any address @${selectedDomain.name}` : "or enter any full email address"}
            className="flex-1 min-w-0 bg-transparent text-xs font-mono text-white placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <button
            onClick={() => anyAddress.trim() && openInbox(anyAddress.trim())}
            disabled={!anyAddress.trim()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 disabled:opacity-30 text-muted-foreground hover:text-white text-xs font-medium transition-colors"
          >
            Check <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Inbox Panel ── */}
      {activeAddress && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/20">

          {/* Inbox header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-sm text-white font-semibold truncate">{activeAddress}</span>
                <button
                  onClick={copyAddress}
                  className="p-1 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  {copiedAddress ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{emails.length} messages</span>
                {unreadCount > 0 && (
                  <span className="text-primary font-semibold">{unreadCount} unread</span>
                )}
                {lastRefreshed && (
                  <span className="text-muted-foreground/40 text-[11px]">
                    updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => load(activeAddress, true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors disabled:opacity-40"
              title="Refresh inbox"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Email list */}
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-36 bg-white/8 rounded-lg" />
                    <div className="h-3 w-52 bg-white/5 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-destructive/60" />
              </div>
              <p className="text-sm font-semibold text-white">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Make sure this domain is registered under Domains</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-sm font-semibold text-white">Waiting for emails</p>
              <p className="text-xs text-muted-foreground mt-1.5">Share the address above and emails will appear here</p>
              <div className="flex items-center gap-1.5 mt-4 text-[11px] text-muted-foreground/40 bg-white/3 border border-white/5 rounded-full px-3 py-1.5">
                <RefreshCw className="h-3 w-3" />
                Auto-refreshes every 15 seconds
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((email) => {
                const isSelected = selectedId === email.id;
                const color = avatarColor(email.fromAddress);
                return (
                  <div key={email.id}>
                    <div
                      className={`group flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/8 border-l-[3px] border-primary"
                          : "hover:bg-white/3 border-l-[3px] border-transparent"
                      }`}
                      onClick={() => handleSelect(email)}
                    >
                      {/* Avatar */}
                      <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                        {senderInitials(email.fromAddress)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!email.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                          <span className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "text-white font-semibold"}`}>
                            {senderName(email.fromAddress)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${email.isRead ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                          {email.subject}
                        </p>
                      </div>

                      {/* Time + actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground/40 hidden sm:block">
                          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                        </span>
                        <button
                          onClick={(e) => handleDelete(email.id, e)}
                          className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {isSelected
                          ? <ChevronDown className="h-4 w-4 text-primary" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
                      </div>
                    </div>

                    {/* Expanded email */}
                    {isSelected && selectedEmail && (
                      <div className="border-t border-border bg-background/50">
                        <div className="px-5 py-4 border-b border-border space-y-1.5">
                          <p className="text-sm font-bold text-white">{selectedEmail.subject}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                            <span><span className="text-muted-foreground/40">From </span>{selectedEmail.fromAddress}</span>
                            <span><span className="text-muted-foreground/40">To </span><span className="text-primary">{selectedEmail.toAddress}</span></span>
                            <span className="text-muted-foreground/40">{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy · HH:mm")}</span>
                          </div>
                        </div>
                        <div className="px-5 py-5">
                          {selectedEmail.bodyHtml ? (
                            <div
                              className="prose prose-sm max-w-none text-foreground/85 leading-relaxed
                                [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline
                                [&_img]:max-w-full [&_img]:rounded-xl
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

          {/* Auto-refresh footer */}
          {emails.length > 0 && (
            <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border bg-white/1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400/70 animate-pulse" />
              <span className="text-[11px] text-muted-foreground/40">Auto-refreshing every 15 seconds</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
