import {
  useListAddresses,
  useGenerateAddress,
  useDeleteAddress,
  useListSubdomains,
  getListAddressesQueryKey,
  getListSubdomainsQueryKey,
  getGetStatsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Trash2, AtSign, ChevronRight, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Addresses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [subdomainId, setSubdomainId] = useState<string>("");
  const [customLocal, setCustomLocal] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: addresses, isLoading } = useListAddresses({ query: { queryKey: getListAddressesQueryKey() } });
  const { data: subdomains } = useListSubdomains({ query: { queryKey: getListSubdomainsQueryKey() } });

  const generate = useGenerateAddress({
    mutation: {
      onSuccess: (addr) => {
        queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        setShowForm(false);
        setSubdomainId("");
        setCustomLocal("");
        toast({ title: "Address generated", description: addr.fullAddress });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate address", variant: "destructive" });
      },
    },
  });

  const remove = useDeleteAddress({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
        toast({ title: "Address deleted" });
      },
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomainId) return;
    generate.mutate({
      data: {
        subdomainId: Number(subdomainId),
        ...(customLocal.trim() ? { localPart: customLocal.trim() } : {}),
      },
    });
  };

  const copyAddress = (id: number, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: address });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold text-foreground">Addresses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate temporary email addresses at your domains</p>
        </div>
        <Button
          data-testid="button-generate-address"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5 font-mono text-xs"
          disabled={!subdomains || subdomains.length === 0}
        >
          <Plus className="h-3.5 w-3.5" />
          Generate
        </Button>
      </div>

      {!subdomains || subdomains.length === 0 ? (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-400 font-mono">You need to add a domain first before generating addresses.</p>
          <Link href="/domains" className="text-xs text-primary hover:underline font-mono mt-1 inline-block">Add a domain &rarr;</Link>
        </div>
      ) : null}

      {/* Generate form */}
      {showForm && subdomains && subdomains.length > 0 && (
        <form onSubmit={handleGenerate} className="rounded border border-primary/30 bg-card p-4 space-y-3">
          <p className="font-mono text-xs font-semibold text-primary uppercase tracking-wider">Generate Address</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono">Domain</Label>
            <Select value={subdomainId} onValueChange={setSubdomainId}>
              <SelectTrigger data-testid="select-domain" className="font-mono text-sm">
                <SelectValue placeholder="Select a domain..." />
              </SelectTrigger>
              <SelectContent>
                {subdomains.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)} className="font-mono text-sm">
                    @{sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono">Local part <span className="text-muted-foreground">(optional — auto-generated if empty)</span></Label>
            <Input
              data-testid="input-local-part"
              value={customLocal}
              onChange={(e) => setCustomLocal(e.target.value)}
              placeholder="e.g. myalias"
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              data-testid="button-submit-address"
              type="submit"
              size="sm"
              disabled={generate.isPending || !subdomainId}
              className="font-mono text-xs gap-1.5"
            >
              {generate.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Generate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)} className="font-mono text-xs">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Address list */}
      <div className="rounded border border-border bg-card divide-y divide-border">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-1.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : addresses && addresses.length > 0 ? (
          addresses.map((addr) => (
            <div
              key={addr.id}
              data-testid={`address-row-${addr.id}`}
              className="group flex items-center gap-3 px-4 py-4 hover:bg-accent/20 transition-colors"
            >
              <AtSign className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/addresses/${addr.id}`} className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                    {addr.fullAddress}
                  </Link>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{addr.emailCount} emails</span>
                  <span className="font-mono text-[10px] text-muted-foreground">created {formatDistanceToNow(new Date(addr.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {addr.unreadCount > 0 && (
                  <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/30">{addr.unreadCount} new</Badge>
                )}
                <button
                  data-testid={`button-copy-${addr.id}`}
                  onClick={() => copyAddress(addr.id, addr.fullAddress)}
                  className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Copy address"
                >
                  {copiedId === addr.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <Link
                  href={`/addresses/${addr.id}`}
                  data-testid={`button-view-address-${addr.id}`}
                  className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <button
                  data-testid={`button-delete-address-${addr.id}`}
                  onClick={() => { if (confirm(`Delete ${addr.fullAddress}?`)) remove.mutate({ id: addr.id }); }}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <AtSign className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No addresses generated yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Generate a temp address at one of your domains</p>
          </div>
        )}
      </div>
    </div>
  );
}
