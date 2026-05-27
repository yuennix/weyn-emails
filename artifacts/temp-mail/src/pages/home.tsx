import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shuffle, Copy, Check, Trash2, Trash,
  RefreshCw, Inbox, ChevronDown, ArrowRight,
  Zap, ZapOff, Search, X, Crown, Radio, Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { EmailBody } from "@/components/email-body";
import { useUserTier } from "@/hooks/use-user-tier";

const AUTO_REFRESH_INTERVAL = 15000;
const VIEW_MODE_KEY = "weyn_view_mode";

// ─── Color themes ──────────────────────────────────────────────────────────────
const THEMES = {
  free: {
    btnBg:         "bg-violet-600 hover:bg-violet-700",
    avatarGrad:    "from-violet-500 to-purple-600",
    unreadDot:     "bg-violet-500",
    unreadBadge:   "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300",
    autoOn:        "bg-violet-600 hover:bg-violet-700 text-white border-transparent",
    domainActive:  "text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-950/30",
    domainHover:   "hover:border-violet-300 dark:hover:border-violet-700",
    emptyIconBg:   "from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40",
    emptyIconColor:"text-violet-400",
    codeGrad:      "from-violet-500 to-purple-600",
    accentText:    "text-violet-600 dark:text-violet-400",
    readerTo:      "text-violet-600 dark:text-violet-400",
    ringFocus:     "focus:ring-violet-500",
  },
  premium: {
    btnBg:         "bg-emerald-600 hover:bg-emerald-700",
    avatarGrad:    "from-emerald-500 to-teal-600",
    unreadDot:     "bg-emerald-500",
    unreadBadge:   "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
    autoOn:        "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
    domainActive:  "text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30",
    domainHover:   "hover:border-emerald-300 dark:hover:border-emerald-700",
    emptyIconBg:   "from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40",
    emptyIconColor:"text-emerald-400",
    codeGrad:      "from-emerald-500 to-teal-600",
    accentText:    "text-emerald-600 dark:text-emerald-400",
    readerTo:      "text-emerald-600 dark:text-emerald-400",
    ringFocus:     "focus:ring-emerald-500",
  },
} as const;

// ─── Helper functions ──────────────────────────────────────────────────────────
function generatePrefix(): string {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const adjectives = ["Angry","Blazing","Bright","Calm","Clever","Cosmic","Cozy","Dark","Dreamy","Electric","Epic","Frozen","Funky","Golden","Happy","Icy","Jolly","Lazy","Lucky","Mad","Misty","Moody","Mystic","Quiet","Rapid","Rusty","Salty","Shiny","Sleepy","Slick","Sneaky","Spooky","Sunny","Sweet","Tiny","Vivid","Wild","Zippy"];
  const nouns = ["Anchor","Arrow","Bear","Bird","Blade","Blaze","Cloud","Comet","Diamond","Eagle","Ember","Falcon","Flame","Flash","Fox","Frost","Ghost","Gold","Hammer","Hawk","Hill","Honey","Island","Jet","Knight","Lantern","Light","Lion","Moon","Nova","Oak","Ocean","Petal","Rain","Raven","Rock","Rose","Shadow","Sky","Snow","Spark","Star","Storm","Sun","Tiger","Tower","Wave","Wind","Wolf"];
  const style = Math.floor(Math.random() * 3);
  if (style === 0) return pick(adjectives) + pick(nouns);
  if (style === 1) return pick(adjectives) + pick(nouns) + String(Math.floor(Math.random() * 99) + 1);
  return pick(nouns) + pick(nouns);
}

function senderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return from.split("@")[0];
}

function senderInitial(from: string): string {
  return (senderName(from).charAt(0) || "?").toUpperCase();
}

const isFacebookSender = (from: string) => /facebook/i.test(from);

const hasSecurityCode = (email: InboxEmail) =>
  /\b\d{6}\b/.test([email.subject, email.bodyText].join(" ")) ||
  /\b\d{8}\b/.test([email.subject, email.bodyText].join(" "));

