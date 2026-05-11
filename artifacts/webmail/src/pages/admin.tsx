import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, User, RefreshCw, Users, Eye, EyeOff, Trash2, UserPlus, ChevronDown, ChevronUp, Globe, Lock, Send, FlaskConical, CheckCircle2 } from "lucide-react";
import { DomainsPage } from "@/pages/domains";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";
const SESSION_KEY = "maildrop-admin-auth";

interface AdminUser {
  id: number;
  email: string;
  username: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importEmails, setImportEmails] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [expandedDomains, setExpandedDomains] = useState<Record<number, boolean>>({});
  const [userDomainIds, setUserDomainIds] = useState<Record<number, number[]>>({});
  const [allDomains, setAllDomains] = useState<{ id: number; name: string }[]>([]);
  const [togglingDomain, setTogglingDomain] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"users" | "domains" | "test">("users");

  const [testTo, setTestTo] = useState("");
  const [testFrom, setTestFrom] = useState("noreply@weyn-admin.local");
  const [testSubject, setTestSubject] = useState("Test Email");
  const [testBody, setTestBody] = useState("This is a test email sent from the admin panel.");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const storedPassword = (): string => sessionStorage.getItem(SESSION_KEY) ?? "";

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setAuthenticated(true);
      fetchUsers(saved);
      fetchAllDomains();
    }
  }, []);

  const fetchAllDomains = async () => {
    try {
      const res = await fetch(`${apiBase}/api/domains`);
      const data = await res.json();
      setAllDomains(data.domains ?? []);
    } catch { /* ignore */ }
  };

  const loadUserDomains = async (userId: number) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/domains`, {
        headers: { "x-admin-password": storedPassword() },
      });
      const data = await res.json();
      setUserDomainIds(prev => ({ ...prev, [userId]: data.domainIds ?? [] }));
    } catch { /* ignore */ }
  };

  const toggleUserDomain = async (userId: number, domainId: number, currentlyAssigned: boolean) => {
    const key = `${userId}-${domainId}`;
    setTogglingDomain(key);
    try {
      const method = currentlyAssigned ? "DELETE" : "POST";
      await fetch(`${apiBase}/api/admin/users/${userId}/domains/${domainId}`, {
        method,
        headers: { "x-admin-password": storedPassword() },
      });
      setUserDomainIds(prev => ({
        ...prev,
        [userId]: currentlyAssigned
          ? (prev[userId] ?? []).filter(id => id !== domainId)
          : [...(prev[userId] ?? []), domainId],
      }));
    } finally {
      setTogglingDomain(null);
    }
  };

  const toggleDomainPanel = (userId: number) => {
    const isOpen = expandedDomains[userId];
    setExpandedDomains(prev => ({ ...prev, [userId]: !isOpen }));
    if (!isOpen && userDomainIds[userId] === undefined) {
      loadUserDomains(userId);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${apiBase}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, password);
        setAuthenticated(true);
        fetchUsers(password);
        fetchAllDomains();
      } else {
        setAuthError("Wrong password. Try again.");
      }
    } catch {
      setAuthError("Could not connect. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchUsers = async (pwd?: string) => {
    setFetching(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/users?t=${Date.now()}`, {
        headers: {
          "x-admin-password": pwd ?? storedPassword(),
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.stats?.total ?? (data.users?.length ?? 0));
    } finally {
      setFetching(false);
    }
  };

  const importUsers = async () => {
    const emails = importEmails
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (emails.length === 0) {
      setImportMsg("No valid email addresses found.");
      return;
    }
    setImporting(true);
    setImportMsg("Adding users…");
    try {
      const res = await fetch(`${apiBase}/api/admin/users/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": storedPassword(),
        },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if (data.created > 0) parts.push(`✅ ${data.created} added`);
        if (data.skipped > 0) parts.push(`${data.skipped} already existed`);
        setImportMsg(parts.join(" · ") || "Done.");
        setImportEmails("");
        fetchUsers();
      } else {
        setImportMsg(`❌ ${data.error ?? "Import failed"}`);
      }
    } catch {
      setImportMsg("Could not reach server");
    } finally {
      setImporting(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeleting(userId);
    try {
      await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "x-admin-password": storedPassword() },
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((prev) => prev - 1);
    } finally {
      setDeleting(null);
    }
  };

  const sendTestEmail = async () => {
    if (!testTo.includes("@")) {
      setTestResult({ ok: false, msg: "Enter a valid To address." });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/api/admin/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": storedPassword() },
        body: JSON.stringify({ to: testTo, from: testFrom, subject: testSubject, body: testBody }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, msg: `Delivered to ${testTo} (ID: ${data.emailId})` });
      } else {
        setTestResult({ ok: false, msg: data.error ?? "Failed to send." });
      }
    } catch {
      setTestResult({ ok: false, msg: "Could not reach server." });
    } finally {
      setTestSending(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setPassword("");
    setUsers([]);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Enter the admin password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <p className="text-sm text-red-500 text-center">{authError}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={authLoading || !password}
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {authLoading ? "Verifying…" : "Enter Admin Panel"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => fetchUsers()} disabled={fetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            Sign out
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "users"
              ? "border-violet-600 text-violet-600 dark:text-violet-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab("domains")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "domains"
              ? "border-violet-600 text-violet-600 dark:text-violet-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="w-4 h-4" />
          Domains
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === "test"
              ? "border-violet-600 text-violet-600 dark:text-violet-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Test Email
        </button>
        {activeTab === "users" && (
          <div className="ml-auto pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowImport((v) => !v); setImportMsg(""); }}
              className="text-violet-700 border-violet-300 hover:bg-violet-50 dark:text-violet-300 dark:border-violet-800 dark:hover:bg-violet-900/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Users
              {showImport ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        )}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === "users" && (
        <>
          {showImport && (
            <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Add users by email</p>
                <p className="text-xs text-muted-foreground">
                  Paste email addresses below — one per line or comma-separated.
                </p>
              </div>
              <textarea
                className="w-full rounded-md border border-input bg-background text-sm p-2.5 font-mono resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder={"alice@example.com\nbob@example.com"}
                value={importEmails}
                onChange={(e) => setImportEmails(e.target.value)}
              />
              {importMsg && (
                <p className={`text-xs font-medium ${importMsg.startsWith("✅") || importMsg === "Done." ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {importMsg}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={importUsers}
                  disabled={importing || !importEmails.trim()}
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {importing ? "Adding…" : "Add Users"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowImport(false); setImportMsg(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3 w-fit">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>

          {/* Users table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="text-sm font-semibold text-muted-foreground">
                {users.length} registered user{users.length !== 1 ? "s" : ""}
              </p>
            </div>

            {users.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                {fetching ? "Loading…" : "No users yet."}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id}>
                    <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                        {u.isAdmin ? (
                          <Shield className="w-4 h-4 text-violet-600" />
                        ) : (
                          <User className="w-4 h-4 text-violet-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">
                          {u.email || u.username || `User #${u.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Joined {new Date(u.createdAt).toLocaleDateString()}
                          {u.isAdmin && <span className="ml-2 text-violet-500 font-semibold">• Admin</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleDomainPanel(u.id)}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Domains
                          {expandedDomains[u.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => deleteUser(u.id)}
                          disabled={deleting === u.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expandedDomains[u.id] && (
                      <div className="px-5 pb-4 pt-0 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Domain Access</p>
                        {allDomains.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No domains configured.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {allDomains.map((d) => {
                              const assigned = (userDomainIds[u.id] ?? []).includes(d.id);
                              const key = `${u.id}-${d.id}`;
                              return (
                                <button
                                  key={d.id}
                                  onClick={() => toggleUserDomain(u.id, d.id, assigned)}
                                  disabled={togglingDomain === key}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all border ${
                                    assigned
                                      ? "bg-violet-600 text-white border-violet-600"
                                      : "bg-background text-muted-foreground border-border hover:border-violet-400"
                                  }`}
                                >
                                  @{d.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DOMAINS TAB ── */}
      {activeTab === "domains" && <DomainsPage />}

      {/* ── TEST EMAIL TAB ── */}
      {activeTab === "test" && (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">Send a test email</p>
              <p className="text-xs text-muted-foreground">
                Inject an email directly into any inbox — useful for testing webhooks and the live inbox view.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                <Input
                  placeholder="hello@yourdomain.com"
                  value={testTo}
                  onChange={(e) => { setTestTo(e.target.value); setTestResult(null); }}
                  className="h-10 font-mono text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                <Input
                  placeholder="noreply@weyn-admin.local"
                  value={testFrom}
                  onChange={(e) => setTestFrom(e.target.value)}
                  className="h-10 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
                <Input
                  placeholder="Test Email"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background text-sm p-2.5 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Email body (plain text or HTML)"
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                />
              </div>
            </div>

            {testResult && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                testResult.ok
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              }`}>
                {testResult.ok
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  : <span className="shrink-0 mt-0.5">✗</span>}
                {testResult.msg}
              </div>
            )}

            <Button
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={sendTestEmail}
              disabled={testSending || !testTo}
            >
              {testSending
                ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Sending…</>
                : <><Send className="w-4 h-4 mr-2" />Send Test Email</>}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground px-1">
            The email will appear instantly in the inbox at the To address above. If the domain doesn't exist yet it will be auto-created.
          </p>
        </div>
      )}
    </div>
  );
}
