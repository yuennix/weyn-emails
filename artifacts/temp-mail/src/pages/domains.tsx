import {
  useListSubdomains,
  useCreateSubdomain,
  useDeleteSubdomain,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Globe, Loader2, Mail, X, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DomainsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: subdomains, isLoading } = useListSubdomains({
    query: { queryKey: getListSubdomainsQueryKey() },
  });

  const create = useCreateSubdomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
        setNewName("");
        setShowAdd(false);
      },
    },
  });

  const createError = create.error
    ? ((create.error as { data?: { error?: string } })?.data?.error ?? (create.error as Error)?.message ?? "Failed to add domain")
    : null;

  const remove = useDeleteSubdomain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubdomainsQueryKey() });
        setDeleteConfirm(null);
      },
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    create.mutate({ data: { name: newName.trim() } });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage domains that capture incoming emails
          </p>
        </div>
        <button
          onClick={() => { setShowAdd((v) => !v); setNewName(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md shadow-primary/25 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Add domain form */}
      {showAdd && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">New Domain</p>
            <button onClick={() => { setShowAdd(false); setNewName(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. mail.example.com"
              className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <p className="text-xs text-muted-foreground">
              All emails sent to any address @this-domain will be captured and available in the inbox.
            </p>
            {createError && (
              <p className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {createError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={create.isPending || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold disabled:opacity-40 transition-all"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Domain"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewName(""); }}
                className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Domain list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl shadow-black/20">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-5 animate-pulse">
                <div className="h-11 w-11 rounded-xl bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-44 bg-white/8 rounded-lg" />
                  <div className="h-3 w-28 bg-white/5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : subdomains && subdomains.length > 0 ? (
          <div className="divide-y divide-border">
            {subdomains.map((sub) => (
              <div
                key={sub.id}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
              >
                {/* Domain icon */}
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {sub.emailCount} email{sub.emailCount !== 1 ? "s" : ""}
                    </span>
                    {sub.unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                        {sub.unreadCount} new
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/40">
                      Added {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Delete controls */}
                {deleteConfirm === sub.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">Remove domain?</span>
                    <button
                      onClick={() => remove.mutate({ id: sub.id })}
                      disabled={remove.isPending}
                      className="px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(sub.id)}
                    className="shrink-0 p-2 rounded-xl hover:bg-destructive/12 text-muted-foreground/20 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove domain"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <Globe className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-white">No domains yet</p>
            <p className="text-xs text-muted-foreground mt-1.5">Add a domain above to start receiving emails</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-semibold transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Your First Domain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
