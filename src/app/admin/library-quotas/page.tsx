"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminLibraryQuotas, type LibraryQuotaUserRow } from "@/lib/library";
import { Spinner } from "@/components/ui/Button";
import { SearchInput, FilterSelect, EmptyState, ErrorState } from "@/components/admin/ui";

const PAGE_SIZE = 50;

const ROLE_OPTIONS = [
  "officer",
  "cvo",
  "legal_board",
  "admin",
  "owner",
  "corpus_researcher",
  "corpus_curator",
  "legal_practitioner",
  "judiciary",
].map((r) => ({ value: r, label: r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));

const roleLabel = (role: string) => role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function LibraryQuotasPage() {
  const [rows, setRows] = useState<LibraryQuotaUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [role, setRole] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);

  const loadPage = useCallback(async (opts: { offset: number; append: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await adminLibraryQuotas.list({
        limit: PAGE_SIZE,
        offset: opts.offset,
        search: appliedSearch || undefined,
        role: role || undefined,
      });
      setTotal(res.data.total);
      setRows((prev) => (opts.append ? [...prev, ...res.data.items] : res.data.items));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load quotas");
      if (!opts.append) setRows([]);
    } finally {
      busyRef.current = false;
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [appliedSearch, role]);

  useEffect(() => {
    setInitialLoading(true);
    setRows([]);
    setTotal(0);
    loadPage({ offset: 0, append: false });
  }, [loadPage]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (initialLoading) return;
    if (rows.length >= total) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !busyRef.current && rows.length < total) {
          setLoadingMore(true);
          loadPage({ offset: rows.length, append: true });
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialLoading, rows.length, total, loadPage]);

  const applyLimit = async (row: LibraryQuotaUserRow) => {
    const value = Number(edits[row.user.id]);
    if (!Number.isFinite(value) || value <= 0) return;
    setBusyId(row.user.id);
    try {
      await adminLibraryQuotas.setLimit(row.user.id, Math.floor(value));
      setEdits((prev) => { const next = { ...prev }; delete next[row.user.id]; return next; });
      loadPage({ offset: 0, append: false });
    } finally {
      setBusyId(null);
    }
  };

  const clearLimit = async (row: LibraryQuotaUserRow) => {
    setBusyId(row.user.id);
    try {
      await adminLibraryQuotas.clearLimit(row.user.id);
      loadPage({ offset: 0, append: false });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[940px] mx-auto py-2 sm:py-4">
      <div className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-navy mb-2">Owner workspace</p>
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-sutra-ink">Library Quotas</h1>
        <p className="text-[14px] sm:text-[15px] text-sutra-ink-3 mt-1">
          Daily document view/download limit per user. Default is 5; set a per-user override to extend it.
        </p>
        <div className="mt-3 rounded-xl border border-sutra-line bg-tint/40 px-3.5 py-2.5 text-[12.5px] text-sutra-ink-2">
          Note: each generated download link stays valid for 1 hour from creation. Reusing a saved link within that window does not consume extra daily quota.
        </div>
      </div>

      <section className="bg-white border border-sutra-line rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name or email..."
            className="flex-1 min-w-[220px]"
          />
          <FilterSelect value={role} onChange={setRole} options={ROLE_OPTIONS} allLabel="All roles" />
        </div>

        {initialLoading ? (
          <div className="py-10 grid place-items-center"><Spinner className="w-6 h-6 text-navy" /></div>
        ) : loadError ? (
          <ErrorState title="Couldn't load quotas" message={loadError} />
        ) : rows.length === 0 ? (
          <EmptyState title="No users match" description="Adjust the search or role filter." />
        ) : (
          <>
            <p className="text-[12px] text-sutra-ink-3 mb-3">{total} user{total === 1 ? "" : "s"}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-sutra-ink-3 border-b border-sutra-line">
                    <th className="py-2 pr-3 font-bold">User</th>
                    <th className="py-2 pr-3 font-bold">Role</th>
                    <th className="py-2 pr-3 font-bold">Used today</th>
                    <th className="py-2 pr-3 font-bold">Daily limit</th>
                    <th className="py-2 font-bold">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sutra-line-2">
                  {rows.map((row) => {
                    const name = [row.user.profile?.first_name, row.user.profile?.last_name].filter(Boolean).join(" ");
                    const editing = edits[row.user.id] !== undefined;
                    return (
                      <tr key={row.user.id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-sutra-ink truncate max-w-[220px]">{name || row.user.email}</p>
                          <p className="text-[11.5px] text-sutra-ink-3 truncate max-w-[220px]">{row.user.email}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-sutra-ink-2">{roleLabel(row.user.role)}</td>
                        <td className="py-2.5 pr-3 text-sutra-ink-2">{row.used}</td>
                        <td className="py-2.5 pr-3">
                          {row.limit === null ? (
                            <span className="text-sutra-ink-3">5 (default)</span>
                          ) : (
                            <span className="font-semibold text-navy">{row.limit}</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              placeholder="Limit"
                              value={edits[row.user.id] ?? ""}
                              onChange={(e) => setEdits((p) => ({ ...p, [row.user.id]: e.target.value }))}
                              className="w-20 h-8 rounded-lg border border-sutra-line px-2 text-[13px] focus:border-navy/50 focus:outline-none"
                            />
                            <button
                              onClick={() => applyLimit(row)}
                              disabled={busyId === row.user.id || !editing}
                              className="h-8 px-3 rounded-lg bg-navy text-white text-[12px] font-bold hover:bg-navy-dark disabled:opacity-40"
                            >
                              Apply
                            </button>
                            {row.limit !== null && (
                              <button
                                onClick={() => clearLimit(row)}
                                disabled={busyId === row.user.id}
                                className="h-8 px-3 rounded-lg border border-sutra-line text-sutra-ink-2 text-[12px] font-semibold hover:text-navy disabled:opacity-40"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div ref={sentinelRef} className="pt-4">
              {loadingMore && (
                <div className="py-3 grid place-items-center"><Spinner className="w-5 h-5 text-navy" /></div>
              )}
              {!loadingMore && rows.length >= total && total > 0 && (
                <p className="text-center text-[12px] text-sutra-ink-3 py-2">End of list.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
