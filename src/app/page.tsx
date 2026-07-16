"use client";

import { FormEvent, useMemo, useState } from "react";
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
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";

type Role = "member" | "president" | "admin" | "master";
type View = "home" | "news" | "programmes" | "help" | "members" | "meetings" | "money" | "reports" | "admin";

type Account = {
  email: string;
  password: string;
  name: string;
  role: Role;
  organisation: string;
};

const accounts: Account[] = [
  { email: "member@demo.com", password: "123456", name: "Nadia Member", role: "member", organisation: "Youth Club" },
  { email: "president@demo.com", password: "123456", name: "Club President", role: "president", organisation: "Youth Club" },
  { email: "admin@demo.com", password: "123456", name: "Operations Admin", role: "admin", organisation: "Youth Club" },
  { email: "master@demo.com", password: "123456", name: "Master Account", role: "master", organisation: "Whole Platform" }
];

const roleLabels: Record<Role, string> = {
  member: "Member",
  president: "President",
  admin: "Admin",
  master: "Master"
};

const allViews: Array<{ id: View; label: string; icon: React.ElementType; roles: Role[] }> = [
  { id: "home", label: "Home", icon: Home, roles: ["member", "president", "admin", "master"] },
  { id: "news", label: "News", icon: Bell, roles: ["member", "president", "admin", "master"] },
  { id: "programmes", label: "Programmes", icon: CalendarDays, roles: ["member", "president", "admin", "master"] },
  { id: "help", label: "Ask For Help", icon: HeartHandshake, roles: ["member", "admin", "master"] },
  { id: "members", label: "Members", icon: Users, roles: ["member", "president", "admin", "master"] },
  { id: "meetings", label: "Meetings", icon: MessageSquareText, roles: ["president", "admin", "master"] },
  { id: "money", label: "Money", icon: WalletCards, roles: ["president", "admin", "master"] },
  { id: "reports", label: "Reports", icon: FileText, roles: ["president", "admin", "master"] },
  { id: "admin", label: "Settings", icon: ShieldCheck, roles: ["admin", "master"] }
];

const announcements = [
  { title: "Community Service Saturday", detail: "Register before Thursday, 8:00 PM.", type: "Event" },
  { title: "Scholarship briefing moved earlier", detail: "New start time is 6:30 PM.", type: "Urgent" },
  { title: "Youth leadership applications open", detail: "Applications close on May 18.", type: "Opportunity" }
];

const programmes = [
  { title: "Food Basket Support", detail: "Help prepare and deliver food baskets.", status: "Open" },
  { title: "Community Service Saturday", detail: "Volunteer at the community hall.", status: "Open" },
  { title: "Youth Mentorship", detail: "Pair mentors with younger members.", status: "Planning" }
];

