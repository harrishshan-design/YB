"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartHandshake,
  Home,
  Lock,
  LogOut,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = "MEMBER" | "PRESIDENT" | "ADMIN" | "MASTER";
type View = "home" | "news" | "programmes" | "help" | "members" | "meetings" | "money" | "reports" | "admin";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  points: number;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: "EVENTS" | "URGENT" | "OPPORTUNITIES";
};

type Programme = {
  id: string;
  title: string;
  description: string;
  status: string;
};

type CaseItem = {
  id: string;
  title: string;
  status: string;
  assignedTo: { name: string } | null;
};

type Member = {
  id: string;
  name: string;
  points: number;
  invitedBy: { name: string } | null;
};

type Meeting = {
  id: string;
  title: string;
  startsAt: string;
};

type Approval = {
  id: string;
  type: string;
  announcement: { title: string } | null;
  event: { title: string } | null;
};

type DashboardSummary = {
  members: number;
  pendingApprovals: number;
  openCases: number;
  openProgrammes: number;
  volunteerHours: number;
  money: { approvedBudget: number; expensesPending: number; grantApplications: number };
};

const roles: Role[] = ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"];

const roleLabels: Record<Role, string> = {
  MEMBER: "Member",
  PRESIDENT: "President",
  ADMIN: "Admin",
  MASTER: "Master"
};

const demoAccounts: Array<{ email: string; role: Role }> = [
  { email: "member@demo.com", role: "MEMBER" },
  { email: "president@demo.com", role: "PRESIDENT" },
  { email: "admin@demo.com", role: "ADMIN" },
  { email: "master@demo.com", role: "MASTER" }
];

