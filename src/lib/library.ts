import { request } from "./api";
import type { CorpusDocument, CorpusListParams } from "./corpus";

/**
 * Library API — the case-law corpus knowledge base for judges/mediators.
 * Listing is DB-backed (`case_law_documents`, published only) so it supports
 * server-side search, sort and filter. The backend serves it at
 * /api/v1/library/documents.
 */

export interface LibraryListResponse {
  items: CorpusDocument[];
  total: number;
}

export const library = {
  listDocuments: (params: Partial<CorpusListParams> = {}): Promise<LibraryListResponse> => {
    const qs = new URLSearchParams();
    (Object.entries(params) as [string, unknown][]).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    });
    const s = qs.toString();
    return request<{
      success: boolean;
      items: CorpusDocument[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/v1/library/documents${s ? `?${s}` : ""}`).then((body) => ({
      items: body.items,
      total: body.total,
    }));
  },

  /** Resolve a short-lived presigned URL for reading one stored object. */
  sign: async (key: string): Promise<{ url: string; quota: { used: number; limit: number; remaining: number } }> => {
    const r = await request<{
      success: boolean;
      data: { url: string; quota: { used: number; limit: number; remaining: number } };
    }>(`/api/v1/library/documents/sign?key=${encodeURIComponent(key)}`);
    return { url: r.data.url, quota: r.data.quota };
  },

  /** Current user's today's Library download usage + limit. */
  quota: async (): Promise<{ used: number; limit: number; remaining: number }> => {
    const r = await request<{ success: boolean; data: { used: number; limit: number; remaining: number } }>(
      "/api/v1/library/quota"
    );
    return r.data;
  },
};

export interface LibraryQuotaUserRow {
  user: { id: number; email: string; role: string; profile?: { first_name?: string | null; last_name?: string | null } | null };
  limit: number | null;
  used: number;
}

/** Owner/admin panel — manage per-user Library download quotas. */
export const adminLibraryQuotas = {
  list: (params: { limit?: number; offset?: number; search?: string; role?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    const s = qs.toString();
    return request<{
      success: boolean;
      data: { items: LibraryQuotaUserRow[]; total: number; limit: number; offset: number };
    }>(`/api/v1/admin/library-quotas${s ? `?${s}` : ""}`);
  },

  setLimit: (userId: number, dailyLimit: number | null) =>
    request(`/api/v1/admin/library-quotas/${userId}`, {
      method: "PUT",
      json: { daily_limit: dailyLimit },
    }),

  clearLimit: (userId: number) =>
    request(`/api/v1/admin/library-quotas/${userId}`, { method: "DELETE" }),
};
