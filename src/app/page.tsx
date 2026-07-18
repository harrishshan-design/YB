"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Crown,
  Database,
  FileText,
  Gauge,
  Globe2,
  HeartHandshake,
  KeyRound,
  Landmark,
  LogOut,
  Megaphone,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
  X
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { api, ApiError, clearSession, getStoredToken, getStoredUser, onUnauthorized } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
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
} from "@/lib/types";
import LoginScreen from "@/components/LoginScreen";

type AnnouncementFilter = "All" | AnnouncementCategory;

const CATEGORY_META: Record<AnnouncementCategory, { label: string; tone: string }> = {
  EVENTS: { label: "Events", tone: "green" },
  URGENT: { label: "Urgent", tone: "red" },
  OPPORTUNITIES: { label: "Opportunities", tone: "blue" }
};

const CHAT_CHANNELS = [
  { id: "general", label: "General" },
  { id: "meetings", label: "Meetings" },
  { id: "decisions", label: "Decisions" }
];

const platformSurfaces = [
  { id: "public", title: "Public Website", detail: "For anyone to read news, find help, and view programmes.", icon: Globe2 },
  { id: "citizen", title: "Citizen App", detail: "For people to join events, ask for help, and get updates.", icon: Smartphone },
  { id: "ngo", title: "NGO Office", detail: "For staff to manage members, programmes, volunteers, and money.", icon: Building2 },
  { id: "government", title: "Government View", detail: "For officers to review reports, grants, and approved access.", icon: Landmark }
];

const platformModules = [
  { title: "Login and Access", detail: "Only show each person what they are allowed to see.", icon: ShieldCheck },
  { title: "NGO Records", detail: "Keep organisation details, members, and committee roles.", icon: Building2 },
  { title: "Programmes", detail: "Create events, invite people, and record attendance.", icon: CalendarDays },
  { title: "Volunteers", detail: "Track volunteer skills, hours, and service history.", icon: HeartHandshake },
  { title: "Help and Complaints", detail: "Receive cases, assign officers, and follow up clearly.", icon: ClipboardList },
  { title: "Money and Grants", detail: "Manage budgets, expenses, donations, and grant applications.", icon: WalletCards },
  { title: "Reports", detail: "Show simple numbers for impact, funds, and activity.", icon: BarChart3 }
];

const integrations = [
  { title: "PostgreSQL", detail: "Structured system records and role-based data", icon: Database },
  { title: "Secure File Storage", detail: "Minutes, receipts, case evidence, grant documents", icon: FileText },
  { title: "MyDigital ID", detail: "Citizen and officer identity verification", icon: ShieldCheck },
  { title: "Payment Gateway", detail: "Donations, grant disbursement, claims", icon: WalletCards },
  { title: "Email / WhatsApp / Telegram", detail: "Announcements, reminders, case notifications", icon: Megaphone },
  { title: "Government Open Data APIs", detail: "Public datasets, validation, reporting exchange", icon: Landmark }
];

const navItems = [
  { id: "dashboard", label: "Home", icon: Gauge },
  { id: "architecture", label: "Main Areas", icon: Building2 },
  { id: "announcements", label: "News", icon: Megaphone },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "rewards", label: "Points", icon: Trophy },
  { id: "chat", label: "Messages", icon: MessageSquareText },
  { id: "admin", label: "Manage", icon: ShieldCheck }
];

const quickActions = [
  { title: "Read latest news", detail: "See important updates from the NGO.", icon: Bell, section: "announcements" },
  { title: "Join a programme", detail: "Register for activities and events.", icon: CalendarDays, section: "meetings" },
  { title: "Ask for help", detail: "Submit a case or complaint in simple steps.", icon: HeartHandshake, section: "architecture" },
  { title: "Add a member", detail: "Invite someone and keep them under your member circle.", icon: UserPlus, section: "admin" },
  { title: "Check my points", detail: "View ranking and contribution points.", icon: Trophy, section: "rewards" },
  { title: "Send a message", detail: "Write to the board or committee.", icon: MessageSquareText, section: "chat" }
];

