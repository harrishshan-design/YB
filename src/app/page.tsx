"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Crown,
  Gauge,
  Megaphone,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X
} from "lucide-react";

type AnnouncementCategory = "All" | "Events" | "Urgent" | "Opportunities";

type Member = {
  id: string;
  name: string;
  points: number;
  invitedById?: string;
};

const initialMembers: Member[] = [
  { id: "nadia", name: "Nadia", points: 182 },
  { id: "ethan", name: "Ethan", points: 176 },
  { id: "irfan", name: "Irfan", points: 164 },
  { id: "leah", name: "Leah", points: 151, invitedById: "nadia" },
  { id: "arjun", name: "Arjun", points: 147, invitedById: "nadia" },
  { id: "chloe", name: "Chloe", points: 139, invitedById: "ethan" },
  { id: "ravi", name: "Ravi", points: 132, invitedById: "irfan" },
  { id: "maya", name: "Maya", points: 126, invitedById: "leah" },
  { id: "yusuf", name: "Yusuf", points: 119, invitedById: "arjun" },
  { id: "grace", name: "Grace", points: 111, invitedById: "chloe" }
];

const initialAnnouncements = [
  { title: "Community Service Saturday", category: "Events", tone: "green", detail: "Registration closes Thursday, 8:00 PM." },
  { title: "Scholarship briefing moved earlier", category: "Urgent", tone: "red", detail: "New start time is 6:30 PM in the main hall." },
  { title: "Youth leadership applications open", category: "Opportunities", tone: "blue", detail: "Members can apply until May 18." }
];

const initialApprovals = [
  { title: "Publish volunteer drive announcement", type: "Announcement", owner: "Admin Office", status: "Pending" },
  { title: "Approve May sports day reward pool", type: "Rewards", owner: "Youth Programs", status: "Pending" },
  { title: "Confirm community partner event", type: "Event", owner: "Partnerships", status: "Pending" }
];

