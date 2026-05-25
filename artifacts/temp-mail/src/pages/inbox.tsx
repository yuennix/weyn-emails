import { EmailBody } from "@/components/email-body";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

const AVATAR_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-emerald-600",
  "bg-amber-600", "bg-rose-600", "bg-cyan-600",
];

function avatarColor(from: string) {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function senderInitials(from: string) {
  const name = from.split("<")[0].trim() || from;
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Inbox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: emails, isLoading } = useListRecentEmails(
    { limit: 100 },
    { query: { queryKey: getListRecentEmailsQueryKey({ limit: 100 }) } }
  );

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

  const unreadCount = emails?.filter((e) => !e.isRead).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">All Emails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {unreadCount > 0
            ? <><span className="text-primary font-semibold">{unreadCount} unread</span> across all domains</>
            : "Every email received across all your domains"
          }
        </p>
      </div>

      {/* Email list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/20">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : emails && emails.length > 0 ? (
          emails.map((email) => {
            const expanded = expandedId === email.id;
            const color = avatarColor(email.fromAddress);
            return (
              <div key={email.id} data-testid={`inbox-email-${email.id}`} className="border-b border-border last:border-0">
                <div
                  className={`group flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                    expanded
                      ? "bg-primary/6 border-l-[3px] border-primary"
                      : "hover:bg-white/3 border-l-[3px] border-transparent"
                  }`}
                  onClick={() => handleExpand(email.id, email.isRead)}
                >
                  {/* Avatar */}
                  <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                    {senderInitials(email.fromAddress)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!email.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "text-white font-semibold"}`}>
                        {email.subject || "(no subject)"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span>{email.fromAddress}</span>
                      <span className="mx-1.5 text-muted-foreground/30">→</span>
                      <span className="text-primary/70 font-mono">{email.toAddress}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground/40 font-mono">
                      <span>{formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}</span>
                      <span>·</span>
                      <span>{email.subdomainName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      data-testid={`button-delete-inbox-${email.id}`}
                      onClick={(e) => { e.stopPropagation(); deleteEmail.mutate({ id: email.id }); }}
                      className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {expanded
                      ? <ChevronDown className="h-4 w-4 text-primary" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
                  </div>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="border-t border-border bg-background/40">
                    <div className="px-5 py-4 border-b border-border space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 font-mono text-xs">
                        <div><span className="text-muted-foreground/50">From: </span><span className="text-foreground">{email.fromAddress}</span></div>
                        <div><span className="text-muted-foreground/50">To: </span><span className="text-primary">{email.toAddress}</span></div>
                        <div><span className="text-muted-foreground/50">Domain: </span><span className="text-foreground">{email.subdomainName}</span></div>
                        <div><span className="text-muted-foreground/50">Received: </span><span className="text-foreground">{format(new Date(email.receivedAt), "MMM d, yyyy · HH:mm")}</span></div>
                      </div>
                    </div>
                    <div className="px-5 py-5">
                      <EmailBody bodyHtml={email.bodyHtml} bodyText={email.bodyText} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <Mail className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-white">No emails yet</p>
            <p className="text-xs text-muted-foreground mt-1.5">Emails will appear here once your webhook receives them</p>
          </div>
        )}
      </div>
    </div>
  );
}
