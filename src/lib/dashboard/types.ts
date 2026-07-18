export type Role = "MEMBER" | "PRESIDENT" | "ADMIN" | "MASTER";
export type View = "home" | "news" | "programmes" | "help" | "members" | "meetings" | "money" | "reports" | "admin";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  points: number;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: "EVENTS" | "URGENT" | "OPPORTUNITIES";
};

export type Programme = {
  id: string;
  title: string;
  description: string;
  status: string;
};

export type CaseItem = {
  id: string;
  title: string;
  status: string;
  assignedTo: { name: string } | null;
};

export type Member = {
  id: string;
  name: string;
  points: number;
  invitedBy: { name: string } | null;
};

export type Meeting = {
  id: string;
  title: string;
  startsAt: string;
};

export type Approval = {
  id: string;
  type: string;
  announcement: { title: string } | null;
  event: { title: string } | null;
};

export type DashboardSummary = {
  members: number;
  pendingApprovals: number;
  openCases: number;
  openProgrammes: number;
  volunteerHours: number;
  money: { approvedBudget: number; expensesPending: number; grantApplications: number };
};
