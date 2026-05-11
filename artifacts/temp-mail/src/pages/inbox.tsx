import {
  useListRecentEmails,
  useMarkEmailRead,
  useDeleteEmail,
  getListRecentEmailsQueryKey,
  getGetStatsSummaryQueryKey,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, MailOpen, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

export default function Inbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: emails, isLoading } = useListRecentEmails({ limit: 100 }, { query: { queryKey: getListRecentEmailsQueryKey({ limit: 100 }) } });

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
        toast({ title: "Email deleted" });
      },
    },
  });

  const handleExpand = (id: number, isRead: boolean) => {
    setExpandedId((prev) => (prev === id ? null : id));
    if (!isRead) markRead.mutate({ id });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-mono text-lg font-bold text-foreground">All Emails</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Every email received across all your domains</p>
      </div>

      <div className="rounded border border-border bg-card divide-y divide-border">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-1.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))
        ) : emails && emails.length > 0 ? (
          emails.map((email) => {
            const expanded = expandedId === email.id;
            return (
              <div key={email.id} data-testid={`inbox-email-${email.id}`}>
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
                      {!email.isRead && (
                        <Badge variant="outline" className="text-primary border-primary/30 font-mono text-[10px] px-1 py-0 shrink-0">NEW</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="text-foreground/70">{email.fromAddress}</span>
                      <span className="mx-1.5 text-muted-foreground/40">&rarr;</span>
                      <span className="text-primary/80 font-mono">{email.toAddress}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/40">via {email.subdomainName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      data-testid={`button-delete-inbox-${email.id}`}
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
                      <div><span className="text-muted-foreground">From:</span> <span className="text-foreground">{email.fromAddress}</span></div>
                      <div><span className="text-muted-foreground">To:</span> <span className="text-primary">{email.toAddress}</span></div>
                      <div><span className="text-muted-foreground">Domain:</span> <span className="text-foreground">{email.subdomainName}</span></div>
                      <div><span className="text-muted-foreground">Received:</span> <span className="text-foreground">{format(new Date(email.receivedAt), "MMM d, yyyy HH:mm")}</span></div>
                    </div>
                    <div className="border-t border-border pt-3">
                      {email.bodyHtml ? (
                        <div className="prose prose-sm prose-invert max-w-none text-xs" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No emails yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Emails will appear here once your webhook receives them</p>
          </div>
        )}
      </div>
    </div>
  );
}
