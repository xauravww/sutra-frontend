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
  sign: async (key: string): Promise<string> => {
    const r = await request<{ success: boolean; data: { url: string } }>(
      `/api/v1/library/documents/sign?key=${encodeURIComponent(key)}`
    );
    return r.data.url;
  },
};
