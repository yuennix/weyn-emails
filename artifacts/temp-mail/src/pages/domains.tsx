import {
  useListSubdomains,
  useCreateSubdomain,
  useDeleteSubdomain,
  getListSubdomainsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Globe, Loader2, Mail } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the domains that capture incoming emails
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Domain
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-primary">New Domain</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. mail.example.com"
              className="flex-1 bg-background/80 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold disabled:opacity-40 transition-all"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-3 py-2.5 rounded-lg border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Emails sent to any address @this-domain will be captured
          </p>
        </form>
      )}

      {/* Domain list */}
      <div className="rounded-xl border border-white/8 bg-card overflow-hidden shadow-xl shadow-black/20">
        {/* Column headers */}
        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-9 shrink-0" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex-1">
              Domain
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-24 text-right hidden sm:block">
              Emails
            </span>
            <div className="w-8 shrink-0" />
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-9 w-9 rounded-lg bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 bg-white/8 rounded" />
                  <div className="h-3 w-28 bg-white/5 rounded" />
                </div>
                <div className="h-3 w-12 bg-white/5 rounded hidden sm:block" />
              </div>
            ))
          ) : subdomains && subdomains.length > 0 ? (
            subdomains.map((sub) => (
              <div
                key={sub.id}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {sub.unreadCount > 0 && (
                      <span className="text-xs font-semibold text-primary">{sub.unreadCount} new</span>
                    )}
                    <span className="text-xs text-muted-foreground/50">
                      Added {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="w-24 text-right hidden sm:block shrink-0">
                  <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {sub.emailCount}
                  </span>
                </div>

                {/* Delete */}
                {deleteConfirm === sub.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Remove?</span>
                    <button
                      onClick={() => remove.mutate({ id: sub.id })}
                      disabled={remove.isPending}
                      className="px-2.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(sub.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove domain"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
                <Globe className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No domains added yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Add a domain above to start receiving emails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
