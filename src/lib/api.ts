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

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export interface LoginPayload {
  email: string;
  password: string;
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
};
