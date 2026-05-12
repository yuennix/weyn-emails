import { Link, useLocation } from "wouter";
import { Home, Settings, Zap, Sparkles } from "lucide-react";

const NAV = [
  { href: "/", label: "Inbox", icon: Home, color: "from-indigo-500 to-violet-500" },
  { href: "/admin", label: "Settings", icon: Settings, color: "from-violet-500 to-purple-500" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border sticky top-0 h-screen overflow-hidden">
        {/* Sidebar background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(245_75%_65%_/_0.12),transparent)] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-5 h-16 border-b border-border/60 shrink-0">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-sm opacity-60" />
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Weyn Mail</p>
            <p className="text-[11px] text-indigo-300/60">Temp Email Service</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto pt-5">
          <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {NAV.map(({ href, label, icon: Icon, color }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-white border border-indigo-500/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  active
                    ? `bg-gradient-to-br ${color} shadow-md`
                    : "bg-white/5 group-hover:bg-white/10"
                }`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                {label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status card */}
        <div className="relative p-4 border-t border-border/60 shrink-0">
          <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </div>
              <span className="text-xs font-semibold text-emerald-400">All Systems Online</span>
            </div>
            <p className="text-[11px] text-emerald-300/50">Inbox auto-refreshes every 5s</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 h-14 border-b border-border glass flex items-center px-4 gap-3 shrink-0">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 blur-sm opacity-50" />
            <div className="relative h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="text-base font-bold text-white">Weyn Mail</span>
          <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-semibold">Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border">
          <div className="flex">
            {NAV.map(({ href, label, icon: Icon, color }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 transition-all"
                >
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                    active
                      ? `bg-gradient-to-br ${color} shadow-md`
                      : "bg-white/5"
                  }`}>
                    <Icon className={`h-4 w-4 ${active ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-[10px] font-bold ${active ? "text-white" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
