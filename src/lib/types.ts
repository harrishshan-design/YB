export type Role = "ADMIN" | "BOARD" | "MEMBER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  points: number;
  avatarUrl: string | null;
  joinedAt: string;
  isActive: boolean;
  inviteCode: string | null;
  invitedById: string | null;
  invitedBy?: ApiUser | null;
  invitedMembers?: ApiUser[];
  activity?: { id: string; action: string; createdAt: string }[];
};

export type AnnouncementCategory = "EVENTS" | "URGENT" | "OPPORTUNITIES";

export type Approval = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: string;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  createdAt: string;
  publishedAt: string | null;
  status: string;
  createdBy: ApiUser;
  approval: Approval | null;
};

export type MeetingAttendance = {
  id: string;
  meetingId: string;
  userId: string;
  status: "INVITED" | "ATTENDED" | "ABSENT";
  user: ApiUser;
};

export type Meeting = {
  id: string;
  title: string;
  agenda: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  meetUrl: string | null;
  status: string;
  attendance: MeetingAttendance[];
};

export type LeaderboardEntry = {
  rank: number;
  points: number;
  user: ApiUser | undefined;
};

export type DashboardSummary = {
  members: number;
  board: number;
  pendingApprovals: number;
  announcements: Announcement[];
  meetings: Meeting[];
  leaderboard: ApiUser[];
};

export type BoardMessage = {
  id: string;
  senderId: string;
  sender: ApiUser;
  channel: string;
  message: string;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: ApiUser;
};
