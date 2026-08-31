/**
 * Sutra API Client — connects to the tvs-backend-upgraded Express server.
 *
 * All endpoints live under /api/v1.  Cookies are sent automatically
 * (credentials: "include") so httpOnly JWTs work across tab sessions.
 */

export const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3015";

/* ------------------------------------------------------------------ */
/*  Generic fetch wrapper                                              */
/* ------------------------------------------------------------------ */

type ApiOptions = RequestInit & { json?: unknown };

/** Shared fetch helper — reused by the admin/corpus service modules. */
export async function request<T = unknown>(
  path: string,
  { json, ...init }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...(init.headers as Record<string, string>),
  };

  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }

  // Attach Bearer token if present (client-side storage fallback)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    // Network failure (server down, no connection) — surface a readable
    // message instead of the browser's raw "Failed to fetch".
    throw new ApiError(0, "Unable to reach the server. Please check your connection and try again.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(res.status, body?.message ?? res.statusText, body);
  }

  // Some endpoints return 204/empty bodies (e.g. DELETE plan) — parse defensively.
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Auto-logout on 401: clear stored auth state and redirect to login.
 * Avoids redirect loops by checking we're on the client and not already
 * on the login page.
 */
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  // Prevent redirect loop if already on /login
  if (window.location.pathname === "/login") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export interface LoginPayload {
  email: string;
  password: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    role: string;
    whatsapp_number?: string;
  };
}

export const auth = {
  login: (data: LoginPayload) =>
    request<{ success: boolean; data: AuthTokens }>("/api/v1/auth/login", {
      method: "POST",
      json: data,
    }),

  register: (data: { email: string; password: string; role: string }) =>
    request<{ success: boolean; data: { user: Record<string, unknown> } }>(
      "/api/v1/auth/register",
      { method: "POST", json: data }
    ),

  logout: () =>
    request("/api/v1/auth/logout", { method: "POST" }),

  timeout: () =>
    request("/api/v1/auth/timeout", { method: "POST" }),

  refreshToken: (refreshToken: string) =>
    request<{ success: boolean; data: AuthTokens }>(
      "/api/v1/auth/refresh-token",
      { method: "POST", json: { refreshToken } }
    ),

  forgotPassword: (email: string) =>
    request("/api/v1/auth/forgot-password", {
      method: "POST",
      json: { email },
    }),

  sendOtp: (email: string) =>
    request<{ success: boolean; data: { otpCode?: string } }>("/api/v1/mail/send-otp", {
      method: "POST",
      json: { to: email, validityDuration: "10 minutes" },
    }),

  verifyOtp: (email: string, otpCode: string) =>
    request<{ success: boolean; message: string }>("/api/v1/mail/verify-otp", {
      method: "POST",
      json: { to: email, otpCode, is_verified: true },
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ success: boolean; message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      json: { token, newPassword },
    }),
};

/* ------------------------------------------------------------------ */
/*  Cases                                                              */
/* ------------------------------------------------------------------ */

export interface Case {
  id: number;
  title: string;
  case_number?: string;
  status: string;
  party_a_name?: string;
  party_b_name?: string;
  created_at: string;
  updated_at?: string;
  documents_count?: number;
}

export const cases = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; data: Case[] }>(`/api/v1/cases${qs}`);
  },

  get: (caseId: number) =>
    request<{ success: boolean; data: Case }>(`/api/v1/cases/${caseId}`),

  getDocuments: (caseId: number) =>
    request(`/api/v1/cases/${caseId}/documents`),
};

/* ------------------------------------------------------------------ */
/*  AI Chat                                                            */
/* ------------------------------------------------------------------ */

export interface ChatSession {
  id: number;
  title: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  citations?: unknown;
  confidence_score?: number;
  created_at: string;
}