function toDateTimeLocalIso(value: string) {
  return new Date(value).toISOString();
}

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [members, setMembers] = useState<ApiUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<Record<string, BoardMessage[]>>({});
  const [board, setBoard] = useState<ApiUser[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [announcementFilter, setAnnouncementFilter] = useState<AnnouncementFilter>("All");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [chatChannel, setChatChannel] = useState("general");
  const [chatInput, setChatInput] = useState("");
  const [modal, setModal] = useState<"announcement" | "member" | "meeting" | "board" | "activity" | "password" | null>(null);
  const [toast, setToast] = useState("Ready");
  const [toastKind, setToastKind] = useState<"info" | "success" | "error">("info");

  const socketRef = useRef<Socket | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPrivileged = authUser?.role === "ADMIN" || authUser?.role === "BOARD";

  function showToast(message: string, kind: "info" | "success" | "error" = "info") {
    setToast(message);
    setToastKind(kind);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 5000);
  }

  useEffect(() => {
    setAuthUser(getStoredUser());
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      handleLogout("Your session expired. Please sign in again.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!modal) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const user = authUser;
    let cancelled = false;

    async function loadInitialData() {
      setDataLoading(true);
      try {
        const [summary, memberList, announcementList, meetingList, leaderboardList] = await Promise.all([
          api.dashboardSummary(),
          api.members(),
          api.announcements(),
          api.meetings(),
          api.leaderboard()
        ]);
        if (cancelled) return;

        setDashboard(summary);
        setMembers(memberList);
        setAnnouncements(announcementList);
        setMeetings(meetingList);
        setLeaderboard(leaderboardList);
        setSelectedMemberId((current) => current ?? memberList[0]?.id ?? null);

        if (user.role !== "MEMBER") {
          const approvalList = await api.approvals();
          if (!cancelled) setApprovals(approvalList);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof ApiError ? err.message : "Could not load data from the server.", "error");
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadInitialData();

    const token = getStoredToken();
    if (token) {
      const socket = connectSocket(token);
      socketRef.current = socket;
      socket.emit("join:announcements");

      socket.on("announcement:new", (announcement: Announcement) => {
        setAnnouncements((current) => [announcement, ...current.filter((item) => item.id !== announcement.id)]);
      });

      socket.on("board:message", (message: BoardMessage) => {
        setChatMessages((current) => ({
          ...current,
          [message.channel]: [...(current[message.channel] ?? []), message]
        }));
      });
    }

    return () => {
      cancelled = true;
      disconnectSocket();
      socketRef.current = null;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || authUser.role === "MEMBER") return;

    socketRef.current?.emit("join:board", chatChannel);

    if (chatMessages[chatChannel]) return;

    let cancelled = false;
    api.messages(chatChannel)
      .then((history) => {
        if (!cancelled) setChatMessages((current) => ({ ...current, [chatChannel]: history }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, chatChannel]);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? members[0] ?? null,
    [members, selectedMemberId]
  );

  const filteredAnnouncements = announcementFilter === "All"
    ? announcements
    : announcements.filter((item) => item.category === announcementFilter);

  const directMembers = selectedMember
    ? members.filter((member) => member.invitedById === selectedMember.id)
    : [];

  const recentAnnouncements = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return announcements.filter((item) => new Date(item.createdAt).getTime() >= cutoff).length;
  }, [announcements]);

  const stats = dashboard
    ? [
        { label: "Active members", value: String(dashboard.members), icon: Users },
        { label: "Board members", value: String(dashboard.board), icon: Crown },
        { label: "Pending approvals", value: String(dashboard.pendingApprovals), icon: CheckCircle2 },
        { label: "Announcements this week", value: String(recentAnnouncements), icon: Gauge }
      ]
    : [];

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleLogout(message = "Ready") {
    disconnectSocket();
    clearSession();
    setAuthUser(null);
    setDashboard(null);
    setMembers([]);
    setAnnouncements([]);
    setMeetings([]);
    setApprovals([]);
    setLeaderboard([]);
    setChatMessages({});
    setBoard([]);
    setActivityFeed([]);
    setSelectedMemberId(null);
    setModal(null);
    showToast(message);
  }

  async function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const publishNow = form.get("publishNow") === "on";

    try {
      await api.createAnnouncement({
        title: String(form.get("title")),
        content: String(form.get("content")),
        category: String(form.get("category")) as AnnouncementCategory,
        publishNow
      });
      setModal(null);
      showToast(publishNow ? "Announcement published" : "Announcement queued for board approval", "success");
      event.currentTarget.reset();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not create the announcement.", "error");
    }
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const member = await api.addMember({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: isPrivileged ? (String(form.get("role")) as Role) : undefined,
        invitedById: isPrivileged ? String(form.get("parentId")) : undefined
      });
      setMembers((current) => [...current, member]);
      setSelectedMemberId(member.invitedById ?? member.id);
      setModal(null);
      showToast(`${member.name} added to the member circle`, "success");
      event.currentTarget.reset();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not add the member.", "error");
    }
  }

  async function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const location = String(form.get("location") ?? "").trim();
    const meetUrl = String(form.get("meetUrl") ?? "").trim();

    try {
      const meeting = await api.createMeeting({
        title: String(form.get("title")),
        agenda: String(form.get("agenda")),
        startsAt: toDateTimeLocalIso(String(form.get("startsAt"))),
        endsAt: toDateTimeLocalIso(String(form.get("endsAt"))),
        location: location || undefined,
        meetUrl: meetUrl || undefined
      });
      setMeetings((current) => [...current, meeting].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setModal(null);
      showToast("Meeting scheduled", "success");
      event.currentTarget.reset();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not schedule the meeting.", "error");
    }
  }

  async function updateApproval(id: string, status: "APPROVED" | "REJECTED") {
    try {
      await api.updateApproval(id, { status });
      setApprovals((current) => current.filter((approval) => approval.id !== id));
      const summary = await api.dashboardSummary().catch(() => null);
      if (summary) setDashboard(summary);
      showToast(`Approval ${status.toLowerCase()}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update the approval.", "error");
    }
  }

  function sendMessage() {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("board:message", { channel: chatChannel, message: chatInput.trim() });
    setChatInput("");
  }

  async function openBoardPanel() {
    setModal("board");
    if (board.length > 0) return;
    setPanelLoading(true);
    try {
      setBoard(await api.board());
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not load board members.", "error");
    } finally {
      setPanelLoading(false);
    }
  }

  async function openActivityPanel() {
    setModal("activity");
    setPanelLoading(true);
    try {
      setActivityFeed(await api.activity());
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not load activity.", "error");
    } finally {
      setPanelLoading(false);
    }
  }

  async function toggleMemberActive(member: ApiUser) {
    try {
      const updated = await api.updateMember(member.id, { isActive: !member.isActive });
      setBoard((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      showToast(`${updated.name} ${updated.isActive ? "reactivated" : "deactivated"}`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update the member.", "error");
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }

    try {
      await api.changePassword({ currentPassword: String(form.get("currentPassword")), newPassword });
      setModal(null);
      showToast("Password updated", "success");
      event.currentTarget.reset();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update your password.", "error");
    }
  }

  function describeActivity(entry: ActivityEntry) {
    const meta = entry.metadata ?? {};
    switch (entry.action) {
      case "member_added_to_circle":
        return `${entry.user.name} added ${String(meta.memberName ?? "a member")} to their circle`;
      case "points_awarded":
        return `${entry.user.name} awarded ${String(meta.points ?? "")} points (${String(meta.reason ?? "")})`;
      case "member_updated":
        return `${entry.user.name} updated ${String(meta.memberName ?? "a member")}`;
      default:
        return `${entry.user.name} — ${entry.action}`;
    }
  }

  if (!authChecked) {
    return <main className="login-shell"><p className="brand-subtitle">Loading...</p></main>;
  }

  if (!authUser) {
    return <LoginScreen onLogin={setAuthUser} />;
  }

  const channelMessages = chatMessages[chatChannel] ?? [];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => scrollToSection("dashboard")} aria-label="Open dashboard">
          <div className="brand-mark">YC</div>
          <div>
            <h2 className="brand-title">NGO Help System</h2>
            <p className="brand-subtitle">Simple public and NGO service app</p>
          </div>
        </button>

        <nav className="nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeSection === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => scrollToSection(item.id)}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>

        <button className="sidebar-panel panel-button" onClick={() => setModal("member")}>
          <p className="eyebrow">Simple mode</p>
          <h3>Big buttons, clear steps</h3>
          <p className="brand-subtitle">Designed so members, citizens, staff, and elderly users can use it without training.</p>
        </button>

        <div className="sidebar-user">
          <div>
            <strong>{authUser.name}</strong>
            <span className="meta">{authUser.role}</span>
          </div>
          <div className="inline-actions">
            <button className="icon-button" onClick={() => setModal("password")} aria-label="Change password"><KeyRound size={16} /></button>
            <button className="icon-button" onClick={() => handleLogout()} aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <section className="main">
        <div className="topbar" id="dashboard">
          <div>
            <p className="eyebrow">Simple home</p>
            <h1>What do you want to do today?</h1>
            <p className="lead">
              Large buttons, plain words, and step-by-step actions for citizens, elderly members, NGO staff, board members, and government officers.
            </p>
          </div>
          <div className="actions">
            <button className="button primary" onClick={() => scrollToSection("announcements")}><Bell size={18} /> Read news</button>
            <button className="button" onClick={() => setModal("member")}><UserPlus size={18} /> Add member</button>
          </div>
        </div>

        {toast && <div className={`toast ${toastKind}`} role="status">{toast}</div>}

        <section className="quick-grid" aria-label="Common actions">
          {quickActions.map((action) => (
            <button className="quick-action" key={action.title} onClick={() => scrollToSection(action.section)}>
              <action.icon size={30} />
              <span>{action.title}</span>
              <small>{action.detail}</small>
            </button>
          ))}
        </section>

        <section className="stats-grid" aria-label="System metrics">
          {dataLoading && !dashboard ? (
            <p className="meta">Loading system metrics...</p>
          ) : (
            stats.map((stat) => (
              <button className="card metric clickable" key={stat.label} onClick={() => showToast(`${stat.label}: ${stat.value}`)}>
                <stat.icon size={22} color="#236c4a" />
                <div className="metric-value">{stat.value}</div>
                <div className="metric-label">{stat.label}</div>
              </button>
            ))
          )}
        </section>

        <section className="dashboard-grid" id="architecture">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Who Will Use This</h2>
              <span className="badge blue">Simple access</span>
            </div>
            <div className="card-body list">
              {platformSurfaces.map((surface) => (
                <button className="row row-button" key={surface.title} onClick={() => showToast(`${surface.title} opened`)}>
                  <div>
                    <strong><surface.icon size={16} /> {surface.title}</strong>
                    <span className="meta">{surface.detail}</span>
                  </div>
                  <span className="badge green">Portal</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Main Work Areas</h2>
              <button className="badge green badge-button" onClick={() => showToast("Main work areas selected")}>Plain workflow</button>
            </div>
            <div className="card-body list">
              {platformModules.map((module) => (
                <button className="row row-button" key={module.title} onClick={() => showToast(`${module.title} selected`)}>
                  <div>
                    <strong><module.icon size={16} /> {module.title}</strong>
                    <span className="meta">{module.detail}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="three-grid">
          {integrations.map((integration) => (
            <button className="card metric clickable" key={integration.title} onClick={() => showToast(`${integration.title} integration selected`)}>
              <integration.icon size={22} color="#236c4a" />
              <div className="metric-value small-metric">{integration.title}</div>
              <div className="metric-label">{integration.detail}</div>
            </button>
          ))}
        </section>

        <section className="dashboard-grid" id="announcements">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">News and Announcements</h2>
              {isPrivileged ? (
                <button className="badge green badge-button" onClick={() => setModal("announcement")}><Bell size={12} /> New announcement</button>
              ) : (
                <span className="badge green">Read only</span>
              )}
            </div>
            <div className="card-body list">
              <div className="tabs">
                {(["All", "EVENTS", "URGENT", "OPPORTUNITIES"] as AnnouncementFilter[]).map((filter) => (
                  <button
                    className={`tab ${announcementFilter === filter ? "active" : ""}`}
                    key={filter}
                    onClick={() => setAnnouncementFilter(filter)}
                  >
                    {filter === "All" ? "All" : CATEGORY_META[filter].label}
                  </button>
                ))}
              </div>
              {filteredAnnouncements.length === 0 && <p className="meta">No announcements yet.</p>}
              {filteredAnnouncements.map((item) => (
                <button className="row row-button" key={item.id} onClick={() => showToast(`${item.title} opened`)}>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="meta">{item.content}</span>
                  </div>
                  <span className={`badge ${CATEGORY_META[item.category].tone}`}>{CATEGORY_META[item.category].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" id="rewards">
            <div className="card-header">
              <h2 className="card-title">Member Points</h2>
              <span className="badge gold">This month</span>
            </div>
            <div className="card-body">
              {leaderboard.length === 0 && <p className="meta">No points awarded yet.</p>}
              {leaderboard.map((entry) => (
                entry.user && (
                  <button
                    className="leader-row leader-button"
                    key={entry.user.id}
                    onClick={() => setSelectedMemberId(entry.user!.id)}
                  >
                    <span className="rank">{entry.rank}</span>
                    <strong>{entry.user.name}</strong>
                    <span className="meta">{entry.points} pts</span>
                  </button>
                )
              ))}
            </div>
          </div>
        </section>

        <section className="three-grid">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Things To Approve</h2>
              <CheckCircle2 size={20} color="#236c4a" />
            </div>
            <div className="card-body list">
              {!isPrivileged && <p className="meta">Only admins and board members can review approvals.</p>}
              {isPrivileged && approvals.length === 0 && <p className="meta">Nothing waiting for approval.</p>}
              {isPrivileged && approvals.map((approval) => (
                <div className="row" key={approval.id}>
                  <button className="plain-row" onClick={() => showToast(`${approval.type} selected`)}>
                    <strong>{approval.type === "announcement" ? "Announcement" : approval.type}</strong>
                    <span className="meta">Submitted {new Date(approval.createdAt).toLocaleDateString()}</span>
                  </button>
                  <div className="inline-actions">
                    <span className="badge blue">Pending</span>
                    <button className="icon-button" onClick={() => updateApproval(approval.id, "APPROVED")} aria-label="Approve"><Check size={16} /></button>
                    <button className="icon-button" onClick={() => updateApproval(approval.id, "REJECTED")} aria-label="Reject"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" id="meetings">
            <div className="card-header">
              <h2 className="card-title">Meetings</h2>
              {isPrivileged && (
                <button className="icon-button" onClick={() => setModal("meeting")} aria-label="Create meeting"><Plus size={16} /></button>
              )}
            </div>
            <div className="card-body list">
              {meetings.length === 0 && <p className="meta">No meetings scheduled.</p>}
              {meetings.map((meeting) => (
                <button className="row row-button" key={meeting.id} onClick={() => showToast(`${meeting.title} attendance opened`)}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <span className="meta">{meeting.agenda}</span>
                  </div>
                  <span className="badge green">{new Date(meeting.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" id="chat">
            <div className="card-header">
              <h2 className="card-title">Messages</h2>
              <MessageSquareText size={20} color="#236c4a" />
            </div>
            <div className="card-body">
              {!isPrivileged ? (
                <p className="meta">Board chat is only visible to admins and board members.</p>
              ) : (
                <>
                  <div className="tabs compact-tabs">
                    {CHAT_CHANNELS.map((channel) => (
                      <button className={`tab ${chatChannel === channel.id ? "active" : ""}`} key={channel.id} onClick={() => setChatChannel(channel.id)}>
                        {channel.label}
                      </button>
                    ))}
                  </div>
                  <div className="chat-preview">
                    {channelMessages.length === 0 && <p className="meta">No messages yet.</p>}
                    {channelMessages.map((message) => (
                      <div className={`message ${message.senderId === authUser.id ? "mine" : ""}`} key={message.id}>
                        <strong>{message.sender.name}</strong>
                        <div className="meta">{message.message}</div>
                      </div>
                    ))}
                  </div>
                  <div className="composer">
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                      placeholder={`Message ${CHAT_CHANNELS.find((c) => c.id === chatChannel)?.label ?? chatChannel}`}
                    />
                    <button className="icon-button solid" onClick={sendMessage} aria-label="Send message"><Send size={16} /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-grid" id="admin">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Member Circle</h2>
              <button className="button" onClick={() => setModal("member")}><UserPlus size={18} /> Add under selected</button>
            </div>
            <div className="card-body hierarchy">
              {members.length === 0 && <p className="meta">No members yet.</p>}
              {selectedMember && (
                <>
                  <div className="member-selector">
                    {members.slice(0, 6).map((member) => (
                      <button className={`chip ${selectedMember.id === member.id ? "active" : ""}`} key={member.id} onClick={() => setSelectedMemberId(member.id)}>
                        {member.name}
                      </button>
                    ))}
                  </div>
                  <div className="tree">
                    <div className="tree-node root-node">
                      <Crown size={18} />
                      <div>
                        <strong>{selectedMember.name}</strong>
                        <span className="meta">Selected member</span>
                      </div>
                    </div>
                    <div className="tree-children">
                      {directMembers.length > 0 ? directMembers.map((member) => (
                        <button className="tree-node" key={member.id} onClick={() => setSelectedMemberId(member.id)}>
                          <Users size={16} />
                          <div>
                            <strong>{member.name}</strong>
                            <span className="meta">{members.filter((child) => child.invitedById === member.id).length} connected</span>
                          </div>
                        </button>
                      )) : (
                        <button className="tree-node empty-node" onClick={() => setModal("member")}>
                          <UserPlus size={16} />
                          <div>
                            <strong>Add first connected member</strong>
                            <span className="meta">They will sit under {selectedMember.name}</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Manage System</h2>
              <ShieldCheck size={20} color="#236c4a" />
            </div>
            <div className="card-body list">
              <button className="row row-button" onClick={openBoardPanel}>
                <div><strong>Board members</strong><span className="meta">View the board and manage seats</span></div>
                <span className="badge green">Admin</span>
              </button>
              <button className="row row-button" onClick={openActivityPanel}>
                <div><strong>Activity monitor</strong><span className="meta">Track announcements, rewards, meetings, and member additions</span></div>
                <span className="badge blue">Live</span>
              </button>
            </div>
          </div>
        </section>
      </section>

      {modal === "announcement" && isPrivileged && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <form className="modal" onSubmit={handleAnnouncementSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>New Announcement</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close announcement form"><X size={16} /></button>
            </div>
            <label>Title<input name="title" required minLength={3} placeholder="Announcement title" /></label>
            <label>Category
              <select name="category" defaultValue="EVENTS">
                <option value="EVENTS">Events</option>
                <option value="URGENT">Urgent</option>
                <option value="OPPORTUNITIES">Opportunities</option>
              </select>
            </label>
            <label>Content<textarea name="content" required minLength={10} placeholder="Write the update" /></label>
            <label className="checkbox-label">
              <input name="publishNow" type="checkbox" />
              Publish immediately (skip board approval)
            </label>
            <button className="button primary" type="submit"><Megaphone size={18} /> Submit</button>
          </form>
        </div>
      )}

      {modal === "member" && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <form className="modal" onSubmit={handleMemberSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close member form"><X size={16} /></button>
            </div>
            <label>Name<input name="name" required placeholder="Member name" /></label>
            <label>Email<input name="email" required type="email" placeholder="member@email.com" /></label>
            <label>Password<input name="password" required type="password" minLength={8} placeholder="At least 8 characters" /></label>
            {isPrivileged && (
              <>
                <label>Role
                  <select name="role" defaultValue="MEMBER">
                    <option value="MEMBER">Member</option>
                    <option value="BOARD">Board</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <label>Place under
                  <select name="parentId" defaultValue={selectedMember?.id}>
                    {members.map((member) => (
                      <option value={member.id} key={member.id}>{member.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button className="button primary" type="submit"><UserPlus size={18} /> Add member</button>
          </form>
        </div>
      )}

      {modal === "meeting" && isPrivileged && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <form className="modal" onSubmit={handleMeetingSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Meeting</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close meeting form"><X size={16} /></button>
            </div>
            <label>Title<input name="title" required minLength={3} placeholder="Meeting title" /></label>
            <label>Agenda<textarea name="agenda" required minLength={5} placeholder="What will be discussed" /></label>
            <label>Starts<input name="startsAt" required type="datetime-local" /></label>
            <label>Ends<input name="endsAt" required type="datetime-local" /></label>
            <label>Location (optional)<input name="location" placeholder="Club office" /></label>
            <label>Meeting link (optional)<input name="meetUrl" type="url" placeholder="https://" /></label>
            <button className="button primary" type="submit"><CalendarDays size={18} /> Schedule</button>
          </form>
        </div>
      )}

      {modal === "board" && isPrivileged && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Board members" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Board Members</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close board members"><X size={16} /></button>
            </div>
            <div className="card-body list panel-scroll">
              {panelLoading && <p className="meta">Loading...</p>}
              {!panelLoading && board.length === 0 && <p className="meta">No board members yet.</p>}
              {!panelLoading && board.map((member) => (
                <div className="row" key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <span className="meta">{member.email}</span>
                  </div>
                  <div className="inline-actions">
                    <span className={`badge ${member.isActive ? "green" : "red"}`}>{member.isActive ? "Active" : "Inactive"}</span>
                    {authUser.role === "ADMIN" && member.id !== authUser.id && (
                      <button className="button" type="button" onClick={() => toggleMemberActive(member)}>
                        {member.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === "activity" && isPrivileged && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Activity monitor" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2><ActivityIcon size={18} /> Activity Monitor</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close activity monitor"><X size={16} /></button>
            </div>
            <div className="card-body list panel-scroll">
              {panelLoading && <p className="meta">Loading...</p>}
              {!panelLoading && activityFeed.length === 0 && <p className="meta">No activity yet.</p>}
              {!panelLoading && activityFeed.map((entry) => (
                <div className="row" key={entry.id}>
                  <div>
                    <strong>{describeActivity(entry)}</strong>
                    <span className="meta">{new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === "password" && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <form className="modal" onSubmit={handlePasswordSubmit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2><KeyRound size={18} /> Change Password</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close change password form"><X size={16} /></button>
            </div>
            <label>Current password<input name="currentPassword" required type="password" autoComplete="current-password" /></label>
            <label>New password<input name="newPassword" required type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></label>
            <label>Confirm new password<input name="confirmPassword" required type="password" minLength={8} autoComplete="new-password" /></label>
            <button className="button primary" type="submit"><KeyRound size={18} /> Update password</button>
          </form>
        </div>
      )}
    </main>
  );
}