const allViews: Array<{ id: View; label: string; icon: React.ElementType; roles: Role[] }> = [
  { id: "home", label: "Home", icon: Home, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "news", label: "News", icon: Bell, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "programmes", label: "Programmes", icon: CalendarDays, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "help", label: "Ask For Help", icon: HeartHandshake, roles: ["MEMBER", "ADMIN", "MASTER"] },
  { id: "members", label: "Members", icon: Users, roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
  { id: "meetings", label: "Meetings", icon: MessageSquareText, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "money", label: "Money", icon: WalletCards, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "reports", label: "Reports", icon: FileText, roles: ["PRESIDENT", "ADMIN", "MASTER"] },
  { id: "admin", label: "Settings", icon: ShieldCheck, roles: ["ADMIN", "MASTER"] }
];

function canManage(role: Role) {
  return role === "PRESIDENT" || role === "ADMIN" || role === "MASTER";
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>("home");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [selectedRole, setSelectedRole] = useState<Role>("MEMBER");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [notice, setNotice] = useState("Welcome. Choose a task to begin.");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const allowedViews = useMemo(() => {
    if (!currentUser) return [];
    return allViews.filter((view) => view.roles.includes(currentUser.role));
  }, [currentUser]);

  const loadProfile = useCallback(async () => {
    try {
      const { user } = await apiFetch<{ user: AppUser }>("/api/me");
      setCurrentUser(user);
      setActiveView("home");
      return user;
    } catch {
      try {
        const { user } = await apiFetch<{ user: AppUser }>("/api/auth/profile");
        setCurrentUser(user);
        setActiveView("home");
        return user;
      } catch {
        setCurrentUser(null);
        return null;
      }
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      if (data.session) {
        await loadProfile();
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        loadProfile();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (!currentUser) return;
    apiFetch<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    if (activeView === "news") {
      apiFetch<Announcement[]>("/api/announcements").then(setAnnouncements).catch(() => {});
    }
    if (activeView === "programmes") {
      apiFetch<Programme[]>("/api/programmes").then(setProgrammes).catch(() => {});
    }
    if (activeView === "help") {
      apiFetch<CaseItem[]>("/api/cases").then(setCases).catch(() => {});
    }
    if (activeView === "members") {
      apiFetch<Member[]>("/api/members").then(setMembers).catch(() => {});
    }
    if (activeView === "meetings") {
      apiFetch<Meeting[]>("/api/meetings").then(setMeetings).catch(() => {});
    }
    if (activeView === "admin" && (currentUser.role === "ADMIN" || currentUser.role === "MASTER")) {
      apiFetch<Approval[]>("/api/approvals").then(setApprovals).catch(() => {});
    }
  }, [activeView, currentUser]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoginError("Wrong email or password.");
      setLoginSubmitting(false);
      return;
    }

    await loadProfile();
    setActiveView("home");
    setNotice("Logged in.");
    setLoginSubmitting(false);
  }

  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password !== confirmPassword) {
      setLoginError("Passwords do not match.");
      setLoginSubmitting(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: selectedRole } }
    });

    if (error) {
      setLoginError(error.message);
      setLoginSubmitting(false);
      return;
    }

    if (!data.session) {
      setAuthMode("login");
      setLoginError("");
      setNotice("Account created. Please check your email, confirm it, then login. Do not press sign up again.");
      setLoginSubmitting(false);
      return;
    }

    try {
      const { user } = await apiFetch<{ user: AppUser }>("/api/auth/profile", {
        method: "POST",
        body: JSON.stringify({ name, role: selectedRole })
      });
      setCurrentUser(user);
      setActiveView("home");
      setNotice(`Signed up as ${roleLabels[user.role]}.`);
    } catch (error) {
      setLoginError(error instanceof ApiClientError ? error.message : "Signup worked, but profile setup needs email confirmation first.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveView("home");
    setNotice("Logged out safely.");
  }

  async function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const description = String(form.get("details") ?? "").trim();
    if (!title) return;

    try {
      const created = await apiFetch<CaseItem>("/api/cases", {
        method: "POST",
        body: JSON.stringify({ title, description })
      });
      setCases((current) => [created, ...current]);
      setNotice("Your help request was submitted.");
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not submit your request.");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const invitedById = String(form.get("invitedById") ?? "") || undefined;
    if (!name || !email) return;

    try {
      const created = await apiFetch<Member>("/api/members", {
        method: "POST",
        body: JSON.stringify({ name, email, invitedById })
      });
      setMembers((current) => [created, ...current]);
      setNotice(`${created.name} was added.`);
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not add that member.");
    }
  }

  async function sendAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const content = String(form.get("content")).trim();
    const category = String(form.get("category") ?? "EVENTS") as Announcement["category"];
    if (!title || !content) return;

    try {
      const created = await apiFetch<Announcement>("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ title, content, category, publishNow: true })
      });
      setAnnouncements((current) => [created, ...current]);
      setNotice("Announcement sent.");
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not send that announcement.");
    }
  }

  async function decideApproval(id: string, status: "APPROVED" | "REJECTED") {
    try {
      await apiFetch(`/api/approvals/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setApprovals((current) => current.filter((item) => item.id !== id));
      setNotice(status === "APPROVED" ? "Approved." : "Rejected.");
    } catch (error) {
      setNotice(error instanceof ApiClientError ? error.message : "Could not update that approval.");
    }
  }

  if (authLoading) {
    return (
      <main className="login-page">
        <p className="lead">Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="login-page">
        <section className="login-hero">
          <div>
            <p className="eyebrow">ybngo.my</p>
            <h1>{authMode === "login" ? "Login to continue." : "Create your account."}</h1>
            <p className="lead">Choose your side once, then the system opens the correct dashboard automatically.</p>
          </div>

          <div className="login-card">
            <div className="auth-tabs" role="tablist" aria-label="Account">
              <button className={authMode === "login" ? "active" : ""} type="button" onClick={() => setAuthMode("login")}>
                <Lock size={18} /> Login
              </button>
              <button className={authMode === "signup" ? "active" : ""} type="button" onClick={() => setAuthMode("signup")}>
                <UserCheck size={18} /> Sign up
              </button>
            </div>

            {authMode === "login" ? (
              <form className="stack-form" onSubmit={login}>
                <div className="login-icon"><Lock size={28} /></div>
                <h2>Sign in</h2>
                <label>Email<input name="email" type="email" placeholder="member@demo.com" required /></label>
                <label>Password<input name="password" type="password" required /></label>
                {loginError && <p className="error-text">{loginError}</p>}
                <button className="button primary" type="submit" disabled={loginSubmitting}>
                  {loginSubmitting ? "Signing in..." : "Login"}
                </button>
              </form>
            ) : (
              <form className="stack-form" onSubmit={signup}>
                <div className="login-icon"><UserCheck size={28} /></div>
                <h2>Sign up</h2>
                <label>Full name<input name="name" placeholder="Your full name" required /></label>
                <label>Email<input name="email" type="email" placeholder="you@example.com" required /></label>
                <RolePicker selectedRole={selectedRole} setSelectedRole={setSelectedRole} />
                <label>Password<input name="password" type="password" minLength={6} required /></label>
                <label>Confirm password<input name="confirmPassword" type="password" minLength={6} required /></label>
                {loginError && <p className="error-text">{loginError}</p>}
                <button className="button primary" type="submit" disabled={loginSubmitting}>
                  {loginSubmitting ? "Creating..." : `Create ${roleLabels[selectedRole]} dashboard`}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="demo-grid" aria-label="Demo accounts">
          {demoAccounts.map((account) => (
            <div className="demo-card" key={account.email}>
              <strong>{roleLabels[account.role]}</strong>
              <span>{account.email}</span>
              <small>Password set up in Supabase Auth by the project admin.</small>
            </div>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => setActiveView("home")} aria-label="Open home">
          <div className="brand-mark">YB</div>
          <div>
            <h2 className="brand-title">YB NGO</h2>
            <p className="brand-subtitle">ybngo.my</p>
          </div>
        </button>

        <div className="user-panel">
          <strong>{currentUser.name}</strong>
          <span>{roleLabels[currentUser.role]}</span>
        </div>

        <nav className="nav" aria-label="Primary">
          {allowedViews.map((view) => (
            <button className={`nav-item ${activeView === view.id ? "active" : ""}`} key={view.id} onClick={() => setActiveView(view.id)}>
              <view.icon size={20} /> {view.label}
            </button>
          ))}
        </nav>

        <button className="sidebar-panel panel-button" onClick={logout}>
          <p className="eyebrow">Account</p>
          <h3><LogOut size={18} /> Logout</h3>
          <p className="brand-subtitle">End this session safely.</p>
        </button>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <p className="eyebrow">{roleLabels[currentUser.role]} dashboard</p>
            <h1>{getViewTitle(activeView)}</h1>
            <p className="lead">{getViewDescription(activeView, currentUser.role)}</p>
          </div>
        </div>

        <div className="toast" role="status">{notice}</div>

        {activeView === "home" && <HomeView role={currentUser.role} summary={summary} setActiveView={setActiveView} />}
        {activeView === "news" && (
          <NewsView announcements={announcements} canPost={canManage(currentUser.role)} sendAnnouncement={sendAnnouncement} />
        )}
        {activeView === "programmes" && <ProgrammesView programmes={programmes} />}
        {activeView === "help" && <HelpView cases={cases} submitCase={submitCase} />}
        {activeView === "members" && (
          <MembersView members={members} canPlaceAnywhere={canManage(currentUser.role)} addMember={addMember} />
        )}
        {activeView === "meetings" && <MeetingsView meetings={meetings} />}
        {activeView === "money" && <MoneyView summary={summary} />}
        {activeView === "reports" && <ReportsView summary={summary} />}
        {activeView === "admin" && <AdminView role={currentUser.role} approvals={approvals} decideApproval={decideApproval} />}
      </section>
    </main>
  );
}

function RolePicker({
  selectedRole,
  setSelectedRole
}: {
  selectedRole: Role;
  setSelectedRole: (role: Role) => void;
}) {
  return (
    <fieldset className="role-picker">
      <legend>Choose your side</legend>
      <div className="role-grid">
        {roles.map((role) => (
          <button
            className={`role-choice ${selectedRole === role ? "active" : ""}`}
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            aria-pressed={selectedRole === role}
          >
            <strong>{roleLabels[role]}</strong>
            <span>{getSideTitle(role)}</span>
          </button>
        ))}
      </div>
      <input name="role" type="hidden" value={selectedRole} />
    </fieldset>
  );
}

function HomeView({
  role,
  summary,
  setActiveView
}: {
  role: Role;
  summary: DashboardSummary | null;
  setActiveView: (view: View) => void;
}) {
  const actions: Array<{ title: string; detail: string; icon: React.ElementType; view: View; roles: Role[] }> = [
    { title: "Read news", detail: "Latest announcements and urgent notices.", icon: Bell, view: "news", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Join programme", detail: "Register for events and volunteer work.", icon: CalendarDays, view: "programmes", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Ask for help", detail: "Submit a case or complaint.", icon: HeartHandshake, view: "help", roles: ["MEMBER", "ADMIN", "MASTER"] },
    { title: "Add member", detail: "Invite a member into your circle.", icon: UserPlus, view: "members", roles: ["MEMBER", "PRESIDENT", "ADMIN", "MASTER"] },
    { title: "Review money", detail: "Budgets, grants, expenses, donations.", icon: WalletCards, view: "money", roles: ["PRESIDENT", "ADMIN", "MASTER"] },
    { title: "View reports", detail: "Impact, activity, and government reports.", icon: FileText, view: "reports", roles: ["PRESIDENT", "ADMIN", "MASTER"] }
  ];

  return (
    <>
      <section className="side-summary">
        <div>
          <p className="eyebrow">{roleLabels[role]} side</p>
          <h2>{getSideTitle(role)}</h2>
          <p>{getSideDescription(role)}</p>
        </div>
      </section>
      <section className="quick-grid">
        {actions
          .filter((action) => action.roles.includes(role))
          .map((action) => (
            <button className="quick-action" key={action.title} onClick={() => setActiveView(action.view)}>
              <action.icon size={30} />
              <span>{action.title}</span>
              <small>{action.detail}</small>
            </button>
          ))}
      </section>
      <section className="stats-grid">
        <Metric icon={Users} value={String(summary?.members ?? "-")} label="Active members" />
        <Metric icon={CalendarDays} value={String(summary?.openProgrammes ?? "-")} label="Open programmes" />
        <Metric icon={ClipboardList} value={String(summary?.openCases ?? "-")} label="Open help cases" />
        <Metric icon={CheckCircle2} value={String(summary?.pendingApprovals ?? "-")} label="Waiting approval" />
      </section>
    </>
  );
}

function getSideTitle(role: Role) {
  const titles: Record<Role, string> = {
    MEMBER: "Simple member area",
    PRESIDENT: "President control area",
    ADMIN: "Operations admin area",
    MASTER: "Master system area"
  };
  return titles[role];
}

function getSideDescription(role: Role) {
  const descriptions: Record<Role, string> = {
    MEMBER: "Members can read news, join programmes, ask for help, add members under their circle, and check points.",
    PRESIDENT: "The president can manage members, meetings, approvals, reports, money reviews, and committee work.",
    ADMIN: "Admins can run daily operations: members, programmes, help cases, finance, announcements, and settings.",
    MASTER: "The master account can see and control every organisation, user role, setting, report, and access rule."
  };
  return descriptions[role];
}

function NewsView({
  announcements,
  canPost,
  sendAnnouncement
}: {
  announcements: Announcement[];
  canPost: boolean;
  sendAnnouncement: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const badgeClass: Record<Announcement["category"], string> = { EVENTS: "blue", URGENT: "red", OPPORTUNITIES: "gold" };
  const categoryLabel: Record<Announcement["category"], string> = { EVENTS: "Event", URGENT: "Urgent", OPPORTUNITIES: "Opportunity" };

  return (
    <section className="dashboard-grid">
      <Panel title="Latest News">
        {announcements.length === 0 && <p className="meta">No announcements yet.</p>}
        {announcements.map((item) => (
          <div className="row" key={item.id}>
            <div><strong>{item.title}</strong><span className="meta">{item.content}</span></div>
            <span className={`badge ${badgeClass[item.category]}`}>{categoryLabel[item.category]}</span>
          </div>
        ))}
      </Panel>
      {canPost && (
        <Panel title="Send Announcement">
          <form className="stack-form" onSubmit={sendAnnouncement}>
            <label>Title<input name="title" placeholder="Short title" required /></label>
            <label>Message<textarea name="content" placeholder="Write simple announcement" required /></label>
            <label>
              Category
              <select name="category" defaultValue="EVENTS">
                <option value="EVENTS">Event</option>
                <option value="URGENT">Urgent</option>
                <option value="OPPORTUNITIES">Opportunity</option>
              </select>
            </label>
            <button className="button primary" type="submit"><Plus size={18} /> Send to all</button>
          </form>
        </Panel>
      )}
    </section>
  );
}

function ProgrammesView({ programmes }: { programmes: Programme[] }) {
  return (
    <section className="three-grid">
      {programmes.length === 0 && <p className="meta">No programmes yet.</p>}
      {programmes.map((item) => (
        <div className="card metric" key={item.id}>
          <CalendarDays size={24} color="#236c4a" />
          <div className="small-metric">{item.title}</div>
          <div className="metric-label">{item.description}</div>
          <span className="badge green">{item.status}</span>
        </div>
      ))}
    </section>
  );
}

function HelpView({
  cases,
  submitCase
}: {
  cases: CaseItem[];
  submitCase: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Ask For Help">
        <form className="stack-form" onSubmit={submitCase}>
          <label>What do you need?<input name="title" placeholder="Example: Need food assistance" required /></label>
          <label>Details<textarea name="details" placeholder="Tell us what happened" /></label>
          <button className="button primary" type="submit"><HeartHandshake size={18} /> Submit request</button>
        </form>
      </Panel>
      <Panel title="Open Cases">
        {cases.length === 0 && <p className="meta">No cases yet.</p>}
        {cases.map((item) => (
          <div className="row" key={item.id}>
            <div><strong>{item.title}</strong><span className="meta">Handled by {item.assignedTo?.name ?? "Unassigned"}</span></div>
            <span className="badge gold">{item.status}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function MembersView({
  members,
  canPlaceAnywhere,
  addMember
}: {
  members: Member[];
  canPlaceAnywhere: boolean;
  addMember: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Add Member">
        <form className="stack-form" onSubmit={addMember}>
          <label>New member name<input name="name" placeholder="Full name" required /></label>
          <label>Email<input name="email" type="email" placeholder="member@example.com" required /></label>
          {canPlaceAnywhere && (
            <label>
              Place under
              <select name="invitedById" defaultValue="">
                <option value="">Directly under me</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
          )}
          <button className="button primary" type="submit"><UserPlus size={18} /> Add member</button>
        </form>
      </Panel>
      <Panel title="Member Circle">
        {members.length === 0 && <p className="meta">No members yet.</p>}
        {members.map((member) => (
          <div className="leader-row" key={member.id}>
            <span className="rank">{member.name.slice(0, 1)}</span>
            <strong>{member.name}</strong>
            <span className="meta">{member.invitedBy ? `Under ${member.invitedBy.name}` : "Direct"}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function MeetingsView({ meetings }: { meetings: Meeting[] }) {
  return (
    <section className="dashboard-grid">
      <Panel title="Upcoming Meetings">
        {meetings.length === 0 && <p className="meta">No meetings scheduled.</p>}
        {meetings.map((meeting) => (
          <div className="row" key={meeting.id}>
            <strong>{meeting.title}</strong>
            <span className="badge green">{new Date(meeting.startsAt).toLocaleString()}</span>
          </div>
        ))}
      </Panel>
      <Panel title="Meeting Minutes">
        <div className="row"><strong>Upload minutes</strong><span className="meta">Add PDF or document after meeting.</span></div>
        <div className="row"><strong>Attendance</strong><span className="meta">Mark who attended.</span></div>
      </Panel>
    </section>
  );
}

function MoneyView({ summary }: { summary: DashboardSummary | null }) {
  return (
    <section className="three-grid">
      <Metric icon={WalletCards} value={`RM ${(summary?.money.approvedBudget ?? 0).toLocaleString()}`} label="Approved budget" />
      <Metric icon={FileText} value={String(summary?.money.expensesPending ?? "-")} label="Expenses waiting" />
      <Metric icon={ShieldCheck} value={String(summary?.money.grantApplications ?? "-")} label="Grant applications" />
    </section>
  );
}

function ReportsView({ summary }: { summary: DashboardSummary | null }) {
  return (
    <section className="three-grid">
      <Metric icon={Users} value={String(summary?.members ?? "-")} label="Members reached" />
      <Metric icon={HeartHandshake} value={String(summary?.volunteerHours ?? "-")} label="Volunteer hours" />
      <Metric icon={Trophy} value={String(summary?.openCases ?? "-")} label="Open help cases" />
    </section>
  );
}

function AdminView({
  role,
  approvals,
  decideApproval
}: {
  role: Role;
  approvals: Approval[];
  decideApproval: (id: string, status: "APPROVED" | "REJECTED") => void;
}) {
  return (
    <section className="dashboard-grid">
      <Panel title="Pending Approvals">
        {approvals.length === 0 && <p className="meta">Nothing waiting for approval.</p>}
        {approvals.map((approval) => (
          <div className="row" key={approval.id}>
            <div>
              <strong>{approval.announcement?.title ?? approval.event?.title ?? approval.type}</strong>
              <span className="meta">{approval.type}</span>
            </div>
            <div className="inline-actions">
              <button className="button" type="button" onClick={() => decideApproval(approval.id, "REJECTED")}>Reject</button>
              <button className="button primary" type="button" onClick={() => decideApproval(approval.id, "APPROVED")}>Approve</button>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title="System Setup">
        <div className="row"><strong>Your role</strong><span className="badge green">{roleLabels[role]}</span></div>
        <div className="row"><strong>Organisation profile</strong><span className="meta">Name, registration, committee, contact details.</span></div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">{title}</h2></div>
      <div className="card-body list">{children}</div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="card metric">
      <Icon size={26} color="#236c4a" />
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function getViewTitle(view: View) {
  const titles: Record<View, string> = {
    home: "What do you want to do today?",
    news: "News and announcements",
    programmes: "Programmes and events",
    help: "Ask for help",
    members: "Members and circles",
    meetings: "Meetings and minutes",
    money: "Money and grants",
    reports: "Reports",
    admin: "Settings and access"
  };
  return titles[view];
}

function getViewDescription(view: View, role: Role) {
  if (view === "home") return `You are signed in as ${roleLabels[role]}. Only your side is shown.`;
  const descriptions: Record<View, string> = {
    home: "",
    news: "Read or send important updates in simple words.",
    programmes: "Join, create, or manage activities and volunteer programmes.",
    help: "Submit cases, complaints, or assistance requests and follow up clearly.",
    members: "Add members and keep a simple member hierarchy.",
    meetings: "Schedule president and committee meetings, upload minutes, and track attendance.",
    money: "Manage budgets, expenses, donations, and grant applications.",
    reports: "See simple impact numbers for members, volunteers, money, and cases.",
    admin: "Control login access, organisation settings, and audit records."
  };
  return descriptions[view];
}