export const aiChat = {
  listSessions: () =>
    request<{ success: boolean; data: ChatSession[] }>(
      "/api/v1/ai-chat/sessions"
    ),

  createSession: (title?: string) =>
    request<{ success: boolean; data: ChatSession }>(
      "/api/v1/ai-chat/sessions",
      { method: "POST", json: { title: title ?? "New Chat" } }
    ),

  getMessages: (sessionId: number) =>
    request<{ success: boolean; data: ChatMessage[] }>(
      `/api/v1/ai-chat/sessions/${sessionId}/messages`
    ),

  sendMessage: async (
    sessionId: number,
    content: string,
    pdf?: File
  ) => {
    const formData = new FormData();
    formData.append("content", content);
    if (pdf) formData.append("pdf", pdf);

    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(
        `${BASE}/api/v1/ai-chat/sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers,
          body: formData,
          credentials: "include",
        }
      );
    } catch {
      throw new ApiError(0, "Unable to reach the server. Please check your connection and try again.");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) handleUnauthorized();
      throw new ApiError(res.status, body?.message ?? res.statusText, body);
    }

    return res.json();
  },

  deleteSession: (sessionId: number) =>
    request(`/api/v1/ai-chat/sessions/${sessionId}`, { method: "DELETE" }),

  usage: () =>
    request<{ success: boolean; data: { used: number; limit: number | null; remaining: number | null; is_subscribed: boolean } }>(
      "/api/v1/ai-chat/usage"
    ),
};

/* ------------------------------------------------------------------ */
/*  Mediation                                                          */
/* ------------------------------------------------------------------ */

export interface MediationSession {
  id: number;
  title: string;
  status: string;
  party_a_name: string;
  party_b_name: string;
  dispute_summary?: string;
  created_at: string;
  documents?: unknown[];
  analysis?: unknown;
}

export const mediation = {
  list: () =>
    request<{ success: boolean; data: MediationSession[] }>(
      "/api/v1/mediation/sessions"
    ),

  get: (id: number) =>
    request<{ success: boolean; data: MediationSession }>(
      `/api/v1/mediation/sessions/${id}`
    ),

  delete: (id: number) =>
    request(`/api/v1/mediation/sessions/${id}`, { method: "DELETE" }),

  smartFill: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE}/api/v1/mediation/smart-fill`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async r => { const body = await r.json(); if (!r.ok) throw new ApiError(r.status, body?.message ?? "Smart fill failed", body); return body; });
  },

  create: (data: {
    title: string;
    party_a_name: string;
    party_b_name: string;
    dispute_summary?: string;
  }) =>
    request<{ success: boolean; data: MediationSession }>(
      "/api/v1/mediation/sessions",
      { method: "POST", json: data }
    ),

  analyze: (id: number) =>
    request(`/api/v1/mediation/sessions/${id}/analyze`, { method: "POST" }),

  chat: (id: number, question: string) =>
    request(`/api/v1/mediation/sessions/${id}/chat`, {
      method: "POST",
      json: { question },
    }),

  uploadDocument: (id: number, file: File, partyType: "PARTY_A" | "PARTY_B", documentType = "OTHER") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("party_type", partyType);
    formData.append("document_type", documentType);
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE}/api/v1/mediation/sessions/${id}/documents`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async r => { const body = await r.json(); if (!r.ok) throw new ApiError(r.status, body?.message ?? "Upload failed", body); return body; });
  },

  uploadBatch: (id: number, files: { file: File; tag: string; docType: string }[]) => {
    const formData = new FormData();
    files.forEach(f => {
      formData.append("files", f.file);
    });
    files.forEach(f => formData.append("tags", f.tag));
    files.forEach(f => formData.append("document_types", f.docType));
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE}/api/v1/mediation/sessions/${id}/documents/batch`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async r => { const body = await r.json(); if (!r.ok) throw new ApiError(r.status, body?.message ?? "Batch upload failed", body); return body; });
  },

  update: (id: number, data: { title?: string; party_a_name?: string; party_b_name?: string; dispute_summary?: string }) =>
    request(`/api/v1/mediation/sessions/${id}`, {
      method: "PUT",
      json: data,
    }),

  syncFromDocs: (id: number) =>
    request(`/api/v1/mediation/sessions/${id}/sync-from-docs`, { method: "POST" }),

  deleteDocument: (sessionId: number, docId: number) =>
    request(`/api/v1/mediation/sessions/${sessionId}/documents/${docId}`, { method: "DELETE" }),

  saveSettlement: (id: number, notes: string) =>
    request(`/api/v1/mediation/sessions/${id}/settlement`, {
      method: "PUT",
      json: { notes },
    }),

  updateStatus: (id: number, status: string) =>
    request(`/api/v1/mediation/sessions/${id}/status`, {
      method: "PUT",
      json: { status },
    }),
};

