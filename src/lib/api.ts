import type {
  ActivityEntry,
  Announcement,
  AnnouncementCategory,
  ApiUser,
  Approval,
  AuthUser,
  BoardMessage,
  DashboardSummary,
  LeaderboardEntry,
  Meeting,
  Role
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "ngo_token";
const USER_KEY = "ngo_user";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "/auth/login") {
      unauthorizedHandler?.();
    }
    throw new ApiError(typeof body.message === "string" ? body.message : `Request failed (${response.status})`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  dashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),

  members: () => request<ApiUser[]>("/members"),

  addMember: (data: { name: string; email: string; password: string; role?: Role; invitedById?: string }) =>
    request<ApiUser>("/members", { method: "POST", body: JSON.stringify(data) }),

  announcements: () => request<Announcement[]>("/announcements"),

  createAnnouncement: (data: { title: string; content: string; category: AnnouncementCategory; publishNow?: boolean }) =>
    request<Announcement>("/announcements", { method: "POST", body: JSON.stringify(data) }),

  meetings: () => request<Meeting[]>("/meetings"),

  createMeeting: (data: {
    title: string;
    agenda: string;
    startsAt: string;
    endsAt: string;
    location?: string;
    meetUrl?: string;
  }) => request<Meeting>("/meetings", { method: "POST", body: JSON.stringify(data) }),

  approvals: () => request<Approval[]>("/approvals"),

  updateApproval: (id: string, data: { status: "APPROVED" | "REJECTED"; note?: string }) =>
    request<Approval>(`/approvals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  leaderboard: () => request<LeaderboardEntry[]>("/rewards/leaderboard"),

  messages: (channel: string) => request<BoardMessage[]>(`/messages?channel=${encodeURIComponent(channel)}`),

  board: () => request<ApiUser[]>("/board"),

  updateMember: (id: string, data: { role?: Role; isActive?: boolean }) =>
    request<ApiUser>(`/members/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  activity: () => request<ActivityEntry[]>("/activity"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/auth/password", { method: "PATCH", body: JSON.stringify(data) })
};
