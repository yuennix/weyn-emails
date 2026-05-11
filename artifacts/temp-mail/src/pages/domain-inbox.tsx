import {
  useGetSubdomain,
  useListEmailsBySubdomain,
  useMarkEmailRead,
  useDeleteEmail,
  getGetSubdomainQueryKey,
  getListEmailsBySubdomainQueryKey,
  getGetStatsSummaryQueryKey,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Mail, MailOpen, Trash2, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

export default function DomainInbox() {
  const { id } = useParams<{ id: string }>();
  const subId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: sub, isLoading: subLoading } = useGetSubdomain(subId, {
    query: { enabled: !!subId, queryKey: getGetSubdomainQueryKey(subId) },
  });

  const { data: emails, isLoading: emailsLoading } = useListEmailsBySubdomain(subId, {
    query: { enabled: !!subId, queryKey: getListEmailsBySubdomainQueryKey(subId) },
  });

  const markRead = useMarkEmailRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmailsBySubdomainQueryKey(subId) });
        queryClient.invalidateQueries({ queryKey: getGetSubdomainQueryKey(subId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
      },
    },
  });

  const deleteEmail = useDeleteEmail({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmailsBySubdomainQueryKey(subId) });
        queryClient.invalidateQueries({ queryKey: getGetSubdomainQueryKey(subId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        toast({ title: "Email deleted" });
      },
    },
  });

  const handleExpand = (emailId: number, isRead: boolean) => {
    setExpandedId((prev) => (prev === emailId ? null : emailId));
    if (!isRead) {
      markRead.mutate({ id: emailId });
    }
  };

  if (subLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Globe className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="font-mono text-sm text-muted-foreground">Domain not found</p>
        <Link href="/domains" className="text-xs text-primary hover:underline mt-2 font-mono">Back to Domains</Link>
      </div>
    );
  }

  const sortedEmails = emails ? [...emails].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()) : [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link href="/domains" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono mb-3">
          <ArrowLeft className="h-3 w-3" /> Domains
        </Link>
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h1 className="font-mono text-lg font-bold text-foreground">{sub.name}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">{sub.emailCount} emails</span>
              {sub.unreadCount > 0 && (
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                  {sub.unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border border-border bg-card divide-y divide-border">
        {emailsLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-1.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))
        ) : sortedEmails.length > 0 ? (
          sortedEmails.map((email) => {
            const expanded = expandedId === email.id;
            return (
              <div key={email.id} data-testid={`email-item-${email.id}`}>
                <div
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                  onClick={() => handleExpand(email.id, email.isRead)}
                >
                  <div className="mt-1 shrink-0">
                    {email.isRead ? (
                      <MailOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-mono text-xs font-semibold truncate ${email.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                        {email.subject}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      From <span className="text-foreground/70">{email.fromAddress}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                      {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      data-testid={`button-delete-email-${email.id}`}
                      onClick={(e) => { e.stopPropagation(); deleteEmail.mutate({ id: email.id }); }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-background/40 px-4 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="text-foreground">{email.fromAddress}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="text-primary">{email.toAddress}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Received:</span>{" "}
                        <span className="text-foreground">{format(new Date(email.receivedAt), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      {email.bodyHtml ? (
                        <div
                          className="prose prose-sm prose-invert max-w-none text-xs"
                          dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                        />
                      ) : (
                        <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">{email.bodyText}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Mail className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No emails yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Emails sent to @{sub.name} will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
