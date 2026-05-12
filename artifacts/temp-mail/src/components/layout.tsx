import { Link, useLocation } from "wouter";
import { Home, Globe, Settings, Zap } from "lucide-react";

const NAV = [
  { href: "/", label: "Inbox", icon: Home },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/admin", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-card/50 sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">Weyn Mail</p>
            <p className="text-[11px] text-muted-foreground">Temp Email Service</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto pt-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="rounded-xl bg-green-500/8 border border-green-500/15 px-4 py-3 flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-green-400">Service Online</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 gap-3 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Weyn Mail</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-green-400 font-medium">Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
