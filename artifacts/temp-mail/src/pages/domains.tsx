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
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Domains</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Manage domains that receive temp emails
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-violet-500/30 bg-[#13112a] p-4 space-y-3"
        >
          <p className="font-mono text-xs font-semibold text-violet-400 uppercase tracking-wider">
            New Domain
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. exceweyn.run.place"
              className="flex-1 bg-[#1e1a3a] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={create.isPending || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="px-3 py-2.5 rounded-xl border border-white/10 bg-[#1e1a3a] text-sm text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="font-mono text-[10px] text-white/30">
            Emails sent to any address @this-domain will be captured
          </p>
        </form>
      )}

      {/* Domain list */}
      <div className="rounded-2xl border border-white/10 bg-[#13112a] overflow-hidden divide-y divide-white/5">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
              <div className="h-3.5 w-48 bg-white/10 rounded" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </div>
          ))
        ) : subdomains && subdomains.length > 0 ? (
          subdomains.map((sub) => (
            <div key={sub.id} className="group flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-white truncate">{sub.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Mail className="h-3 w-3" />
                    {sub.emailCount} emails
                    {sub.unreadCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 font-mono text-[10px]">
                        {sub.unreadCount} new
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-white/25">
                    added {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Delete button / confirm */}
              {deleteConfirm === sub.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/50">Remove?</span>
                  <button
                    onClick={() => remove.mutate({ id: sub.id })}
                    disabled={remove.isPending}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
                  >
                    {remove.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1 rounded-lg border border-white/10 text-white/50 hover:text-white text-xs transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(sub.id)}
                  className="shrink-0 p-2 rounded-xl hover:bg-red-600/10 text-white/25 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove domain"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="h-14 w-14 rounded-2xl bg-violet-600/10 flex items-center justify-center mb-3">
              <Globe className="h-7 w-7 text-violet-500/40" />
            </div>
            <p className="text-sm text-white/50">No domains added yet</p>
            <p className="text-xs text-white/25 mt-1">Click "Add Domain" above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