/* ------------------------------------------------------------------ */
/*  Judicial Cases                                                     */
/* ------------------------------------------------------------------ */

export interface JudicialCase {
  id: number;
  title: string;
  case_number?: string;
  status: string;
  pdf_filename?: string;
  page_count?: number;
  created_at: string;
  updated_at: string;
}

export interface JudicialDocument {
  id: string;
  original_filename: string;
  file_url: string;
  wasabi_key?: string;
  file_size_bytes: number;
  document_type: string;
  page_count?: number;
  uploaded_at: string;
  page_summaries?: {
    page_number: number;
    summary?: string | null;
    status: string;
  }[];
}

export interface JudicialCaseDetail extends JudicialCase {
  pdf_url?: string;
  pdf_size_bytes?: number;
  parties?: unknown[];
  accused?: unknown[];
  witnesses?: unknown[];
  documents?: JudicialDocument[];
  evidence?: unknown[];
  chronology?: unknown[];
  case_brief?: unknown;
  legal_provisions?: unknown[];
  mediation_status?: "required" | "not_required" | "not_determined" | null;
  mediation_reason?: string | null;
  important_pages?: {
    page: string;
    title: string;
    reason: string;
  }[];
  police_station?: {
    station?: string;
    fir_number?: string;
    fir_date?: string;
    sections?: string;
    investigating_officer?: string;
    io_badge?: string;
    io_contact?: string;
    charge_sheet_status?: string;
  } | null;
  court_history?: {
    court?: string;
    stage?: string;
    date?: string;
    case_number?: string;
    action?: string;
    outcome?: string;
    page_reference?: string;
  }[];
}

export interface JudicialChatMessage {
  id: number;
  case_id: number;
  role: "user" | "assistant";
  content: string;
  citations?: unknown;
  created_at: string;
}