const meetings = [
  { title: "May Board Planning", time: "May 8, 7:30 PM", detail: "Agenda, approvals, monthly winners" },
  { title: "Event Safety Review", time: "May 12, 8:00 PM", detail: "Volunteer roles and risk checklist" }
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "rewards", label: "Rewards", icon: Trophy },
  { id: "chat", label: "Board Chat", icon: MessageSquareText },
  { id: "admin", label: "Admin", icon: ShieldCheck }
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [announcementFilter, setAnnouncementFilter] = useState<AnnouncementCategory>("All");
  const [members, setMembers] = useState(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState("nadia");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [chatChannel, setChatChannel] = useState("General");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { channel: "General", mine: false, title: "General", detail: "Please review the event approval before Friday." },
    { channel: "Decisions", mine: true, title: "Decisions", detail: "Reward allocation is ready for vote." },
    { channel: "Meetings", mine: false, title: "Meetings", detail: "Minutes upload slot added to each meeting." }
  ]);
  const [modal, setModal] = useState<"announcement" | "member" | null>(null);
  const [toast, setToast] = useState("Ready");

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? members[0];
  const filteredAnnouncements = announcementFilter === "All"
    ? announcements
    : announcements.filter((item) => item.category === announcementFilter);

  const leaderboard = useMemo(
    () => [...members].sort((a, b) => b.points - a.points).slice(0, 10),
    [members]
  );

  const directMembers = members.filter((member) => member.invitedById === selectedMember.id);
  const stats = [
    { label: "Active members", value: String(members.length + 238), icon: Users },
    { label: "Board members", value: "7", icon: Crown },
    { label: "Pending approvals", value: String(approvals.filter((approval) => approval.status === "Pending").length), icon: CheckCircle2 },
    { label: "Monthly engagement", value: "84%", icon: Gauge }
  ];

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = String(form.get("category")) as "Events" | "Urgent" | "Opportunities";
    setAnnouncements((current) => [
      {
        title: String(form.get("title")),
        detail: String(form.get("content")),
        category,
        tone: category === "Urgent" ? "red" : category === "Opportunities" ? "blue" : "green"
      },
      ...current
    ]);
    setModal(null);
    setToast("Announcement queued for board approval");
    event.currentTarget.reset();
  }

  function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parentId = String(form.get("parentId"));
    const name = String(form.get("name"));
    setMembers((current) => [
      ...current,
      {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
        name,
        points: 0,
        invitedById: parentId
      }
    ]);
    setSelectedMemberId(parentId);
    setModal(null);
    setToast(`${name} added to the member circle`);
    event.currentTarget.reset();
  }

  function updateApproval(index: number, status: "Approved" | "Rejected") {
    setApprovals((current) => current.map((approval, approvalIndex) => (
      approvalIndex === index ? { ...approval, status } : approval
    )));
    setToast(`Approval ${status.toLowerCase()}`);
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    setChatMessages((current) => [
      ...current,
      { channel: chatChannel, mine: true, title: chatChannel, detail: chatInput.trim() }
    ]);
    setChatInput("");
    setToast("Message sent");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => scrollToSection("dashboard")} aria-label="Open dashboard">
          <div className="brand-mark">YC</div>
          <div>
            <h2 className="brand-title">Youth Club OS</h2>
            <p className="brand-subtitle">NGO operations system</p>
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
          <p className="eyebrow">Member access</p>
          <h3>Members can add members</h3>
          <p className="brand-subtitle">Each new person stays connected to the member who brought them in.</p>
        </button>
      </aside>

      <section className="main">
        <div className="topbar" id="dashboard">
          <div>
            <p className="eyebrow">Admin command center</p>
            <h1>Run announcements, rewards, meetings, and members from one place.</h1>
            <p className="lead">
              A role-based NGO system for board members, youth club members, and super admin, with member circles for clean hierarchy tracking.
            </p>
          </div>
          <div className="actions">
            <button className="button primary" onClick={() => setModal("announcement")}><Plus size={18} /> New announcement</button>
            <button className="button" onClick={() => setModal("member")}><UserPlus size={18} /> Add member</button>
          </div>
        </div>

        <div className="toast" role="status">{toast}</div>

        <section className="stats-grid" aria-label="System metrics">
          {stats.map((stat) => (
            <button className="card metric clickable" key={stat.label} onClick={() => setToast(`${stat.label}: ${stat.value}`)}>
              <stat.icon size={22} color="#236c4a" />
              <div className="metric-value">{stat.value}</div>
              <div className="metric-label">{stat.label}</div>
            </button>
          ))}
        </section>

        <section className="dashboard-grid" id="announcements">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Broadcast Announcements</h2>
              <button className="badge green badge-button" onClick={() => setToast("Members receive published announcements instantly")}><Bell size={12} /> Instant push</button>
            </div>
            <div className="card-body list">
              <div className="tabs">
                {(["All", "Events", "Urgent", "Opportunities"] as AnnouncementCategory[]).map((category) => (
                  <button
                    className={`tab ${announcementFilter === category ? "active" : ""}`}
                    key={category}
                    onClick={() => setAnnouncementFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {filteredAnnouncements.map((item) => (
                <button className="row row-button" key={item.title} onClick={() => setToast(`${item.title} opened`)}>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="meta">{item.detail}</span>
                  </div>
                  <span className={`badge ${item.tone}`}>{item.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" id="rewards">
            <div className="card-header">
              <h2 className="card-title">Monthly Top 10</h2>
              <button className="badge gold badge-button" onClick={() => setToast("Leaderboard is calculated per reward month")}>May 2026</button>
            </div>
            <div className="card-body">
              {leaderboard.map((member, index) => (
                <button className="leader-row leader-button" key={member.id} onClick={() => setSelectedMemberId(member.id)}>
                  <span className="rank">{index + 1}</span>
                  <strong>{member.name}</strong>
                  <span className="meta">{member.points} pts</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="three-grid">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Board Approvals</h2>
              <CheckCircle2 size={20} color="#236c4a" />
            </div>
            <div className="card-body list">
              {approvals.map((approval, index) => (
                <div className="row" key={approval.title}>
                  <button className="plain-row" onClick={() => setToast(`${approval.title} selected`)}>
                    <strong>{approval.title}</strong>
                    <span className="meta">{approval.owner}</span>
                  </button>
                  <div className="inline-actions">
                    <span className={`badge ${approval.status === "Pending" ? "blue" : approval.status === "Approved" ? "green" : "red"}`}>{approval.status}</span>
                    <button className="icon-button" onClick={() => updateApproval(index, "Approved")} aria-label={`Approve ${approval.title}`}><Check size={16} /></button>
                    <button className="icon-button" onClick={() => updateApproval(index, "Rejected")} aria-label={`Reject ${approval.title}`}><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" id="meetings">
            <div className="card-header">
              <h2 className="card-title">Meetings</h2>
              <button className="icon-button" onClick={() => setToast("Meeting creation opened")} aria-label="Create meeting"><Plus size={16} /></button>
            </div>
            <div className="card-body list">
              {meetings.map((meeting) => (
                <button className="row row-button" key={meeting.title} onClick={() => setToast(`${meeting.title} attendance opened`)}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <span className="meta">{meeting.detail}</span>
                  </div>
                  <span className="badge green">{meeting.time}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" id="chat">
            <div className="card-header">
              <h2 className="card-title">Board Chat</h2>
              <MessageSquareText size={20} color="#236c4a" />
            </div>
            <div className="card-body">
              <div className="tabs compact-tabs">
                {["General", "Meetings", "Decisions"].map((channel) => (
                  <button className={`tab ${chatChannel === channel ? "active" : ""}`} key={channel} onClick={() => setChatChannel(channel)}>
                    {channel}
                  </button>
                ))}
              </div>
              <div className="chat-preview">
                {chatMessages.filter((message) => message.channel === chatChannel).map((message, index) => (
                  <button className={`message ${message.mine ? "mine" : ""}`} key={`${message.detail}-${index}`} onClick={() => setToast(`${message.title} message selected`)}>
                    <strong>{message.title}</strong>
                    <div className="meta">{message.detail}</div>
                  </button>
                ))}
              </div>
              <div className="composer">
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={`Message ${chatChannel}`} />
                <button className="icon-button solid" onClick={sendMessage} aria-label="Send message"><Send size={16} /></button>
              </div>
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
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">System Controls</h2>
              <ShieldCheck size={20} color="#236c4a" />
            </div>
            <div className="card-body list">
              <button className="row row-button" onClick={() => setToast("Board member management opened")}>
                <div><strong>Board members</strong><span className="meta">Add or remove the 7 board seats</span></div>
                <span className="badge green">Admin</span>
              </button>
              <button className="row row-button" onClick={() => setToast("Activity monitor opened")}>
                <div><strong>Activity monitor</strong><span className="meta">Track announcements, rewards, meetings, and member additions</span></div>
                <span className="badge blue">Live</span>
              </button>
            </div>
          </div>
        </section>

        <section className="three-grid">
          <button className="card metric clickable" onClick={() => setAnnouncementFilter("Opportunities")}>
            <Sparkles size={22} color="#b7791f" />
            <div className="metric-value">3</div>
            <div className="metric-label">Announcement categories</div>
          </button>
          <button className="card metric clickable" onClick={() => scrollToSection("rewards")}>
            <Trophy size={22} color="#b7791f" />
            <div className="metric-value">Auto</div>
            <div className="metric-label">Monthly leaderboard</div>
          </button>
          <button className="card metric clickable" onClick={() => scrollToSection("admin")}>
            <ShieldCheck size={22} color="#236c4a" />
            <div className="metric-value">RBAC</div>
            <div className="metric-label">Admin, board, and member roles</div>
          </button>
        </section>
      </section>

      {modal === "announcement" && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal" onSubmit={handleAnnouncementSubmit}>
            <div className="modal-header">
              <h2>New Announcement</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close announcement form"><X size={16} /></button>
            </div>
            <label>Title<input name="title" required placeholder="Announcement title" /></label>
            <label>Category
              <select name="category" defaultValue="Events">
                <option>Events</option>
                <option>Urgent</option>
                <option>Opportunities</option>
              </select>
            </label>
            <label>Content<textarea name="content" required placeholder="Write the update" /></label>
            <button className="button primary" type="submit"><Megaphone size={18} /> Submit</button>
          </form>
        </div>
      )}

      {modal === "member" && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal" onSubmit={handleMemberSubmit}>
            <div className="modal-header">
              <h2>Add Member</h2>
              <button className="icon-button" type="button" onClick={() => setModal(null)} aria-label="Close member form"><X size={16} /></button>
            </div>
            <label>Name<input name="name" required placeholder="Member name" /></label>
            <label>Email<input name="email" required type="email" placeholder="member@email.com" /></label>
            <label>Place under
              <select name="parentId" defaultValue={selectedMember.id}>
                {members.map((member) => (
                  <option value={member.id} key={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
            <button className="button primary" type="submit"><UserPlus size={18} /> Add member</button>
          </form>
        </div>
      )}
    </main>
  );
}
