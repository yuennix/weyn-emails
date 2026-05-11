import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Menu, X, Inbox, Shield, Moon } from "lucide-react";

const NAV = [
  { href: "/", label: "Inbox", icon: Inbox },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-[#0b0b14] text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0b14]/95 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
              Weyn Emails
            </span>
          </Link>

          <button className="p-2 -mr-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <Moon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Sidebar drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-[#100e1f] flex flex-col h-full shadow-2xl border-r border-white/5">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
                  Weyn Emails
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = location === href || (href !== "/" && location.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-violet-700/40 text-white"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-400" : ""}`} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom info */}
            <div className="px-3 pb-6">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-1.5">
                <p className="text-xs text-white/25 font-mono">Webhook endpoint</p>
                <code className="text-[11px] text-violet-400 font-mono break-all">
                  {window.location.origin}/api/webhook/email
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
