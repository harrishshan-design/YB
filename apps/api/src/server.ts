import "dotenv/config";
import { Prisma } from "@prisma/client";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { getDb } from "./db";
import { hashPassword, requireAuth, requireRole, signToken, verifyPassword, verifyToken } from "./auth";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000"
  }
});

const db = getDb();
const port = Number(process.env.PORT ?? 4000);

// Fields safe to return to clients. Never spread a raw Prisma User record into a
// response — it carries passwordHash.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  points: true,
  avatarUrl: true,
  joinedAt: true,
  isActive: true,
  inviteCode: true,
  invitedById: true
} as const;

app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "ngo-api" });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

app.post("/auth/login", loginLimiter, async (request, response) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const user = await db.user.findUnique({ where: { email: body.email } });
  const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;

  if (!user || !valid || !user.isActive) {
    response.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken({ id: user.id, role: user.role });
  response.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.use(requireAuth);

app.patch("/auth/password", async (request, response) => {
  const body = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
  }).parse(request.body);

  const actor = request.user!;
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  const valid = await verifyPassword(body.currentPassword, user.passwordHash);

  if (!valid) {
    response.status(401).json({ message: "Current password is incorrect" });
    return;
  }

  const passwordHash = await hashPassword(body.newPassword);
  await db.user.update({ where: { id: actor.id }, data: { passwordHash } });

  response.json({ message: "Password updated" });
});

app.get("/dashboard/summary", async (_request, response) => {
  const [members, board, pendingApprovals, announcements, meetings, leaderboard] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", isActive: true } }),
    db.user.count({ where: { role: "BOARD", isActive: true } }),
    db.approval.count({ where: { status: "PENDING" } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: { select: userSelect } } }),
    db.meeting.findMany({ orderBy: { startsAt: "asc" }, take: 5, include: { attendance: true } }),
    db.user.findMany({ where: { role: "MEMBER" }, orderBy: { points: "desc" }, take: 10, select: userSelect })
  ]);

  response.json({ members, board, pendingApprovals, announcements, meetings, leaderboard });
});

app.get("/members", async (_request, response) => {
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: [{ points: "desc" }, { name: "asc" }],
    select: {
      ...userSelect,
      invitedBy: { select: userSelect },
      invitedMembers: { select: userSelect },
      activity: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });

  response.json(members);
});