const extractCode = (email: InboxEmail): string | null => {
  const text = [email.subject, email.bodyText].join(" ");
  return text.match(/\b(\d{4,8})\b/)?.[1] ?? null;
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [alias, setAlias] = useState(() => generatePrefix());
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  const [activeAddress, setActiveAddress] = useState("");
  const [directInput, setDirectInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Premium users can toggle to a "free view" experience
  const [premiumViewMode, setPremiumViewMode] = useState<"premium" | "free">(() => {
    try { return (localStorage.getItem(VIEW_MODE_KEY) as "premium" | "free") ?? "premium"; }
    catch { return "premium"; }
  });

  const domainRef = useRef<HTMLDivElement>(null);
  const { tier, isSignedIn } = useUserTier();

  const isPremium = tier === "premium";
  // Which visual theme to apply
  const viewMode = isPremium ? premiumViewMode : "free";
  const theme = THEMES[viewMode];

  const toggleViewMode = () => {
    setPremiumViewMode((prev) => {
      const next = prev === "premium" ? "free" : "premium";
      try { localStorage.setItem(VIEW_MODE_KEY, next); } catch {}
      return next;
    });
  };

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
    if (!autoRefresh || !activeAddress) return;
    const interval = setInterval(doRefetch, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, activeAddress, doRefetch]);

  useEffect(() => {
    if (!activeAddress) return;
    const interval = setInterval(() => load(activeAddress, true), 5000);
    return () => clearInterval(interval);
  }, [activeAddress, load]);

  const openInbox = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) return;
    const prefix = alias.trim().toLowerCase() || generatePrefix();
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
    const prefix = generatePrefix();
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

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(id);
    setTimeout(() => setCodeCopied(null), 2000);
  };

  const clearInbox = async () => {
    if (!activeAddress) return;
    if (!confirm(`Delete all messages in ${activeAddress}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      for (const email of emails) await deleteEmail(email.id);
      setEmails([]);
      setSelectedId(null);
    } catch { } finally { setClearing(false); }
  };

  const deleteInbox = async () => {
    if (!activeAddress) return;
    if (!confirm(`Delete inbox "${activeAddress}" and all its messages?`)) return;
    setClearing(true);
    try {
      for (const email of emails) await deleteEmail(email.id);
    } catch { } finally {
      setClearing(false);
      setActiveAddress("");
      setAlias(generatePrefix());
      setEmails([]);
      setSelectedId(null);
    }
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

  const allEmails = emails;
  // Free tier (or premium in free-view mode) filters to Facebook codes only
  const applyFreeFilter = tier === "free" || (isPremium && premiumViewMode === "free");
  const tierFiltered = applyFreeFilter
    ? allEmails.filter((e) => isFacebookSender(e.fromAddress ?? "") && hasSecurityCode(e))
    : allEmails;
  const visibleEmails = search.trim()
    ? tierFiltered.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.fromAddress?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.bodyText?.toLowerCase().includes(q)
        );
      })
    : tierFiltered;

  const unread = visibleEmails.filter((e) => !e.isRead).length;
  const hiddenCount = allEmails.length - tierFiltered.length;
  const selectedEmail = visibleEmails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-6">

      {/* ── Alias + domain form ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <form onSubmit={openInbox} className="flex items-center gap-0 p-1">
          <div className="flex flex-1 items-center rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring min-w-0 overflow-hidden">
            <input
              type="text"
              placeholder="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
              className="flex-1 px-3 h-10 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
            />
            <span className="px-2 text-sm text-muted-foreground font-mono select-none shrink-0 border-l border-input h-10 flex items-center bg-muted/30">
              @
            </span>
          </div>

          <div className="relative shrink-0 mx-1" ref={domainRef}>
            <button
              type="button"
              onClick={() => setDomainOpen(!domainOpen)}
              className="flex items-center gap-1.5 h-10 px-3 font-mono text-sm text-foreground bg-background border border-input rounded-lg hover:bg-muted/60 transition-colors"
            >
              <span className="truncate max-w-[100px]">{selectedDomain || domains[0]?.name || "…"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${domainOpen ? "rotate-180" : ""}`} />
            </button>
            {domainOpen && domains.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 font-mono text-sm hover:bg-muted transition-colors ${
                      selectedDomain === d.name ? theme.domainActive : "text-foreground"
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
            className={`h-10 w-10 shrink-0 ${theme.btnBg} text-white rounded-lg flex items-center justify-center transition-colors`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            title="Generate random alias"
            className="h-10 w-10 shrink-0 border border-input bg-background rounded-lg flex items-center justify-center hover:bg-muted transition-colors ml-1"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </form>

        {/* Access any inbox */}
        <div className="border-t border-border px-3 py-2.5 bg-muted/20">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Access any inbox</p>
          <form onSubmit={openDirectInbox} className="flex gap-2">
            <input
              type="text"
              placeholder="anything@domain.com"
              value={directInput}
              onChange={(e) => setDirectInput(e.target.value)}
              className="flex-1 font-mono text-sm h-9 px-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className={`h-9 w-9 shrink-0 ${theme.btnBg} text-white rounded-md flex items-center justify-center transition-colors`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Free plan banner (free users only) ── */}
      {tier === "free" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
            <span className="font-semibold">Free plan</span> — Facebook verification codes only (6 &amp; 8-digit).
          </p>
          {!isSignedIn && (
            <Link href="/sign-in" className={`text-xs font-semibold ${theme.accentText} hover:underline shrink-0 whitespace-nowrap`}>
              Sign in for Premium →
            </Link>
          )}
        </div>
      )}

      {/* ── Premium view-mode toggle (premium users only) ── */}
      {isPremium && (
        <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
          premiumViewMode === "premium"
            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
        }`}>
          {premiumViewMode === "premium"
            ? <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            : <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          }
          <p className={`text-xs flex-1 font-medium ${
            premiumViewMode === "premium"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-amber-700 dark:text-amber-300"
          }`}>
            {premiumViewMode === "premium"
              ? <><span className="font-bold">Premium mode</span> — all emails, no restrictions.</>
              : <><span className="font-bold">Free view</span> — showing Facebook codes only.</>
            }
          </p>
          {/* Toggle switch */}
          <button
            onClick={toggleViewMode}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
            style={{ backgroundColor: premiumViewMode === "premium" ? "#10b981" : "#d97706" }}
            title={premiumViewMode === "premium" ? "Switch to free view" : "Switch to premium view"}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                premiumViewMode === "premium" ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-[10px] font-bold shrink-0 ${
            premiumViewMode === "premium" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            {premiumViewMode === "premium" ? "PRO" : "FREE"}
          </span>
        </div>
      )}

      {/* ── Inbox section ── */}
      <div>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
            {activeAddress && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground bg-muted/60 border border-border rounded px-2.5 py-1">
                  {activeAddress}
                </span>
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-all ${
                    copied
                      ? "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                {unread > 0 && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${theme.unreadBadge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.unreadDot} animate-pulse`} />
                    {unread} new
                  </span>
                )}
              </div>
            )}
          </div>

          {activeAddress && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`h-8 px-2.5 gap-1.5 inline-flex items-center rounded-md border text-xs font-medium transition-colors ${
                  autoRefresh ? theme.autoOn : "bg-background border-input hover:bg-muted text-foreground"
                }`}
                title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
              >
                {autoRefresh ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{autoRefresh ? "Auto ON" : "Auto OFF"}</span>
              </button>
              <button
                onClick={doRefetch}
                disabled={loading || refreshing}
                className="h-8 px-2.5 gap-1.5 inline-flex items-center rounded-md border border-input bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {allEmails.length > 0 && (
                <button
                  onClick={clearInbox}
                  disabled={clearing}
                  className="h-8 px-2.5 gap-1.5 inline-flex items-center rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors"
                  title="Clear all messages"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{clearing ? "Clearing…" : "Clear"}</span>
                </button>
              )}
              <button
                onClick={deleteInbox}
                disabled={clearing}
                className="h-8 px-2.5 gap-1.5 inline-flex items-center rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 text-xs font-medium transition-colors"
                title="Delete inbox"
              >
                <Trash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{clearing ? "Deleting…" : "Delete"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Search bar */}
        {activeAddress && allEmails.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by sender, subject or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 h-10 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Email list */}
        {loading ? (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex justify-between gap-4">
                    <div className="h-4 w-36 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure this domain is registered in Settings</p>
          </div>
        ) : !activeAddress ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.emptyIconBg} flex items-center justify-center mb-6 shadow-sm`}>
              <Inbox className={`w-9 h-9 ${theme.emptyIconColor}`} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Pick an inbox</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-6">
              Type any alias above and choose a domain — or hit the shuffle button to get a random address instantly.
            </p>
            {domains.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDomain(d.name);
                      const prefix = generatePrefix();
                      const addr = `${prefix}@${d.name}`;
                      setAlias(prefix);
                      setActiveAddress(addr);
                      load(addr);
                    }}
                    className={`px-4 py-2 rounded-full border border-border bg-card hover:bg-muted ${theme.domainHover} transition-colors text-sm font-mono text-muted-foreground hover:text-foreground`}
                  >
                    @{d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : allEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Inbox className="w-9 h-9 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Inbox is empty</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Waiting for messages at <span className="font-mono text-foreground">{activeAddress}</span>.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-3 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-500" />
              Checking every 5 seconds
            </p>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Search className="w-10 h-10 text-muted-foreground/30 mb-4" />
            {search ? (
              <>
                <p className="text-sm font-semibold">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className={`text-xs ${theme.accentText} hover:underline mt-2`}>
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">No matching emails</p>
                {applyFreeFilter && hiddenCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                    {hiddenCount} email{hiddenCount > 1 ? "s" : ""} received but hidden on free view.
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
            {visibleEmails.map((email) => {
              const isSelected = selectedId === email.id;
              const code = extractCode(email);
              return (
                <div key={email.id}>
                  <div
                    className={`group p-4 flex gap-4 cursor-pointer transition-all hover:bg-muted/40 ${isSelected ? "bg-muted/30" : ""}`}
                    onClick={() => handleSelect(email)}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {!email.isRead && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${theme.unreadDot} border-2 border-card`} />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        !email.isRead
                          ? `bg-gradient-to-br ${theme.avatarGrad} text-white`
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {senderInitial(email.fromAddress)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5 gap-2">
                        <span className={`truncate text-sm font-semibold ${email.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                          {senderName(email.fromAddress)}
                        </span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-xs truncate mb-1.5 ${email.isRead ? "text-muted-foreground/60" : "font-semibold text-foreground/80"}`}>
                        {email.subject || "(No Subject)"}
                      </p>
                      {code && (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-bold tracking-widest bg-gradient-to-r ${theme.codeGrad} text-white shadow-sm`}>
                            {code}
                          </span>
                          <button
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-all ${
                              codeCopied === email.id
                                ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                            onClick={(e) => { e.stopPropagation(); copyCode(email.id, code); }}
                          >
                            {codeCopied === email.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDeleteEmail(email.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/30 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 shrink-0 self-start mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline email reader */}
                  {isSelected && selectedEmail && (
                    <div className="border-t border-border bg-muted/20">
                      <div className="px-5 py-4 border-b border-border/60 space-y-1.5">
                        <p className="text-base font-bold text-foreground">{selectedEmail.subject}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                          <span>
                            <span className="opacity-60">From </span>
                            <span className="text-foreground">{selectedEmail.fromAddress}</span>
                          </span>
                          <span>
                            <span className="opacity-60">To </span>
                            <span className={theme.readerTo}>{selectedEmail.toAddress}</span>
                          </span>
                          <span className="opacity-40">
                            {format(new Date(selectedEmail.receivedAt), "MMM d, yyyy · HH:mm")}
                          </span>
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

            {/* Hidden emails notice */}
            {applyFreeFilter && hiddenCount > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20">
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                  <span className="font-semibold">{hiddenCount} email{hiddenCount > 1 ? "s" : ""} hidden</span>
                  {isPremium
                    ? " — toggle to Premium mode to see all emails."
                    : " — upgrade to Premium to unlock all emails."}
                </p>
                {isPremium && (
                  <button
                    onClick={toggleViewMode}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 whitespace-nowrap"
                  >
                    Switch to Premium →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