/** User-defined quick access card on the judge dashboard. */
export interface JudicialCaseCard {
  id: number;
  case_id: number;
  user_id: number;
  label: string;
  subtitle?: string | null;
  action_type: "chat" | "tab" | "folio" | "item";
  action_value: {
    query?: string;
    tab?: string;
    docId?: string;
    page?: number;
    index?: number;
  };
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const judicialCases = {
  list: () =>
    request<{ success: boolean; data: JudicialCase[] }>(
      "/api/v1/judicial-cases"
    ),

  get: (id: number) =>
    request<{ success: boolean; data: JudicialCaseDetail }>(
      `/api/v1/judicial-cases/${id}`
    ),

  create: (data: { title: string; case_number?: string }) =>
    request<{ success: boolean; data: JudicialCase }>(
      "/api/v1/judicial-cases",
      { method: "POST", json: data }
    ),

  delete: (id: number) =>
    request(`/api/v1/judicial-cases/${id}`, { method: "DELETE" }),

  updatePdf: (id: number, data: {
    pdf_url: string;
    pdf_filename: string;
    pdf_size_bytes: number;
    page_count?: number;
  }) =>
    request<{ success: boolean; data: JudicialCase }>(
      `/api/v1/judicial-cases/${id}/pdf`,
      { method: "PUT", json: data }
    ),

  updateStructure: (id: number, structure: Record<string, unknown>) =>
    request<{ success: boolean; data: JudicialCaseDetail }>(
      `/api/v1/judicial-cases/${id}/structure`,
      { method: "PUT", json: structure }
    ),

  analyze: (id: number) =>
    request<{ success: boolean; data: { status: string } }>(
      `/api/v1/judicial-cases/${id}/analyze`,
      { method: "POST" }
    ),

  uploadDocuments: (id: number, files: { file: File; docType: string }[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f.file));
    files.forEach(f => formData.append("document_types", f.docType));
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE}/api/v1/judicial-cases/${id}/documents`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async r => {
      const body = await r.json();
      if (!r.ok) throw new ApiError(r.status, body?.message ?? "Upload failed", body);
      return body as { success: boolean; data: JudicialCaseDetail };
    });
  },

  deleteDocument: (id: number, docId: string) =>
    request<{ success: boolean; data: JudicialCaseDetail }>(
      `/api/v1/judicial-cases/${id}/documents/${docId}`,
      { method: "DELETE" }
    ),

  getPageSummary: (id: number, docId: string, page: number) =>
    request<{
      success: boolean;
      data: { page_number: number; summary: string; status: string };
    }>(`/api/v1/judicial-cases/${id}/documents/${docId}/pages/${page}`),

  summarizeAllPages: (id: number, docId: string) =>
    request<{
      success: boolean;
      data: { page_number: number; summary: string; status: string }[];
    }>(`/api/v1/judicial-cases/${id}/documents/${docId}/summarize-all`, {
      method: "POST",
    }),

  chatHistory: (id: number) =>
    request<{ success: boolean; data: JudicialChatMessage[] }>(
      `/api/v1/judicial-cases/${id}/chat`
    ),

  chat: (id: number, question: string) =>
    request<{
      success: boolean;
      data: { answer: string; citations?: unknown[]; message_id: number };
    }>(`/api/v1/judicial-cases/${id}/chat`, {
      method: "POST",
      json: { question },
    }),

  /* User-defined quick access cards */
  listCards: (id: number) =>
    request<{ success: boolean; data: JudicialCaseCard[] }>(
      `/api/v1/judicial-cases/${id}/cards`
    ),

  createCard: (id: number, data: Partial<JudicialCaseCard>) =>
    request<{ success: boolean; data: JudicialCaseCard }>(
      `/api/v1/judicial-cases/${id}/cards`,
      { method: "POST", json: data }
    ),

  updateCard: (id: number, cardId: number, data: Partial<JudicialCaseCard>) =>
    request<{ success: boolean; data: JudicialCaseCard }>(
      `/api/v1/judicial-cases/${id}/cards/${cardId}`,
      { method: "PUT", json: data }
    ),

  deleteCard: (id: number, cardId: number) =>
    request(`/api/v1/judicial-cases/${id}/cards/${cardId}`, {
      method: "DELETE",
    }),
};

/* ------------------------------------------------------------------ */
/*  Case Workspace — per-page document summaries                       */
/* ------------------------------------------------------------------ */

export interface WorkspaceDocument {
  id: number;
  original_filename: string;
  file_sha256: string;
  file_url?: string | null;
  num_pages: number;
  status: string;
  created_at: string;
  updated_at?: string;
  is_new?: boolean;
  page_summaries?: {
    page_number: number;
    summary?: string | null;
    page_text?: string | null;
    status: string;
    updated_at?: string;
  }[];
}

export const workspace = {
  /** Upload a PDF into the workspace. Re-uploading the same bytes returns the stored doc + summaries. */
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${BASE}/api/v1/ai/workspace/documents`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new ApiError(r.status, body?.message ?? "Upload failed", body);
      return body as { success: boolean; data: WorkspaceDocument };
    });
  },

  /** List every workspace document for the current user (view anytime). */
  list: () =>
    request<{ success: boolean; data: WorkspaceDocument[] }>(
      "/api/v1/ai/workspace/documents"
    ),

  /** Fetch a document with all stored page summaries. */
  get: (id: number) =>
    request<{ success: boolean; data: WorkspaceDocument }>(
      `/api/v1/ai/workspace/documents/${id}`
    ),

  /** Stream the stored PDF bytes back (view anytime without re-upload). */
  getFile: async (id: number): Promise<ArrayBuffer> => {
    const headers: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}/api/v1/ai/workspace/documents/${id}/file`, {
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 401) handleUnauthorized();
      throw new ApiError(res.status, res.statusText);
    }
    return res.arrayBuffer();
  },

  /** Get one page's summary — generated + persisted on first hit, cached after. */
  getPageSummary: (id: number, page: number) =>
    request<{
      success: boolean;
      data: { page_number: number; summary: string; status: string };
    }>(`/api/v1/ai/workspace/documents/${id}/pages/${page}`),

  /** Backfill every page's summary in one request. */
  summarizeAll: (id: number) =>
    request(`/api/v1/ai/workspace/documents/${id}/summarize-all`, {
      method: "POST",
    }),

  delete: (id: number) =>
    request(`/api/v1/ai/workspace/documents/${id}`, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/*  Profile                                                            */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: number;
  email: string;
  role: string;
  account_status: string;
  email_verified: boolean;
  created_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    employee_id?: string;
    cadre_service?: string;
    designation_rank?: string;
    profile_photo_url?: string;
    head_office_address?: string;
    branch_office_address?: string;
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    preferred_language?: string;
  };
}

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  cadre_service?: string;
  designation_rank?: string;
  head_office_address?: string;
  branch_office_address?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  preferred_language?: string;
}

export const user = {
  getProfile: () =>
    request<{ success: boolean; data: UserProfile }>("/api/v1/users/me"),

  updateProfile: (data: UpdateProfilePayload) =>
    request<{ success: boolean; message: string }>("/api/v1/users/me", {
      method: "PUT",
      json: data,
    }),
};

/* ------------------------------------------------------------------ */
/*  Admin Panel                                                        */
/* ------------------------------------------------------------------ */

export interface AdminPagination {
  limit: number;
  offset: number;
  total: number;
  page?: number;
  total_pages?: number;
  pages?: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  account_status: string;
  first_name?: string | null;
  last_name?: string | null;
  email_verified?: boolean;
  whatsapp_number?: string | null;
  whatsapp_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    employee_id?: string | null;
    designation_rank?: string | null;
    cadre_service?: string | null;
    district?: string | null;
    state?: string | null;
    profile_photo_url?: string | null;
  } | null;
  subscription?: {
    id: number;
    status: string;
    plan_id?: number | null;
    plan?: { id: number; name?: string } | null;
    start_date?: string;
    end_date?: string | null;
  } | null;
}

export interface AdminCase {
  id: number;
  case_title: string;
  status?: string;
  priority?: string | null;
  officer_user_id?: number | null;
  assigned_cvo_id?: number | null;
  assigned_legal_board_id?: number | null;
  statement_of_charges?: string | null;
  imputation?: string | null;
  created_at?: string;
  updated_at?: string;
  officer?: { id: number; email: string; profile?: { first_name?: string | null; last_name?: string | null } | null } | null;
  assigned_cvo?: { id: number; email: string; profile?: { first_name?: string | null; last_name?: string | null } | null } | null;
  assigned_legal_board?: { id: number; email: string; profile?: { first_name?: string | null; last_name?: string | null } | null } | null;
}

export interface AdminJudicialCase {
  id: number;
  title: string;
  case_number?: string | null;
  status?: string;
  pdf_filename?: string | null;
  pdf_size_bytes?: number | null;
  page_count?: number | null;
  created_at?: string;
  updated_at?: string;
  user?: { id: number; email: string } | null;
}

export interface AdminSubscription {
  id: number;
  user_id: number | null;
  plan_id: number | null;
  status: string;
  start_date: string;
  end_date?: string | null;
  amount_paid?: number | null;
  last_reminder_sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: { id: number; email: string; first_name?: string | null; last_name?: string | null } | null;
  plan?: { id: number; name?: string; price_monthly?: number; price_yearly?: number } | null;
}

export interface AdminPlan {
  id: number;
  name: string;
  price_monthly: number | null;
  price_quarterly?: number | null;
  price_half_yearly?: number | null;
  price_yearly: number | null;
  is_popular?: boolean;
  features: Record<string, unknown>;
  active_subscriptions?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminAuditLog {
  id: number;
  user_id?: number | null;
  action?: string | null;
  details?: string | Record<string, unknown> | null;
  previous_hash?: string | null;
  current_hash?: string | null;
  created_at?: string;
  user?: { id: number; email: string; profile?: { first_name?: string | null; last_name?: string | null } | null } | null;
}

export const admin = {
  /* ---- Users ---- */
  listUsers: (params: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
    account_status?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.account_status) qs.set("account_status", params.account_status);
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminUser[]; pagination: AdminPagination } }>(
      `/api/v1/admin/users${s ? `?${s}` : ""}`
    );
  },

  getUser: (userId: number) =>
    request<{
      success: boolean;
      data: {
        user: AdminUser;
        subscriptions: AdminSubscription[];
        cases: AdminCase[];
        audit_logs: AdminAuditLog[];
      };
    }>(`/api/v1/admin/users/${userId}`),

  updateUserStatus: (userId: number, account_status: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/users/${userId}/status`, {
      method: "PUT",
      json: { account_status },
    }),

  updateUserRole: (userId: number, role: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/users/${userId}/role`, {
      method: "PUT",
      json: { role },
    }),

  createUser: (data: { email: string; password: string; role: string }) =>
    request<{ success: boolean; data: AdminUser }>("/api/v1/auth/register", {
      method: "POST",
      json: data,
    }),

  listCVOs: () =>
    request<{ success: boolean; data: AdminUser[] }>("/api/v1/admin/users/cvos/assignment"),

  /* ---- Cases ---- */
  listCases: (params: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("q", params.search);
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminCase[]; total: number } }>(
      `/api/v1/admin/cases${s ? `?${s}` : ""}`
    );
  },

  createCase: (data: { title: string; description: string; officer_id: number }) =>
    request<{ success: boolean; data: AdminCase }>("/api/v1/admin/cases", {
      method: "POST",
      json: data,
    }),

  updateCase: (
    caseId: number,
    data: { case_title?: string; description?: string; priority?: string; officer_id?: number }
  ) =>
    request<{ success: boolean; data: AdminCase }>(`/api/v1/admin/cases/${caseId}`, {
      method: "PUT",
      json: data,
    }),

  deleteCase: (caseId: number) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/cases/${caseId}`, {
      method: "DELETE",
    }),

  listJudicialCases: (params: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("q", params.search);
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminJudicialCase[]; total: number } }>(
      `/api/v1/admin/judicial-cases${s ? `?${s}` : ""}`
    );
  },

  deleteJudicialCase: (caseId: number) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/judicial-cases/${caseId}`, {
      method: "DELETE",
    }),

  createJudicialCase: (data: { title: string; case_number?: string; user_id?: number }) =>
    request<{ success: boolean; data: AdminJudicialCase }>("/api/v1/judicial-cases", {
      method: "POST",
      json: data,
    }),

  updateJudicialCase: (
    caseId: number,
    data: { title?: string; case_number?: string | null; user_id?: number }
  ) =>
    request<{ success: boolean; data: AdminJudicialCase }>(`/api/v1/admin/judicial-cases/${caseId}`, {
      method: "PUT",
      json: data,
    }),

  assignCaseToCVO: (caseId: number, cvo_id: number) =>
    request<{ success: boolean; data: AdminCase }>(`/api/v1/cases/${caseId}/assign-cvo`, {
      method: "POST",
      json: { cvo_id },
    }),

  /* ---- Subscriptions ---- */
  listSubscriptions: (params: {
    limit?: number;
    offset?: number;
    user?: string;
    planId?: number;
    status?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.user) qs.set("user", params.user);
    if (params.planId !== undefined) qs.set("planId", String(params.planId));
    if (params.status) qs.set("status", params.status);
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminSubscription[]; total: number } }>(
      `/api/v1/admin/subscriptions${s ? `?${s}` : ""}`
    );
  },

  getSubscription: (id: number) =>
    request<{ success: boolean; data: AdminSubscription }>(`/api/v1/admin/subscriptions/${id}`),

  createSubscription: (data: {
    user_id: number;
    plan_id: number;
    status: string;
    start_date: string;
    end_date?: string;
  }) =>
    request<{ success: boolean; data: AdminSubscription }>("/api/v1/admin/subscriptions", {
      method: "POST",
      json: data,
    }),

  updateSubscription: (id: number, data: Partial<AdminSubscription>) =>
    request<{ success: boolean; data: AdminSubscription }>(`/api/v1/admin/subscriptions/${id}`, {
      method: "PUT",
      json: data,
    }),

  deleteSubscription: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/subscriptions/${id}`, {
      method: "DELETE",
    }),

  resendReminder: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/subscriptions/${id}/resend-reminder`, {
      method: "POST",
    }),

  /* ---- Plans / packages ---- */
  listPlans: (params: { limit?: number; offset?: number; name?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.name) qs.set("name", params.name);
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminPlan[]; total: number } }>(
      `/api/v1/admin/plans${s ? `?${s}` : ""}`
    );
  },

  createPlan: (data: {
    name: string;
    price_monthly?: number;
    price_quarterly?: number | null;
    price_half_yearly?: number | null;
    price_yearly?: number | null;
    is_popular?: boolean;
    features?: Record<string, unknown>;
  }) =>
    request<{ success: boolean; data: AdminPlan }>("/api/v1/plans", {
      method: "POST",
      json: data,
    }),

  updatePlan: (id: number, data: Partial<AdminPlan>) =>
    request<{ success: boolean; data: AdminPlan }>(`/api/v1/admin/plans/${id}`, {
      method: "PUT",
      json: data,
    }),

  deletePlan: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/v1/admin/plans/${id}`, {
      method: "DELETE",
    }),

  /* ---- Stats & audit ---- */
  dashboardStats: () =>
    request<{ success: boolean; data: Record<string, unknown> }>("/api/v1/admin/stats/dashboard"),

  comprehensiveStats: () =>
    request<{ success: boolean; data: Record<string, unknown> }>("/api/v1/admin/stats/comprehensive"),

  auditLogs: (params: { limit?: number; offset?: number; search?: string; user_id?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));
    if (params.search) qs.set("q", params.search);
    if (params.user_id !== undefined) qs.set("user_id", String(params.user_id));
    const s = qs.toString();
    return request<{ success: boolean; data: { data: AdminAuditLog[]; total: number } }>(
      `/api/v1/admin/audit-logs${s ? `?${s}` : ""}`
    );
  },
};

/* ------------------------------------------------------------------ */
/*  System settings (admin)                                            */
/* ------------------------------------------------------------------ */

export const systemSettings = {
  get: () =>
    request<{ success: boolean; data: Record<string, string> }>("/api/v1/settings"),

  update: (settings: Record<string, string>) =>
    request<{ success: boolean; message: string }>("/api/v1/settings", {
      method: "PUT",
      json: { settings },
    }),
};
