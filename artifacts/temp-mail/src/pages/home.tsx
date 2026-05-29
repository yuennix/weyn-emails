import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shuffle, Copy, Check, Trash2, Trash,
  RefreshCw, Inbox, ChevronDown, ArrowRight,
  Search, X, Radio, Mail,
} from "lucide-react";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";
import { fetchInbox, markEmailRead, deleteEmail, InboxEmail } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { EmailBody } from "@/components/email-body";

const AUTO_REFRESH_INTERVAL = 5000;

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
  return text.match(/\b(\d{6}|\d{8})\b/)?.[1] ?? null;
};

export default function Home() {
  const [alias, setAlias] = useState(() => generatePrefix());
  const [selectedDomain, setSelectedDomain] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);
  const [activeAddress, setActiveAddress] = useState("");
  const [directInput, setDirectInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState<number | null>(null);
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
    const interval = setInterval(() => load(activeAddress, true), AUTO_REFRESH_INTERVAL);
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

  const tierFiltered = emails.filter(
    (e) => isFacebookSender(e.fromAddress ?? "") && hasSecurityCode(e)
  );
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
  const selectedEmail = visibleEmails.find((e) => e.id === selectedId);

  return (
    <div className="space-y-5">

      {/* ── Address Generator Card ── */}
      <div className="rounded-2xl overflow-hidden border border-red-900/30 bg-black/40 shadow-xl glow-red">
        {/* Animated gradient top strip */}
        <div className="h-1 w-full grad-animated" />

        <div className="p-5 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg grad-animated flex items-center justify-center glow-red-sm shrink-0">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Disposable Address</p>
              <p className="text-[11px] text-red-400/50">Generate a temporary inbox instantly</p>
            </div>
          </div>

          {/* Alias + domain form */}
          <form onSubmit={openInbox} className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-xl border border-red-900/40 bg-black/50 focus-within:border-red-600/60 focus-within:shadow-[0_0_10px_rgba(220,38,38,0.15)] transition-all min-w-0 overflow-hidden">
              <input
                type="text"
                placeholder="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
                className="flex-1 px-3.5 h-11 bg-transparent text-sm font-mono text-white placeholder:text-red-900/60 focus:outline-none min-w-0"
              />
              <span className="px-2.5 text-sm text-red-800/60 font-mono select-none shrink-0 border-l border-red-900/30 h-11 flex items-center">
                @
              </span>
            </div>

            <div className="relative shrink-0" ref={domainRef}>
              <button
                type="button"
                onClick={() => setDomainOpen(!domainOpen)}
                className="flex items-center gap-1.5 h-11 px-3.5 font-mono text-sm text-white bg-black/50 border border-red-900/40 rounded-xl hover:border-red-700/50 transition-all"
              >
                <span className="truncate max-w-[90px]">{selectedDomain || domains[0]?.name || "…"}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-red-700/60 shrink-0 transition-transform ${domainOpen ? "rotate-180" : ""}`} />
              </button>
              {domainOpen && domains.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 bg-black border border-red-900/40 rounded-xl shadow-2xl z-50 min-w-[160px] overflow-hidden">
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 font-mono text-sm transition-colors ${
                        selectedDomain === d.name
                          ? "text-red-400 font-semibold bg-red-950/40"
                          : "text-white hover:bg-red-950/20 hover:text-red-300"
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
              className="h-11 w-11 shrink-0 grad-animated text-white rounded-xl flex items-center justify-center glow-red-sm hover:opacity-90 transition-opacity"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleShuffle}
              title="Generate random alias"
              className="h-11 w-11 shrink-0 border border-red-900/40 bg-black/50 rounded-xl flex items-center justify-center hover:border-red-700/50 hover:bg-red-950/20 text-red-600 hover:text-red-400 transition-all"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </form>

          {/* Access any inbox */}
          <div className="border-t border-red-900/20 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-900/60 mb-2.5">Access any inbox</p>
            <form onSubmit={openDirectInbox} className="flex gap-2">
              <input
                type="text"
                placeholder="anything@domain.com"
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                className="flex-1 font-mono text-sm h-10 px-3.5 rounded-xl border border-red-900/40 bg-black/50 text-white placeholder:text-red-900/40 focus:outline-none focus:border-red-700/50 transition-all"
              />
              <button
                type="submit"
                className="h-10 w-10 shrink-0 grad-animated text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Active address bar ── */}
      {activeAddress && (
        <div className="rounded-xl border border-red-900/30 bg-black/30 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="font-mono text-sm text-white truncate">{activeAddress}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {unread > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {unread} new
              </span>
            )}
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                copied
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-900/20 border-red-800/30 text-red-400 hover:bg-red-900/40"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={doRefetch}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-900/30 bg-black/30 text-red-600 hover:text-red-400 hover:border-red-800/50 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {emails.length > 0 && (
              <button
                onClick={clearInbox}
                disabled={clearing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-800/40 bg-red-950/20 text-red-500 hover:bg-red-950/40 transition-all disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{clearing ? "Clearing…" : "Clear"}</span>
              </button>
            )}
            <button
              onClick={deleteInbox}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-700/40 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all disabled:opacity-40"
            >
              <Trash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{clearing ? "Deleting…" : "Delete"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Facebook-only notice ── */}
      <div className="flex items-center gap-3 rounded-xl border border-red-900/25 bg-black/30 px-4 py-3">
        <div className="h-9 w-9 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-lg">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Facebook Verification Codes Only</p>
          <p className="text-xs text-red-400/50 mt-0.5">This inbox shows 6 or 8-digit codes sent by Facebook.</p>
        </div>
      </div>

      {/* ── Inbox section ── */}
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Inbox</h1>
            {activeAddress && tierFiltered.length > 0 && (
              <span className="text-xs text-red-500/60 font-mono">
                {tierFiltered.length} message{tierFiltered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Search bar */}
        {activeAddress && tierFiltered.length > 0 && (
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

        {/* States */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-red-900/20 bg-black/30 p-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-red-950/40 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-0.5">
                  <div className="h-3.5 w-36 bg-red-950/40 rounded-lg" />
                  <div className="h-3 w-1/2 bg-red-950/30 rounded-lg" />
                  <div className="h-8 w-24 bg-red-950/30 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-6 text-center">
            <p className="text-sm font-bold text-red-400">{error}</p>
            <p className="text-xs text-red-700/60 mt-1">Make sure this domain is registered in Settings</p>
          </div>
        ) : !activeAddress ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-2xl border border-red-900/30 bg-black/40 flex items-center justify-center mb-6">
              <Inbox className="w-9 h-9 text-red-900/60" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No inbox selected</h2>
            <p className="text-red-400/50 max-w-xs text-sm leading-relaxed mb-6">
              Generate an address above or enter a custom one to start receiving emails.
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
                    className="px-4 py-2 rounded-full border border-red-900/30 bg-black/30 hover:border-red-700/50 hover:bg-red-950/20 transition-all text-sm font-mono text-red-700 hover:text-red-400"
                  >
                    @{d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 rounded-2xl border border-red-900/30 bg-black/40 flex items-center justify-center mb-6">
              <Inbox className="w-9 h-9 text-red-900/40" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Inbox is empty</h2>
            <p className="text-red-400/40 max-w-xs text-sm">
              Waiting for messages at <span className="font-mono text-red-400/70">{activeAddress}</span>
            </p>
            <p className="text-xs text-red-900/60 mt-4 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-red-600" />
              Checking every 5 seconds
            </p>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <Search className="w-9 h-9 text-red-900/40 mb-4" />
            {search ? (
              <>
                <p className="text-sm font-bold text-white">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className="text-xs text-red-500 hover:text-red-400 hover:underline mt-2">
                  Clear search
                </button>
              </>
            ) : (
              <p className="text-sm font-bold text-red-600/60">No Facebook verification codes found</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleEmails.map((email) => {
              const isSelected = selectedId === email.id;
              const code = extractCode(email);
              return (
                <div key={email.id} className={`rounded-xl border overflow-hidden transition-all ${
                  isSelected
                    ? "border-red-700/50 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
                    : email.isRead
                    ? "border-red-900/20 bg-black/30 hover:border-red-900/40"
                    : "border-red-800/40 bg-black/40 hover:border-red-700/50"
                }`}>
                  <div
                    className="flex gap-4 p-4 cursor-pointer group relative"
                    onClick={() => handleSelect(email)}
                  >
                    {/* Unread left accent */}
                    {!email.isRead && (
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full grad-animated" />
                    )}

                    {/* Avatar */}
                    <div className="relative shrink-0 ml-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        !email.isRead
                          ? "grad-animated text-white shadow-md"
                          : "bg-red-950/30 text-red-800 border border-red-900/30"
                      }`}>
                        {senderInitial(email.fromAddress)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`text-sm font-bold truncate ${email.isRead ? "text-red-700/70" : "text-white"}`}>
                          {senderName(email.fromAddress)}
                        </span>
                        <span className="text-[11px] text-red-900/60 whitespace-nowrap shrink-0 font-mono">
                          {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-xs truncate mb-2 ${email.isRead ? "text-red-900/50" : "text-red-300/70 font-medium"}`}>
                        {email.subject || "(No Subject)"}
                      </p>
                      {code && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-4 py-1.5 rounded-lg text-xl font-black tracking-[0.25em] grad-animated text-white shadow-lg font-mono glow-red-sm">
                            {code}
                          </span>
                          <button
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              codeCopied === email.id
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-red-900/20 border-red-800/30 text-red-400 hover:bg-red-900/40"
                            }`}
                            onClick={(e) => { e.stopPropagation(); copyCode(email.id, code); }}
                          >
                            {codeCopied === email.id ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy code</>}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDeleteEmail(email.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-900/30 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 shrink-0 self-start"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline email reader */}
                  {isSelected && selectedEmail && (
                    <div className="border-t border-red-900/30 bg-black/40">
                      <div className="px-5 py-4 border-b border-red-900/20 space-y-2">
                        <p className="text-base font-bold text-white">{selectedEmail.subject}</p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono">
                          <span>
                            <span className="text-red-900/50">From </span>
                            <span className="text-red-300">{selectedEmail.fromAddress}</span>
                          </span>
                          <span>
                            <span className="text-red-900/50">To </span>
                            <span className="text-red-400">{selectedEmail.toAddress}</span>
                          </span>
                          <span className="text-red-900/40">
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
          </div>
        )}
      </div>
    </div>
  );
}