app.post("/members", async (request, response) => {
  const body = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["ADMIN", "BOARD", "MEMBER"]).default("MEMBER"),
    invitedById: z.string().optional()
  }).parse(request.body);

  const actor = request.user!;

  // Members may only add people under their own circle, and cannot self-elevate roles.
  if (actor.role === "MEMBER") {
    if (body.role !== "MEMBER") {
      response.status(403).json({ message: "Only admins can assign board or admin roles" });
      return;
    }
    if (body.invitedById && body.invitedById !== actor.id) {
      response.status(403).json({ message: "Members can only add people under their own circle" });
      return;
    }
    body.invitedById = actor.id;
  }

  const passwordHash = await hashPassword(body.password);
  const member = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      role: body.role,
      invitedById: body.invitedById,
      passwordHash,
      inviteCode: `YC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    },
    select: {
      ...userSelect,
      invitedBy: { select: userSelect },
      invitedMembers: { select: userSelect }
    }
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
    select: {
      ...userSelect,
      invitedMembers: {
        orderBy: { joinedAt: "desc" },
        select: { ...userSelect, invitedMembers: { select: userSelect } }
      },
      invitedBy: { select: userSelect }
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
    include: { createdBy: { select: userSelect }, approval: true }
  });

  response.json(announcements);
});

app.post("/announcements", requireRole("ADMIN", "BOARD"), async (request, response) => {
  const body = z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    category: z.enum(["EVENTS", "URGENT", "OPPORTUNITIES"]),
    publishNow: z.boolean().default(false)
  }).parse(request.body);

  const actor = request.user!;

  const announcement = await db.announcement.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category,
      createdById: actor.id,
      publishedAt: body.publishNow ? new Date() : null,
      approval: {
        create: {
          type: "announcement",
          status: body.publishNow ? "APPROVED" : "PENDING",
          reviewerId: body.publishNow ? actor.id : undefined,
          reviewedAt: body.publishNow ? new Date() : undefined
        }
      }
    },
    include: { createdBy: { select: userSelect }, approval: true }
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

  const users = await db.user.findMany({ where: { id: { in: leaderboard.map((entry) => entry.userId) } }, select: userSelect });
  const ranked = leaderboard.map((entry, index) => ({
    rank: index + 1,
    points: entry._sum.points ?? 0,
    user: users.find((user) => user.id === entry.userId)
  }));

  response.json(ranked);
});

app.post("/rewards", requireRole("ADMIN", "BOARD"), async (request, response) => {
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
    include: { attendance: { include: { user: { select: userSelect } } } }
  });

  response.json(meetings);
});

app.post("/meetings", requireRole("ADMIN", "BOARD"), async (request, response) => {
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

app.get("/approvals", requireRole("ADMIN", "BOARD"), async (_request, response) => {
  const approvals = await db.approval.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { announcement: true, event: true }
  });

  response.json(approvals);
});

app.patch("/approvals/:id", requireRole("ADMIN", "BOARD"), async (request, response) => {
  const body = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().optional()
  }).parse(request.body);

  const approval = await db.approval.update({
    where: { id: String(request.params.id) },
    data: { status: body.status, reviewerId: request.user!.id, note: body.note, reviewedAt: new Date() }
  });

  response.json(approval);
});

app.get("/messages", requireRole("ADMIN", "BOARD"), async (request, response) => {
  const channel = typeof request.query.channel === "string" ? request.query.channel : "general";
  const messages = await db.message.findMany({
    where: { channel },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { sender: { select: userSelect } }
  });

  response.json(messages);
});

app.get("/board", requireRole("ADMIN", "BOARD"), async (_request, response) => {
  const board = await db.user.findMany({
    where: { role: "BOARD" },
    orderBy: { name: "asc" },
    select: userSelect
  });

  response.json(board);
});

app.patch("/members/:id", requireRole("ADMIN"), async (request, response) => {
  const body = z.object({
    role: z.enum(["ADMIN", "BOARD", "MEMBER"]).optional(),
    isActive: z.boolean().optional()
  }).refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "Provide at least one of role or isActive"
  }).parse(request.body);

  const actor = request.user!;
  const targetId = String(request.params.id);

  if (targetId === actor.id && (body.role !== undefined || body.isActive === false)) {
    response.status(400).json({ message: "You cannot change your own role or deactivate your own account" });
    return;
  }

  const updated = await db.user.update({
    where: { id: targetId },
    data: body,
    select: userSelect
  });

  await db.activity.create({
    data: {
      userId: actor.id,
      action: "member_updated",
      metadata: { memberId: updated.id, memberName: updated.name, changes: body }
    }
  });

  response.json(updated);
});

app.get("/activity", requireRole("ADMIN", "BOARD"), async (_request, response) => {
  const activity = await db.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: userSelect } }
  });

  response.json(activity);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = typeof token === "string" ? verifyToken(token) : null;

  if (!user) {
    next(new Error("Authentication required"));
    return;
  }

  socket.data.user = user;
  next();
});

io.on("connection", (socket) => {
  socket.on("join:announcements", () => socket.join("announcements"));

  socket.on("join:board", (channel: string = "general") => {
    if (socket.data.user.role !== "ADMIN" && socket.data.user.role !== "BOARD") {
      return;
    }
    socket.join(`board:${channel}`);
  });

  socket.on("board:message", async (payload: { channel: string; message: string }) => {
    if (socket.data.user.role !== "ADMIN" && socket.data.user.role !== "BOARD") {
      return;
    }

    try {
      const message = await db.message.create({
        data: { senderId: socket.data.user.id, channel: payload.channel, message: payload.message },
        include: { sender: { select: userSelect } }
      });
      io.to(`board:${payload.channel}`).emit("board:message", message);
    } catch (error) {
      console.error("board:message failed", error);
      socket.emit("board:message:error", { message: "Could not send message" });
    }
  });
});

app.use((_request, response) => {
  response.status(404).json({ message: "Not found" });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      message: error.issues[0]?.message ?? "Invalid request",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "field";
      response.status(409).json({ message: `A record with this ${target} already exists` });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({ message: "Record not found" });
      return;
    }
  }

  console.error(error);
  response.status(500).json({ message: "Something went wrong. Please try again." });
});

server.listen(port, () => {
  console.log(`NGO API listening on http://localhost:${port}`);
});
