import { EmailBody } from "@/components/email-body";
import {
  useGetAddress,
  useListEmailsByAddress,
  useMarkEmailRead,
  useDeleteEmail,
  getGetAddressQueryKey,
  getListEmailsByAddressQueryKey,
  getGetStatsSummaryQueryKey,
  getListAddressesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Mail, MailOpen, Trash2, AtSign, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

export default function AddressInbox() {
  const { id } = useParams<{ id: string }>();
  const addrId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: addr, isLoading: addrLoading } = useGetAddress(addrId, {
    query: { enabled: !!addrId, queryKey: getGetAddressQueryKey(addrId) },
  });

  const { data: emails, isLoading: emailsLoading } = useListEmailsByAddress(addrId, {
    query: { enabled: !!addrId, queryKey: getListEmailsByAddressQueryKey(addrId) },
  });

  const markRead = useMarkEmailRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmailsByAddressQueryKey(addrId) });
        queryClient.invalidateQueries({ queryKey: getGetAddressQueryKey(addrId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
      },
    },
  });

  const deleteEmail = useDeleteEmail({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmailsByAddressQueryKey(addrId) });
        queryClient.invalidateQueries({ queryKey: getGetAddressQueryKey(addrId) });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        toast({ title: "Email deleted" });
      },
    },
  });

  const handleExpand = (emailId: number, isRead: boolean) => {
    setExpandedId((prev) => (prev === emailId ? null : emailId));
    if (!isRead) markRead.mutate({ id: emailId });
  };

  const copyAddress = () => {
    if (!addr) return;
    navigator.clipboard.writeText(addr.fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: addr.fullAddress });
  };

  if (addrLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!addr) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AtSign className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="font-mono text-sm text-muted-foreground">Address not found</p>
        <Link href="/addresses" className="text-xs text-primary hover:underline mt-2 font-mono">Back to Addresses</Link>
      </div>
    );
  }

  const sortedEmails = emails ? [...emails].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()) : [];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link href="/addresses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono mb-3">
          <ArrowLeft className="h-3 w-3" /> Addresses
        </Link>
        <div className="flex items-start gap-3">
          <AtSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold text-foreground truncate">{addr.fullAddress}</h1>
              <button
                data-testid="button-copy-address"
                onClick={copyAddress}
                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">{addr.emailCount} emails</span>
              {addr.unreadCount > 0 && (
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/30">{addr.unreadCount} unread</Badge>
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
                    <span className={`font-mono text-xs font-semibold truncate block ${email.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                      {email.subject}
                    </span>
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
                      <div><span className="text-muted-foreground">From:</span> <span className="text-foreground">{email.fromAddress}</span></div>
                      <div><span className="text-muted-foreground">To:</span> <span className="text-primary">{email.toAddress}</span></div>
                      <div><span className="text-muted-foreground">Received:</span> <span className="text-foreground">{format(new Date(email.receivedAt), "MMM d, yyyy HH:mm")}</span></div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <EmailBody bodyHtml={email.bodyHtml} bodyText={email.bodyText} />
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
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{addr.fullAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
}
