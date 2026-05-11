import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Shuffle, Mail } from "lucide-react";
import { useListSubdomains, getListSubdomainsQueryKey } from "@workspace/api-client-react";
import { ChevronDown } from "lucide-react";

const ADJECTIVES = ["swift", "dark", "cool", "red", "blue", "quick", "lazy", "bright", "wild", "bold"];
const NOUNS = ["fox", "bear", "hawk", "wolf", "lynx", "raven", "pike", "crane", "viper", "jade"];

function randomAlias() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${a}${n}${num}`;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [alias, setAlias] = useState(randomAlias);
  const [domainId, setDomainId] = useState<number | null>(null);
  const [anyAddress, setAnyAddress] = useState("");

  const { data: subdomains } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  useEffect(() => {
    if (subdomains && subdomains.length > 0 && domainId === null) {
      setDomainId(subdomains[0].id);
    }
  }, [subdomains, domainId]);

  const selectedDomain = subdomains?.find((s) => s.id === domainId);

  const goToInbox = () => {
    if (!selectedDomain || !alias.trim()) return;
    navigate(`/inbox?address=${encodeURIComponent(`${alias.trim().toLowerCase()}@${selectedDomain.name}`)}`);
  };

  const goToAnyInbox = () => {
    const addr = anyAddress.trim();
    if (!addr) return;
    navigate(`/inbox?address=${encodeURIComponent(addr)}`);
  };

  return (
    <div className="space-y-4">
      {/* Alias + domain picker */}
      <div className="rounded-2xl border border-white/10 bg-[#13112a] p-4 space-y-3">
        <div className="flex items-center gap-2">
          {/* Alias input */}
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToInbox()}
            placeholder="alias"
            className="flex-1 min-w-0 bg-[#1e1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />

          <span className="text-white/40 font-mono text-sm shrink-0">@</span>

          {/* Domain selector */}
          {subdomains && subdomains.length > 0 ? (
            <div className="relative shrink-0">
              <select
                value={domainId ?? ""}
                onChange={(e) => setDomainId(Number(e.target.value))}
                className="appearance-none bg-[#1e1a3a] border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors cursor-pointer max-w-[160px]"
              >
                {subdomains.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <ChevronDown className="h-3.5 w-3.5 text-white/40" />
              </div>
            </div>
          ) : (
            <span className="bg-[#1e1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white/30 shrink-0">
              no domains
            </span>
          )}

          {/* Go button */}
          <button
            onClick={goToInbox}
            disabled={!selectedDomain || !alias.trim()}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="h-4 w-4 text-white" />
          </button>

          {/* Shuffle button */}
          <button
            onClick={() => setAlias(randomAlias())}
            title="Random alias"
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border border-white/10 bg-[#1e1a3a] hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>

        {selectedDomain && alias.trim() && (
          <p className="font-mono text-xs text-white/40 px-1">
            Inbox:{" "}
            <span className="text-violet-400">{alias.trim().toLowerCase()}@{selectedDomain.name}</span>
          </p>
        )}
      </div>

      {/* Access any inbox */}
      <div className="rounded-2xl border border-white/10 bg-[#13112a] p-4 space-y-3">
        <p className="font-mono text-xs font-bold text-white/40 uppercase tracking-widest">
          Access Any Inbox
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={anyAddress}
            onChange={(e) => setAnyAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goToAnyInbox()}
            placeholder={selectedDomain ? `anything@${selectedDomain.name}` : "anything@yourdomain.com"}
            className="flex-1 min-w-0 bg-[#1e1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={goToAnyInbox}
            disabled={!anyAddress.trim()}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border border-dashed border-white/10 p-10 flex flex-col items-center justify-center text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-violet-600/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-violet-500/60" />
        </div>
        <div>
          <p className="font-semibold text-white">Pick an inbox</p>
          <p className="text-sm text-white/40 mt-1">
            Type any alias above and choose a domain, or enter a full email address to access its inbox.
          </p>
        </div>
      </div>
    </div>
  );
}
