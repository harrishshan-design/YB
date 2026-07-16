import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import { getDb } from "./db";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000"
  }
});

const db = getDb();
const port = Number(process.env.PORT ?? 4000);
const authTokens = new Map<string, { email: string; name: string; role: string; organisation: string }>();

const demoAccounts = [
  { email: "member@demo.com", password: "123456", name: "Nadia Member", role: "member", organisation: "Youth Club" },
  { email: "president@demo.com", password: "123456", name: "Club President", role: "president", organisation: "Youth Club" },
  { email: "admin@demo.com", password: "123456", name: "Operations Admin", role: "admin", organisation: "Youth Club" },
  { email: "master@demo.com", password: "123456", name: "Master Account", role: "master", organisation: "Whole Platform" }
];

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "ngo-api" });
});

app.post("/auth/login", (request, response) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const account = demoAccounts.find((item) => item.email === body.email.toLowerCase() && item.password === body.password);
  if (!account) {
    response.status(401).json({ message: "Wrong email or password" });
    return;
  }

  const token = randomUUID();
  const { password: _password, ...user } = account;
  authTokens.set(token, user);
  response.json({ token, user });
});

app.get("/auth/me", (request, response) => {
  const token = request.headers.authorization?.replace("Bearer ", "");
  const user = token ? authTokens.get(token) : null;
  if (!user) {
    response.status(401).json({ message: "Not logged in" });
    return;
  }

  response.json({ user });
});

app.get("/dashboard/summary", async (_request, response) => {
  const [members, presidentTeam, pendingApprovals, announcements, meetings, leaderboard] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", isActive: true } }),
    db.user.count({ where: { role: "BOARD", isActive: true } }),
    db.approval.count({ where: { status: "PENDING" } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: true } }),
    db.meeting.findMany({ orderBy: { startsAt: "asc" }, take: 5, include: { attendance: true } }),
    db.user.findMany({ where: { role: "MEMBER" }, orderBy: { points: "desc" }, take: 10 })
  ]);

  response.json({ members, presidentTeam, pendingApprovals, announcements, meetings, leaderboard });
});

app.get("/members", async (_request, response) => {
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: [{ points: "desc" }, { name: "asc" }],
    include: {
      invitedBy: true,
      invitedMembers: true,
      activity: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });

  response.json(members);
});

app.post("/members", async (request, response) => {
  const body = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(["ADMIN", "BOARD", "MEMBER"]).default("MEMBER"),
    invitedById: z.string().optional()
  }).parse(request.body);

  const member = await db.user.create({
    data: {
      ...body,
      inviteCode: `YC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    },
    include: { invitedBy: true, invitedMembers: true }
  });

  if (body.invitedById) {
    await db.activity.create({
      data: {
        userId: body.invitedById,
        action: "member_added_to_circle",
        metadata: { memberId: member.id, memberName: member.name }
      }
    });
  }

  response.status(201).json(member);
});

app.get("/members/:id/circle", async (request, response) => {
  const member = await db.user.findUnique({
    where: { id: request.params.id },
    include: {
      invitedMembers: {
        orderBy: { joinedAt: "desc" },
        include: { invitedMembers: true }
      },
      invitedBy: true
    }
  });

  if (!member) {
    response.status(404).json({ message: "Member not found" });
    return;
  }

  response.json(member);
});

app.get("/announcements", async (_request, response) => {
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: true, approval: true }
  });

  response.json(announcements);
});

app.post("/announcements", async (request, response) => {
  const body = z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    category: z.enum(["EVENTS", "URGENT", "OPPORTUNITIES"]),
    createdById: z.string(),
    publishNow: z.boolean().default(false)
  }).parse(request.body);

  const announcement = await db.announcement.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category,
      createdById: body.createdById,
      publishedAt: body.publishNow ? new Date() : null,
      approval: { create: { type: "announcement", status: body.publishNow ? "APPROVED" : "PENDING" } }
    },
    include: { createdBy: true, approval: true }
  });

  io.to("announcements").emit("announcement:new", announcement);
  response.status(201).json(announcement);
});

app.get("/rewards/leaderboard", async (request, response) => {
  const month = typeof request.query.month === "string" ? request.query.month : new Date().toISOString().slice(0, 7);
  const leaderboard = await db.reward.groupBy({
    by: ["userId"],
    where: { month },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: 10
  });

  const users = await db.user.findMany({ where: { id: { in: leaderboard.map((entry) => entry.userId) } } });
  const ranked = leaderboard.map((entry, index) => ({
    rank: index + 1,
    points: entry._sum.points ?? 0,
    user: users.find((user) => user.id === entry.userId)
  }));

  response.json(ranked);
});

app.post("/rewards", async (request, response) => {
  const body = z.object({
    userId: z.string(),
    points: z.number().int().positive(),
    reason: z.string().min(3),
    month: z.string().regex(/^\d{4}-\d{2}$/)
  }).parse(request.body);

  const reward = await db.$transaction(async (tx) => {
    const created = await tx.reward.create({ data: body });
    await tx.user.update({ where: { id: body.userId }, data: { points: { increment: body.points } } });
    await tx.activity.create({
      data: { userId: body.userId, action: "points_awarded", metadata: { points: body.points, reason: body.reason } }
    });
    return created;
  });

  response.status(201).json(reward);
});

app.get("/meetings", async (_request, response) => {
  const meetings = await db.meeting.findMany({
    orderBy: { startsAt: "asc" },
    include: { attendance: { include: { user: true } } }
  });

  response.json(meetings);
});

app.post("/meetings", async (request, response) => {
  const body = z.object({
    title: z.string().min(3),
    agenda: z.string().min(5),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().optional(),
    meetUrl: z.string().url().optional(),
    invitedCommitteeMemberIds: z.array(z.string()).default([])
  }).parse(request.body);

  const meeting = await db.meeting.create({
    data: {
      title: body.title,
      agenda: body.agenda,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      location: body.location,
      meetUrl: body.meetUrl,
      attendance: {
        create: body.invitedCommitteeMemberIds.map((userId) => ({ userId, status: "INVITED" }))
      }
    },
    include: { attendance: true }
  });

  response.status(201).json(meeting);
});

app.get("/approvals", async (_request, response) => {
  const approvals = await db.approval.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { announcement: true, event: true }
  });

  response.json(approvals);
});

app.patch("/approvals/:id", async (request, response) => {
  const body = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reviewerId: z.string(),
    note: z.string().optional()
  }).parse(request.body);

  const approval = await db.approval.update({
    where: { id: request.params.id },
    data: { status: body.status, reviewerId: body.reviewerId, note: body.note, reviewedAt: new Date() }
  });

  response.json(approval);
});

io.on("connection", (socket) => {
  socket.on("join:announcements", () => socket.join("announcements"));
  socket.on("join:committee", (channel: string = "general") => socket.join(`committee:${channel}`));
  socket.on("committee:message", async (payload: { senderId: string; channel: string; message: string }) => {
    const message = await db.message.create({ data: payload, include: { sender: true } });
    io.to(`committee:${payload.channel}`).emit("committee:message", message);
  });
});

server.listen(port, () => {
  console.log(`NGO API listening on http://localhost:${port}`);
});

