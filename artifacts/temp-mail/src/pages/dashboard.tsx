import { useGetStatsSummary, useListRecentEmails, useListSubdomains, getGetStatsSummaryQueryKey, getListRecentEmailsQueryKey, getListSubdomainsQueryKey, useMarkEmailRead, useDeleteEmail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Mail, MailOpen, AtSign, CalendarDays, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

function StatCard({ label, value, icon: Icon, loading }: { label: string; value?: number; icon: React.ElementType; loading: boolean }) {
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`} className="rounded border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="font-mono text-2xl font-bold text-foreground">{value ?? 0}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({ query: { queryKey: getGetStatsSummaryQueryKey() } });
  const { data: emails, isLoading: emailsLoading } = useListRecentEmails({ limit: 20 }, { query: { queryKey: getListRecentEmailsQueryKey({ limit: 20 }) } });
  const { data: subdomains } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  const markRead = useMarkEmailRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecentEmailsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
      },
    },
  });

  const deleteEmail = useDeleteEmail({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecentEmailsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
      },
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-mono text-lg font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your temp email activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Domains" value={stats?.totalSubdomains} icon={Globe} loading={statsLoading} />
        <StatCard label="Addresses" value={stats?.totalAddresses} icon={AtSign} loading={statsLoading} />
        <StatCard label="Unread" value={stats?.unreadEmails} icon={Mail} loading={statsLoading} />
        <StatCard label="Today" value={stats?.emailsToday} icon={CalendarDays} loading={statsLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent emails */}
        <div className="lg:col-span-2 rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-sm font-semibold text-foreground">Recent Emails</span>
            <Link href="/inbox" className="text-xs text-primary hover:underline font-mono">View all</Link>
          </div>

          {emailsLoading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              ))}
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="divide-y divide-border">
              {emails.map((email) => (
                <div
                  key={email.id}
                  data-testid={`email-row-${email.id}`}
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {email.isRead ? (
                      <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-foreground truncate">{email.subject}</span>
                      {!email.isRead && (
                        <Badge variant="outline" className="text-primary border-primary/30 font-mono text-[10px] px-1 py-0 shrink-0">NEW</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      From <span className="text-foreground/70">{email.fromAddress}</span> &rarr; <span className="text-primary/80 font-mono">{email.toAddress}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!email.isRead && (
                      <button
                        data-testid={`button-read-${email.id}`}
                        onClick={() => markRead.mutate({ id: email.id })}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <MailOpen className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      data-testid={`button-delete-${email.id}`}
                      onClick={() => deleteEmail.mutate({ id: email.id })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-mono text-sm text-muted-foreground">No emails yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Configure your webhook to start receiving mail</p>
            </div>
          )}
        </div>

        {/* Domains sidebar */}
        <div className="rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-sm font-semibold text-foreground">Domains</span>
            <Link href="/domains" className="text-xs text-primary hover:underline font-mono">Manage</Link>
          </div>

          {subdomains && subdomains.length > 0 ? (
            <div className="divide-y divide-border">
              {subdomains.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/domains/${sub.id}`}
                  data-testid={`domain-card-${sub.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-foreground truncate">{sub.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{sub.emailCount} emails</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {sub.unreadCount > 0 && (
                      <span className="font-mono text-xs font-bold text-primary">{sub.unreadCount}</span>
                    )}
                    <ExternalLink className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Globe className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="font-mono text-xs text-muted-foreground">No domains yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
