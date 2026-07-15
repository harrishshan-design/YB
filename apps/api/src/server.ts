import cors from "cors";
import express from "express";
import { createServer } from "node:http";
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

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "ngo-api" });
});

app.get("/dashboard/summary", async (_request, response) => {
  const [members, board, pendingApprovals, announcements, meetings, leaderboard] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", isActive: true } }),
    db.user.count({ where: { role: "BOARD", isActive: true } }),
    db.approval.count({ where: { status: "PENDING" } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: true } }),
    db.meeting.findMany({ orderBy: { startsAt: "asc" }, take: 5, include: { attendance: true } }),
    db.user.findMany({ where: { role: "MEMBER" }, orderBy: { points: "desc" }, take: 10 })
  ]);

  response.json({ members, board, pendingApprovals, announcements, meetings, leaderboard });
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
    invitedBoardMemberIds: z.array(z.string()).default([])
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
        create: body.invitedBoardMemberIds.map((userId) => ({ userId, status: "INVITED" }))
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
  socket.on("join:board", (channel: string = "general") => socket.join(`board:${channel}`));
  socket.on("board:message", async (payload: { senderId: string; channel: string; message: string }) => {
    const message = await db.message.create({ data: payload, include: { sender: true } });
    io.to(`board:${payload.channel}`).emit("board:message", message);
  });
});

server.listen(port, () => {
  console.log(`NGO API listening on http://localhost:${port}`);
});
