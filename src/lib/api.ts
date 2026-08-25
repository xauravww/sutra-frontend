/**
 * Sutra API Client — connects to the tvs-backend-upgraded Express server.
 *
 * All endpoints live under /api/v1.  Cookies are sent automatically
 * (credentials: "include") so httpOnly JWTs work across tab sessions.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3015";

/* ------------------------------------------------------------------ */
/*  Generic fetch wrapper                                              */
/* ------------------------------------------------------------------ */

type ApiOptions = RequestInit & { json?: unknown };

async function request<T = unknown>(
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

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(res.status, body?.message ?? res.statusText, body);
  }

  return res.json();
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

    const res = await fetch(
      `${BASE}/api/v1/ai-chat/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      }
    );

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

export interface JudicialCaseDetail extends JudicialCase {
  pdf_url?: string;
  pdf_size_bytes?: number;
  parties?: unknown[];
  accused?: unknown[];
  witnesses?: unknown[];
  documents?: unknown[];
  evidence?: unknown[];
  chronology?: unknown[];
  case_brief?: unknown;
  legal_provisions?: unknown[];
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
