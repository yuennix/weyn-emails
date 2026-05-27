import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shuffle, Copy, Check, Trash2,
  RefreshCw, Inbox, ChevronDown, ChevronRight, ArrowRight,
  Mail, Sparkles, Crown, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { EmailBody } from "@/components/email-body";
import { useUserTier } from "@/hooks/use-user-tier";

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

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

function avatarGradient(from: string) {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function isFacebookCode(email: InboxEmail): boolean {
  const subject = (email.subject ?? "").toLowerCase();
  const from = (email.fromAddress ?? "").toLowerCase();
  const body = ((email.bodyText ?? "") + (email.bodyHtml ?? "")).toLowerCase();

  const isFacebook =
    from.includes("facebook") ||
    subject.includes("facebook") ||
    subject.includes("fb") ||
    body.includes("facebook");

  const hasEightDigitCode = /\b\d{8}\b/.test(email.bodyText ?? "") || /\b\d{8}\b/.test(email.subject ?? "");

  return isFacebook && hasEightDigitCode;
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

  const { tier, isSignedIn } = useUserTier();
  const isFree = tier === "free";
  const isPremium = tier === "premium";

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
    autoRefreshRef.current = setInterval(() => load(activeAddress, true), 5000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [activeAddress, load]);

  useEffect(() => {
    if (fullAddress && !activeAddress) openInbox(fullAddress);
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

  // Apply free tier filter: only show Facebook 8-digit security code emails
  const visibleEmails = isFree ? emails.filter(isFacebookCode) : emails;
  const hiddenCount = emails.length - visibleEmails.length;

  const unreadCount = visibleEmails.filter((e) => !e.isRead).length;
  const selectedEmail = visibleEmails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-4">

      {/* ── Free Tier Banner ── */}
      {isFree && (
        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/20 bg-gradient-to-r from-yellow-500/8 to-amber-500/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-yellow-300 mb-0.5">Free Plan — Limited Access</p>
              <p className="text-xs text-yellow-200/50 leading-relaxed">
                You can only receive <span className="text-yellow-300 font-semibold">Facebook 8-digit security codes</span>.
                {!isSignedIn
                  ? " Sign up for a free account to get started, or upgrade to Premium for all platforms."
                  : " Upgrade to Premium to receive emails from all platforms with no limitations."}
              </p>
            </div>
            {isSignedIn ? (
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 text-xs font-bold">
                  <Crown className="h-3 w-3" />
                  Upgrade
                </span>
              </div>
            ) : (
              <Link
                href="/sign-up"
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500/30 transition-all"
              >
                Sign Up
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Address Generator Card ── */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/30 via-violet-500/15 to-transparent p-px">
          <div className="h-full w-full rounded-2xl bg-card" />
        </div>

        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        <div className="relative">
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Your Temporary Email</p>
            </div>

            {/* Alias + domain row */}
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-950/30 px-4 py-3 focus-within:border-indigo-500/50 focus-within:bg-indigo-950/40 transition-all">
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && openInbox(fullAddress)}
                placeholder="alias"
                className="flex-1 min-w-0 bg-transparent text-base font-mono font-semibold text-white placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="text-indigo-400/60 font-mono text-sm shrink-0 select-none">@</span>
              {subdomains && subdomains.length > 0 ? (
                <select
                  value={domainId ?? ""}
                  onChange={(e) => setDomainId(Number(e.target.value))}
                  className="bg-transparent font-mono text-sm text-indigo-300 focus:outline-none cursor-pointer shrink-0 max-w-[160px]"
                >
                  {subdomains.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#080d1a] text-white">{s.name}</option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-sm text-muted-foreground/40 shrink-0">no domain</span>
              )}
              <button
                onClick={() => setAlias(randomAlias())}
                title="Generate random alias"
                className="p-2 rounded-lg text-indigo-400/60 hover:text-indigo-300 hover:bg-indigo-500/15 transition-all shrink-0"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-5 pb-4">
            <button
              onClick={copyAddress}
              disabled={!fullAddress}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
                copiedAddress
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-white/5 border-border hover:bg-white/8 hover:border-white/20 text-foreground disabled:opacity-40"
              }`}
            >
              {copiedAddress
                ? <><Check className="h-4 w-4" /> Copied!</>
                : <><Copy className="h-4 w-4" /> Copy Address</>
              }
            </button>
            <button
              onClick={() => openInbox(fullAddress)}
              disabled={!fullAddress}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl btn-gradient disabled:opacity-40 text-white font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <Inbox className="h-4 w-4" />
              Open Inbox
            </button>
          </div>

          {/* Check any address row */}
          <div className="border-t border-border/60 px-5 py-3 flex items-center gap-2 bg-white/[0.02]">
            <input
              type="text"
              value={anyAddress}
              onChange={(e) => setAnyAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && anyAddress.trim() && openInbox(anyAddress.trim())}
              placeholder={selectedDomain ? `or check any address @${selectedDomain.name}` : "or enter any full email address"}
              className="flex-1 min-w-0 bg-transparent text-xs font-mono text-white placeholder:text-muted-foreground/40 focus:outline-none"
            />
            <button
              onClick={() => anyAddress.trim() && openInbox(anyAddress.trim())}
              disabled={!anyAddress.trim()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-30 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-all border border-indigo-500/20"
            >
              Check <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Inbox ── */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
        {/* Inbox header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-950/30 to-transparent">
          <div className="flex-1 min-w-0">
            {activeAddress ? (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-mono text-sm text-white font-semibold truncate">{activeAddress}</span>
                  <button onClick={copyAddress} className="p-1 rounded-md text-muted-foreground hover:text-indigo-400 transition-colors shrink-0">
                    {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{visibleEmails.length} messages</span>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-[11px]">
                      {unreadCount} unread
                    </span>
                  )}
                  {lastRefreshed && (
                    <span className="text-muted-foreground/40 text-[11px]">
                      · updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground/40 italic">No inbox open — enter an address above</p>
            )}
          </div>
          <button
            onClick={() => activeAddress && load(activeAddress, true)}
            disabled={!activeAddress || refreshing}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Email list */}
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-white/8 to-white/4 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-36 bg-white/8 rounded-lg" />
                  <div className="h-3 w-52 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-rose-400/60" />
            </div>
            <p className="text-sm font-semibold text-white">{error}</p>
            <p className="text-xs text-muted-foreground mt-1.5">Make sure this domain is registered in Settings</p>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-xl" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/25 flex items-center justify-center">
                <Inbox className="h-8 w-8 text-indigo-400/60" />
              </div>
            </div>
            <p className="text-sm font-bold text-white">Inbox is empty</p>
            {isFree && hiddenCount > 0 ? (
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                {hiddenCount} email{hiddenCount > 1 ? "s" : ""} received but hidden on Free plan.{" "}
                <span className="text-yellow-400 font-semibold">Upgrade to Premium</span> to see all emails.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1.5">Share your address and emails will appear here instantly</p>
            )}
            <div className="flex items-center gap-2 mt-5 text-[11px] text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/15 rounded-full px-4 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live · checking every 5 seconds
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleEmails.map((email) => {
              const isSelected = selectedId === email.id;
              const grad = avatarGradient(email.fromAddress);
              return (
                <div key={email.id}>
                  <div
                    className={`group flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-950/40 to-transparent border-l-2 border-indigo-500"
                        : "hover:bg-white/[0.025] border-l-2 border-transparent"
                    }`}
                    onClick={() => handleSelect(email)}
                  >
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-md`}>
                      {senderInitials(email.fromAddress)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {!email.isRead && (
                          <div className="h-2 w-2 rounded-full bg-indigo-400 shrink-0 shadow-sm shadow-indigo-400/50" />
                        )}
                        <span className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "text-white font-semibold"}`}>
                          {senderName(email.fromAddress)}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${email.isRead ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                        {email.subject}
                      </p>
                    </div>

                    {/* Time + delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground/30 hidden sm:block font-mono">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: false })}
                      </span>
                      <button
                        onClick={(e) => handleDelete(email.id, e)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/15 text-muted-foreground/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isSelected
                        ? <ChevronDown className="h-4 w-4 text-indigo-400" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground/20" />}
                    </div>
                  </div>

                  {/* Email reader */}
                  {isSelected && selectedEmail && (
                    <div className="border-t border-border bg-gradient-to-b from-indigo-950/20 to-transparent">
                      <div className="px-5 py-4 border-b border-border/60 space-y-2">
                        <p className="text-base font-bold text-white">{selectedEmail.subject}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                          <span><span className="text-muted-foreground/40">From </span><span className="text-slate-300">{selectedEmail.fromAddress}</span></span>
                          <span><span className="text-muted-foreground/40">To </span><span className="text-indigo-400">{selectedEmail.toAddress}</span></span>
                          <span className="text-muted-foreground/30">{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy · HH:mm")}</span>
                        </div>
                      </div>
                      <div className="px-5 py-5">
                        <EmailBody bodyHtml={selectedEmail.bodyHtml} bodyText={selectedEmail.bodyText} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Premium upsell when emails are hidden */}
            {isFree && hiddenCount > 0 && (
              <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-yellow-500/5 to-transparent border-l-2 border-yellow-500/30">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-300">
                    {hiddenCount} email{hiddenCount > 1 ? "s" : ""} hidden
                  </p>
                  <p className="text-xs text-yellow-200/40">Upgrade to Premium to unlock all emails</p>
                </div>
                <Crown className="h-4 w-4 text-yellow-400 shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {visibleEmails.length > 0 && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-border bg-white/[0.015]">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-muted-foreground/30">Live inbox · updates every 5 seconds</span>
          </div>
        )}
      </div>
    </div>
  );
}
