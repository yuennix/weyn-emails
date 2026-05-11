import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Shuffle, Copy, Check, Mail, Shield, Zap, RefreshCw } from "lucide-react";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";

const ADJECTIVES = ["swift", "dark", "cool", "bold", "quick", "lazy", "bright", "wild", "silent", "sharp"];
const NOUNS = ["fox", "bear", "hawk", "wolf", "lynx", "raven", "pike", "crane", "viper", "jade"];

function randomAlias() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${a}${n}${num}`;
}

const FEATURES = [
  { icon: Zap, title: "Instant", desc: "No signup required. Generate an address and start receiving." },
  { icon: Shield, title: "Private", desc: "No personal data stored. Addresses are anonymous." },
  { icon: RefreshCw, title: "Auto-refresh", desc: "Inbox updates automatically every 15 seconds." },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [alias, setAlias] = useState(randomAlias);
  const [domainId, setDomainId] = useState<number | null>(null);
  const [anyAddress, setAnyAddress] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: subdomains } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  useEffect(() => {
    if (subdomains && subdomains.length > 0 && domainId === null) {
      setDomainId(subdomains[0].id);
    }
  }, [subdomains, domainId]);

  const selectedDomain = subdomains?.find((s) => s.id === domainId);
  const fullAddress = selectedDomain && alias.trim() ? `${alias.trim().toLowerCase()}@${selectedDomain.name}` : "";

  const goToInbox = () => {
    if (!fullAddress) return;
    navigate(`/inbox?address=${encodeURIComponent(fullAddress)}`);
  };

  const copyAddress = () => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToAnyInbox = () => {
    const addr = anyAddress.trim();
    if (!addr) return;
    navigate(`/inbox?address=${encodeURIComponent(addr)}`);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Temporary Email</h1>
        <p className="text-muted-foreground mt-1">Generate a disposable address — no sign-up needed.</p>
      </div>

      {/* Generator card */}
      <div className="rounded-xl border border-white/8 bg-card overflow-hidden shadow-xl shadow-black/20">
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your address</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Address builder */}
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-background/60 p-1 pr-2">
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToInbox()}
              placeholder="alias"
              className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none"
            />
            <span className="text-muted-foreground font-mono text-sm shrink-0 select-none">@</span>
            {subdomains && subdomains.length > 0 ? (
              <select
                value={domainId ?? ""}
                onChange={(e) => setDomainId(Number(e.target.value))}
                className="bg-transparent font-mono text-sm text-white focus:outline-none cursor-pointer shrink-0 max-w-[140px] pr-1"
              >
                {subdomains.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0c1220] text-white">{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-sm text-muted-foreground/50">no domain</span>
            )}
            <button
              onClick={() => setAlias(randomAlias())}
              title="Generate random alias"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors shrink-0"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Full address display */}
          {fullAddress && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <Mail className="h-4 w-4 text-primary/60 shrink-0" />
              <span className="flex-1 font-mono text-sm text-primary truncate">{fullAddress}</span>
              <button
                onClick={copyAddress}
                className="shrink-0 p-1.5 rounded-md hover:bg-primary/10 text-primary/50 hover:text-primary transition-colors"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={goToInbox}
            disabled={!fullAddress}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 active:scale-[0.99]"
          >
            Open Inbox
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Access existing inbox */}
      <div className="rounded-xl border border-white/8 bg-card shadow-xl shadow-black/20">
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Access existing inbox</p>
        </div>
        <div className="p-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={anyAddress}
              onChange={(e) => setAnyAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goToAnyInbox()}
              placeholder={selectedDomain ? `anyone@${selectedDomain.name}` : "you@yourdomain.com"}
              className="flex-1 min-w-0 bg-background/60 border border-white/8 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <button
              onClick={goToAnyInbox}
              disabled={!anyAddress.trim()}
              className="shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-primary/20"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-white/6 bg-card p-4 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-semibold text-white">{title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