const members = [
  { name: "Nadia", points: 182, under: "Direct" },
  { name: "Leah", points: 151, under: "Under Nadia" },
  { name: "Maya", points: 126, under: "Under Leah" },
  { name: "Arjun", points: 147, under: "Under Nadia" }
];

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [activeView, setActiveView] = useState<View>("home");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("Welcome. Choose a task to begin.");
  const [cases, setCases] = useState([{ title: "Need food assistance", status: "Open", owner: "Nadia Member" }]);
  const [newMemberName, setNewMemberName] = useState("");

  const allowedViews = useMemo(() => {
    if (!currentUser) return [];
    return allViews.filter((view) => view.roles.includes(currentUser.role));
  }, [currentUser]);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    const account = accounts.find((item) => item.email === email && item.password === password);

    if (!account) {
      setError("Wrong email or password. Try a demo account below.");
      return;
    }

    setCurrentUser(account);
    setActiveView("home");
    setError("");
    setNotice(`Logged in as ${roleLabels[account.role]}.`);
  }

  function loginAs(account: Account) {
    setCurrentUser(account);
    setActiveView("home");
    setError("");
    setNotice(`Logged in as ${roleLabels[account.role]}.`);
  }

  function logout() {
    setCurrentUser(null);
    setActiveView("home");
    setNotice("Logged out safely.");
  }

  function submitCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    if (!title) return;
    setCases((current) => [{ title, status: "Open", owner: currentUser?.name ?? "Member" }, ...current]);
    setNotice("Your help request was submitted.");
    event.currentTarget.reset();
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMemberName.trim()) return;
    setNotice(`${newMemberName.trim()} was added under your member circle.`);
    setNewMemberName("");
  }

  if (!currentUser) {
    return (
      <main className="login-page">
        <section className="login-hero">
          <div>
            <p className="eyebrow">NGO Help System</p>
            <h1>Login to continue.</h1>
            <p className="lead">Simple, secure access for members, the president, admins, and the master account.</p>
          </div>

          <form className="login-card" onSubmit={login}>
            <div className="login-icon"><Lock size={28} /></div>
            <h2>Sign in</h2>
            <label>Email<input name="email" type="email" placeholder="member@demo.com" required /></label>
            <label>Password<input name="password" type="password" placeholder="123456" required /></label>
            {error && <p className="error-text">{error}</p>}
            <button className="button primary" type="submit">Login</button>
          </form>
        </section>

        <section className="demo-grid" aria-label="Demo accounts">
          {accounts.map((account) => (
            <button className="demo-card" key={account.email} onClick={() => loginAs(account)}>
              <strong>{roleLabels[account.role]}</strong>
              <span>{account.email}</span>
              <small>Password: 123456</small>
            </button>
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
            <h2 className="brand-title">NGO Help System</h2>
            <p className="brand-subtitle">{currentUser.organisation}</p>
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

        {activeView === "home" && <HomeView role={currentUser.role} setActiveView={setActiveView} />}
        {activeView === "news" && <NewsView />}
        {activeView === "programmes" && <ProgrammesView />}
        {activeView === "help" && <HelpView cases={cases} submitCase={submitCase} />}
        {activeView === "members" && <MembersView newMemberName={newMemberName} setNewMemberName={setNewMemberName} addMember={addMember} />}
        {activeView === "meetings" && <MeetingsView />}
        {activeView === "money" && <MoneyView />}
        {activeView === "reports" && <ReportsView />}
        {activeView === "admin" && <AdminView role={currentUser.role} />}
      </section>
    </main>
  );
}

function HomeView({ role, setActiveView }: { role: Role; setActiveView: (view: View) => void }) {
  const actions: Array<{ title: string; detail: string; icon: React.ElementType; view: View; roles: Role[] }> = [
    { title: "Read news", detail: "Latest announcements and urgent notices.", icon: Bell, view: "news", roles: ["member", "president", "admin", "master"] },
    { title: "Join programme", detail: "Register for events and volunteer work.", icon: CalendarDays, view: "programmes", roles: ["member", "president", "admin", "master"] },
    { title: "Ask for help", detail: "Submit a case or complaint.", icon: HeartHandshake, view: "help", roles: ["member", "admin", "master"] },
    { title: "Add member", detail: "Invite a member into your circle.", icon: UserPlus, view: "members", roles: ["member", "president", "admin", "master"] },
    { title: "Review money", detail: "Budgets, grants, expenses, donations.", icon: WalletCards, view: "money", roles: ["president", "admin", "master"] },
    { title: "View reports", detail: "Impact, activity, and government reports.", icon: FileText, view: "reports", roles: ["president", "admin", "master"] }
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
        {actions.filter((action) => action.roles.includes(role)).map((action) => (
          <button className="quick-action" key={action.title} onClick={() => setActiveView(action.view)}>
            <action.icon size={30} />
            <span>{action.title}</span>
            <small>{action.detail}</small>
          </button>
        ))}
      </section>
      <section className="stats-grid">
        <Metric icon={Users} value="248" label="Active members" />
        <Metric icon={CalendarDays} value="12" label="Open programmes" />
        <Metric icon={ClipboardList} value="5" label="Open help cases" />
        <Metric icon={CheckCircle2} value="3" label="Waiting approval" />
      </section>
    </>
  );
}

function getSideTitle(role: Role) {
  const titles: Record<Role, string> = {
    member: "Simple member area",
    president: "President control area",
    admin: "Operations admin area",
    master: "Master system area"
  };
  return titles[role];
}

function getSideDescription(role: Role) {
  const descriptions: Record<Role, string> = {
    member: "Members can read news, join programmes, ask for help, add members under their circle, and check points.",
    president: "The president can manage members, meetings, approvals, reports, money reviews, and committee work.",
    admin: "Admins can run daily operations: members, programmes, help cases, finance, announcements, and settings.",
    master: "The master account can see and control every organisation, user role, setting, report, and access rule."
  };
  return descriptions[role];
}

function NewsView() {
  return (
    <section className="dashboard-grid">
      <Panel title="Latest News">
        {announcements.map((item) => (
          <button className="row row-button" key={item.title}>
            <div><strong>{item.title}</strong><span className="meta">{item.detail}</span></div>
            <span className="badge blue">{item.type}</span>
          </button>
        ))}
      </Panel>
      <Panel title="Send Announcement">
        <label>Title<input placeholder="Short title" /></label>
        <label>Message<textarea placeholder="Write simple announcement" /></label>
        <button className="button primary"><Plus size={18} /> Send to all</button>
      </Panel>
    </section>
  );
}

function ProgrammesView() {
  return (
    <section className="three-grid">
      {programmes.map((item) => (
        <button className="card metric clickable" key={item.title}>
          <CalendarDays size={24} color="#236c4a" />
          <div className="small-metric">{item.title}</div>
          <div className="metric-label">{item.detail}</div>
          <span className="badge green">{item.status}</span>
        </button>
      ))}
    </section>
  );
}

function HelpView({ cases, submitCase }: { cases: Array<{ title: string; status: string; owner: string }>; submitCase: (event: FormEvent<HTMLFormElement>) => void }) {
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
        {cases.map((item) => (
          <div className="row" key={`${item.title}-${item.owner}`}>
            <div><strong>{item.title}</strong><span className="meta">Submitted by {item.owner}</span></div>
            <span className="badge gold">{item.status}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function MembersView({ newMemberName, setNewMemberName, addMember }: { newMemberName: string; setNewMemberName: (value: string) => void; addMember: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <section className="dashboard-grid">
      <Panel title="Add Member">
        <form className="stack-form" onSubmit={addMember}>
          <label>New member name<input value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} placeholder="Full name" required /></label>
          <label>Place under<select><option>Under my member circle</option><option>Under another member</option></select></label>
          <button className="button primary" type="submit"><UserPlus size={18} /> Add member</button>
        </form>
      </Panel>
      <Panel title="Member Circle">
        {members.map((member) => (
          <div className="leader-row" key={member.name}>
            <span className="rank">{member.name.slice(0, 1)}</span>
            <strong>{member.name}</strong>
            <span className="meta">{member.under}</span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function MeetingsView() {
  return (
    <section className="dashboard-grid">
      <Panel title="Upcoming Meetings">
        {["President planning - Friday 7:30 PM", "Grant review - Monday 10:00 AM", "Programme safety check - Wednesday 3:00 PM"].map((meeting) => (
          <button className="row row-button" key={meeting}><strong>{meeting}</strong><span className="badge green">View</span></button>
        ))}
      </Panel>
      <Panel title="Meeting Minutes">
        <button className="row row-button"><strong>Upload minutes</strong><span className="meta">Add PDF or document after meeting.</span></button>
        <button className="row row-button"><strong>Attendance</strong><span className="meta">Mark who attended.</span></button>
      </Panel>
    </section>
  );
}

function MoneyView() {
  return (
    <section className="three-grid">
      <Metric icon={WalletCards} value="RM 42k" label="Approved budget" />
      <Metric icon={FileText} value="8" label="Expenses waiting" />
      <Metric icon={ShieldCheck} value="2" label="Grant applications" />
    </section>
  );
}

function ReportsView() {
  return (
    <section className="three-grid">
      <Metric icon={Users} value="248" label="Members reached" />
      <Metric icon={HeartHandshake} value="1,240" label="Volunteer hours" />
      <Metric icon={Trophy} value="84%" label="Engagement" />
    </section>
  );
}

function AdminView({ role }: { role: Role }) {
  return (
    <section className="dashboard-grid">
      <Panel title="Login and Permissions">
        <button className="row row-button"><div><strong>Manage roles</strong><span className="meta">Control who can see each area.</span></div><span className="badge green">{roleLabels[role]}</span></button>
        <button className="row row-button"><div><strong>President and agency access</strong><span className="meta">Approve high-level access to organisations.</span></div><span className="badge blue">Secure</span></button>
      </Panel>
      <Panel title="System Setup">
        <button className="row row-button"><strong>Organisation profile</strong><span className="meta">Name, registration, committee, contact details.</span></button>
        <button className="row row-button"><strong>Audit logs</strong><span className="meta">Track all important changes.</span></button>
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
    <button className="card metric clickable">
      <Icon size={26} color="#236c4a" />
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </button>
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

