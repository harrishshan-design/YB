import { db } from "@/lib/db";
import { ApiError, requireUser, resolveOrganisationId } from "@/lib/auth";
import type {
  WorkspaceData,
  WorkspaceRole,
  Action,
  ProgrammeItem,
  Person,
} from "./types";
import { canManage, canProgramme, canBill } from "./types";
import {
  effectivePlan,
  resolveSubscription,
  assertAction,
  applyDemoAction,
} from "./demo";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export async function workspaceContext(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    origin &&
    origin !== new URL(request.url).origin
  )
    throw new ApiError(
      403,
      "This request came from another website. Please try again from your workspace.",
    );
  const user = await requireUser();
  const organisationId = await resolveOrganisationId(user, request);
  if (!organisationId)
    throw new ApiError(404, "Create or join an organisation to get started.");
  const club = await db.organisation.findUnique({
    where: { id: organisationId },
    include: { profile: true },
  });
  if (!club || club.status !== "ACTIVE")
    throw new ApiError(404, "Organisation not found.");
  const membership = await db.organisationMembership.findUnique({
    where: { organisationId_userId: { organisationId, userId: user.id } },
  });
  if (membership && !["ACTIVE", "PENDING"].includes(membership.status))
    throw new ApiError(403, "Your membership is inactive.");
  const role: WorkspaceRole =
    user.role === "MASTER"
      ? "PLATFORM_ADMIN"
      : membership?.role === "OWNER"
        ? "OWNER"
        : membership?.role === "ADMIN"
          ? "ADMIN"
          : membership?.role === "COMMITTEE"
            ? "COMMITTEE"
            : membership?.role === "PROGRAMME_MANAGER"
              ? "PROGRAMME_MANAGER"
              : membership
                ? "MEMBER"
                : club.createdBy === user.id
                  ? "OWNER"
                  : user.organisationId === organisationId &&
                      user.role === "PRESIDENT"
                    ? "OWNER"
                    : user.organisationId === organisationId &&
                        user.role === "ADMIN"
                      ? "ADMIN"
                      : "MEMBER";
  return { user, club, organisationId, role, membership };
}
const iso = (date: Date | null | undefined) => date?.toISOString() ?? "";
function jsonObject(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export async function readWorkspace(
  context: Awaited<ReturnType<typeof workspaceContext>>,
): Promise<WorkspaceData> {
  const { organisationId, club, role } = context;
  const scope = { organisationId };
  const billingIds = [organisationId];
  let parentId = club.parentId;
  while (parentId && !billingIds.includes(parentId)) {
    billingIds.push(parentId);
    parentId =
      (
        await db.organisation.findUnique({
          where: { id: parentId },
          select: { parentId: true },
        })
      )?.parentId ?? null;
  }
  const [
    users,
    programmes,
    entries,
    tasks,
    meetings,
    documents,
    announcements,
    audit,
    subscription,
  ] = await Promise.all([
    db.user.findMany({
      where: { OR: [scope, { organisationMemberships: { some: scope } }] },
      include: {
        organisationMemberships: { where: scope },
        volunteerProfile: true,
      },
      orderBy: { joinedAt: "asc" },
    }),
    db.programme.findMany({
      where: scope,
      include: { registrations: true, attendanceRecords: true },
      orderBy: { startsAt: "desc" },
    }),
    db.volunteerHour.findMany({
      where: {
        programmeId: {
          in: (
            await db.programme.findMany({ where: scope, select: { id: true } })
          ).map((p) => p.id),
        },
      },
      include: { volunteer: true },
    }),
    db.programmeTask.findMany({
      where: { programme: scope },
      orderBy: { createdAt: "desc" },
    }),
    db.meeting.findMany({
      where: scope,
      include: { minutes: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { startsAt: "asc" },
    }),
    db.document.findMany({
      where: { ...scope, status: { not: "DELETED" } },
      orderBy: { createdAt: "desc" },
    }),
    db.announcement.findMany({ where: scope, orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.subscription.findFirst({
      where: { organisationId: { in: billingIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const meta = jsonObject(club.profile?.metadata);
  const members: Person[] = users.map((u, i) => {
    const m = u.organisationMemberships[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      number: m?.number ?? `YB-${String(i + 1).padStart(4, "0")}`,
      category: m?.category ?? "Ordinary Member",
      role:
        m?.role === "OWNER"
          ? "OWNER"
          : m?.role === "ADMIN"
            ? "ADMIN"
            : m?.role === "COMMITTEE"
              ? "COMMITTEE"
              : m?.role === "PROGRAMME_MANAGER"
                ? "PROGRAMME_MANAGER"
                : m
                  ? "MEMBER"
                  : u.id === club.createdBy
                    ? "OWNER"
                    : u.organisationId === organisationId && u.role === "ADMIN"
                      ? "ADMIN"
                      : "MEMBER",
      status: !u.isActive ? "INACTIVE" : (m?.status ?? "ACTIVE"),
      joinedAt: iso(m?.createdAt ?? u.joinedAt),
      expiresAt: iso(m?.expiresAt) || null,
      invitedById: u.invitedById,
      hours: entries
        .filter((e) => e.volunteer.userId === u.id)
        .reduce((n, e) => n + Number(e.hours), 0),
      skills: u.volunteerProfile?.skills ?? [],
    };
  });
  const output: WorkspaceData = {
    club: {
      id: club.id,
      parentId: club.parentId,
      name: club.name,
      description: club.description ?? "",
      inviteCode: club.inviteCode,
      type: String(meta.type ?? "Community organisation"),
      state: String(meta.state ?? ""),
      registrationNo: club.registrationNo ?? "",
      email: club.contactEmail ?? "",
      phone: club.profile?.phone ?? "",
      logo: club.profile?.logoUrl ?? "",
      role,
    },
    members,
    programmes: programmes.map((p) => {
      const d = jsonObject(p.details);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        location: p.location,
        startsAt: iso(p.startsAt),
        endsAt: iso(p.endsAt),
        capacity: p.capacity,
        status: p.status,
        image: String(d.image ?? "/images/community.jpg"),
        objective: String(d.objective ?? ""),
        outcomes: String(d.outcomes ?? ""),
        challenges: String(d.challenges ?? ""),
        recommendations: String(d.recommendations ?? ""),
        expenses: Number(d.expenses ?? 0),
        photos: Array.isArray(d.photos)
          ? d.photos.filter((v): v is string => typeof v === "string")
          : [],
        registrationIds: p.registrations
          .filter((r) => r.status !== "CANCELLED")
          .map((r) => r.userId),
        attendance: p.attendanceRecords.map((a) => ({
          userId: a.userId,
          checkedInAt: iso(a.checkedInAt),
          checkedOutAt: iso(a.checkedOutAt) || undefined,
        })),
      };
    }),
    volunteerEntries: entries.map((e) => ({
      id: e.id,
      userId: e.volunteer.userId,
      programmeId: e.programmeId ?? "",
      hours: Number(e.hours),
      date: iso(e.serviceDate),
      description: e.description ?? "",
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      programmeId: t.programmeId,
      assignedTo: t.assignedTo ?? "",
      dueAt: iso(t.dueAt),
      status: t.status,
    })),
    meetings: meetings.map((m) => ({
      id: m.id,
      title: m.title,
      agenda: m.agenda,
      startsAt: iso(m.startsAt),
      location: m.location ?? "",
      minutes: m.minutes[0]?.content ?? "",
      status: m.status,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      name: d.fileName,
      category: d.ownerType,
      size: d.size,
      storageKey: d.storageKey,
      status: d.status,
      createdAt: iso(d.createdAt),
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.category,
      createdAt: iso(a.createdAt),
      scheduledAt: iso(a.publishedAt),
      status:
        a.publishedAt && a.publishedAt > new Date() ? "SCHEDULED" : a.status,
    })),
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: users.find((u) => u.id === a.actorId)?.name ?? "YBNGO",
      createdAt: iso(a.createdAt),
    })),
    subscription: {
      plan:
        (subscription?.plan?.toUpperCase() as WorkspaceData["subscription"]["plan"]) ??
        "COMMUNITY",
      status: subscription?.status?.toLowerCase() ?? "active",
      cycle: subscription?.billingCycle === "yearly" ? "yearly" : "monthly",
      periodEnd: iso(subscription?.currentPeriodEnd) || null,
      trialEnd: iso(subscription?.trialEnd) || null,
      graceEndsAt: iso(subscription?.graceEndsAt) || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      storageBytes: documents.reduce((s, d) => s + d.size, 0),
      providerCustomerId: subscription?.providerCustomerId,
    },
    membershipTypes: Array.isArray(meta.membershipTypes)
      ? (meta.membershipTypes as WorkspaceData["membershipTypes"])
      : [
          { name: "Ordinary Member", fee: 0, duration: 12 },
          { name: "Volunteer", fee: 0, duration: 12 },
        ],
  };
  output.subscription = resolveSubscription(output.subscription);
  if (output.subscription.plan === "NETWORK") {
    const rootId = billingIds[billingIds.length - 1];
    const tree = await db.organisation.findMany({
      select: { id: true, parentId: true },
    });
    const networkIds = new Set([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of tree)
        if (
          node.parentId &&
          networkIds.has(node.parentId) &&
          !networkIds.has(node.id)
        ) {
          networkIds.add(node.id);
          changed = true;
        }
    }
    const [networkMembers, storage] = await Promise.all([
      db.organisationMembership.findMany({
        where: {
          organisationId: { in: [...networkIds] },
          status: { notIn: ["REJECTED", "PENDING"] },
        },
        select: { userId: true },
        distinct: ["userId"],
      }),
      db.document.aggregate({
        where: {
          organisationId: { in: [...networkIds] },
          status: { not: "DELETED" },
        },
        _sum: { size: true },
      }),
    ]);
    output.subscription.memberUsage = networkMembers.length;
    output.subscription.storageBytes = storage._sum.size ?? 0;
  }
  return output;
}

export function visibleWorkspace(
  data: WorkspaceData,
  userId: string,
): WorkspaceData {
  if (canManage(data.club.role)) return data;
  const staff = canProgramme(data.club.role) || data.club.role === "COMMITTEE";
  return {
    ...data,
    club: { ...data.club, inviteCode: "" },
    members: canProgramme(data.club.role)
      ? data.members
      : data.members.filter(
          (m) =>
            m.id === userId ||
            (data.club.role === "COMMITTEE" && m.role === "COMMITTEE"),
        ),
    programmes: data.programmes.filter(
      (p) => p.status !== "DRAFT" || canProgramme(data.club.role),
    ),
    volunteerEntries: canProgramme(data.club.role)
      ? data.volunteerEntries
      : data.volunteerEntries.filter((e) => e.userId === userId),
    tasks: data.tasks.filter((t) => t.assignedTo === userId),
    meetings: staff ? data.meetings : [],
    documents: staff
      ? data.documents.filter(
          (d) => !["Finance", "Membership"].includes(d.category),
        )
      : [],
    announcements: data.announcements.filter(
      (a) =>
        a.status === "PUBLISHED" &&
        (!a.scheduledAt || new Date(a.scheduledAt) <= new Date()),
    ),
    audit: [],
    subscription: { ...data.subscription, providerCustomerId: undefined },
    membershipTypes: data.membershipTypes,
  };
}

const text = z.string().trim().min(1).max(5000);
const identifier = z.string().min(1).max(100);
export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("membership.update"),
    id: identifier,
    category: text,
    expiresAt: z.union([z.literal(""), z.iso.datetime()]),
  }),
  z.object({
    type: z.literal("member.add"),
    name: text,
    email: z.email(),
    category: text.optional(),
  }),
  z.object({
    type: z.literal("member.status"),
    id: identifier,
    status: z.enum(["ACTIVE", "INACTIVE", "REJECTED"]),
  }),
  z.object({
    type: z.literal("member.role"),
    id: identifier,
    role: z.enum(["MEMBER", "COMMITTEE", "PROGRAMME_MANAGER", "ADMIN"]),
  }),
  z.object({
    type: z.literal("programme.save"),
    id: identifier.optional(),
    title: text,
    description: z.string().max(5000),
    location: text,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    capacity: z.number().int().min(1).max(100000),
    status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]),
    objective: z.string().max(5000).optional(),
    outcomes: z.string().max(5000).optional(),
    challenges: z.string().max(5000).optional(),
    recommendations: z.string().max(5000).optional(),
    expenses: z.number().min(0).optional(),
  }),
  z.object({ type: z.literal("register"), id: identifier }),
  z.object({
    type: z.literal("attendance.mark"),
    programmeId: identifier,
    userId: identifier,
  }),
  z.object({ type: z.literal("attendance.self"), programmeId: identifier }),
  z.object({
    type: z.literal("volunteer.add"),
    programmeId: identifier,
    userId: identifier,
    hours: z.number().positive().max(24),
    date: z.iso.datetime(),
    description: text,
  }),
  z.object({
    type: z.literal("volunteer.self"),
    programmeId: identifier,
    hours: z.number().positive().max(24),
    date: z.iso.datetime(),
    description: text,
  }),
  z.object({
    type: z.literal("task.save"),
    title: text,
    programmeId: identifier,
    assignedTo: identifier,
    dueAt: z.iso.datetime(),
  }),
  z.object({ type: z.literal("task.toggle"), id: identifier }),
  z.object({
    type: z.literal("meeting.save"),
    title: text,
    agenda: text,
    startsAt: z.iso.datetime(),
    location: text,
  }),
  z.object({
    type: z.literal("meeting.minutes"),
    id: identifier,
    minutes: text,
  }),
  z.object({
    type: z.literal("announcement.save"),
    title: text,
    content: text,
    category: z.enum(["EVENTS", "URGENT", "OPPORTUNITIES"]),
    scheduledAt: z.union([z.literal(""), z.iso.datetime()]).optional(),
  }),
  z.object({
    type: z.literal("organisation.save"),
    name: text,
    description: z.string().max(5000),
    email: z.email(),
    phone: z.string().max(50),
    state: z.string().max(100),
    organisationType: z.string().max(100).optional(),
    registrationNo: z.string().max(100).optional(),
    logo: z.string().max(500000).optional(),
  }),
  z.object({
    type: z.literal("membership.type"),
    name: text,
    fee: z.number().min(0),
    duration: z.number().int().min(0).max(120),
  }),
  z.object({
    type: z.literal("profile.update"),
    name: text,
    skills: z.string().max(1000),
  }),
  z.object({ type: z.literal("document.delete"), id: identifier }),
  z.object({ type: z.literal("report.save"), id: identifier }),
]);

export async function mutateWorkspace(
  context: Awaited<ReturnType<typeof workspaceContext>>,
  raw: unknown,
) {
  const action = actionSchema.parse(raw) as Action;
  const { user, organisationId, role, membership } = context;
  if (membership?.status === "PENDING" && action.type !== "profile.update")
    throw new ApiError(
      403,
      "Your membership application is awaiting approval.",
    );
  return db.$transaction(
    async (tx) => {
      // Serialise capacity and plan checks for every write within one organisation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organisationId}))`;
      const data = await readWorkspace(context);
      const value = (k: string) => String(action[k] ?? "");
      if (action.type === "organisation.save" && action.organisationType)
        action.organisationType = value("organisationType");
      // Reuse domain validation (duplicates, capacity, plan limits) for demo and live workspaces.
      try {
        assertAction(data, action, role, user.id);
        if (action.type !== "organisation.save")
          applyDemoAction(data, action, user.id);
      } catch (error) {
        throw new ApiError(
          400,
          error instanceof Error ? error.message : "Invalid change.",
        );
      }
      const scopedPerson = () => {
        const p = data.members.find((m) => m.id === action.id);
        if (!p)
          throw new ApiError(404, "Member not found in this organisation.");
        return p;
      };
      if (action.type === "member.add") {
        const existing = await tx.user.findUnique({
          where: { email: value("email").toLowerCase() },
        });
        const person =
          existing ??
          (await tx.user.create({
            data: {
              name: value("name"),
              email: value("email").toLowerCase(),
              organisationId,
              invitedById: user.id,
            },
          }));
        await tx.organisationMembership.create({
          data: {
            organisationId,
            userId: person.id,
            role: "MEMBER",
            number: `YB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            category: value("category") || "Ordinary Member",
            createdBy: user.id,
          },
        });
      } else if (action.type === "membership.update") {
        const person = scopedPerson();
        await tx.organisationMembership.upsert({
          where: {
            organisationId_userId: { organisationId, userId: person.id },
          },
          create: {
            organisationId,
            userId: person.id,
            category: value("category"),
            expiresAt: action.expiresAt ? new Date(value("expiresAt")) : null,
            role: "MEMBER",
          },
          update: {
            category: value("category"),
            expiresAt: action.expiresAt ? new Date(value("expiresAt")) : null,
          },
        });
      } else if (
        action.type === "member.status" ||
        action.type === "member.role"
      ) {
        const person = scopedPerson();
        const assignedRole =
          action.type === "member.role"
            ? (value("role") as
                "MEMBER" | "ADMIN" | "COMMITTEE" | "PROGRAMME_MANAGER")
            : undefined;
        await tx.organisationMembership.upsert({
          where: {
            organisationId_userId: { organisationId, userId: person.id },
          },
          create: {
            organisationId,
            userId: person.id,
            role: assignedRole ?? "MEMBER",
            status:
              action.type === "member.status" ? value("status") : person.status,
          },
          update:
            action.type === "member.status"
              ? { status: value("status") }
              : { role: assignedRole },
        });
      } else if (action.type === "programme.save") {
        const existing = action.id
          ? data.programmes.find((p) => p.id === action.id)
          : null;
        if (action.id && !existing)
          throw new ApiError(404, "Programme not found.");
        if (new Date(value("endsAt")) <= new Date(value("startsAt")))
          throw new ApiError(400, "End time must be after start time.");
        const payload = {
          title: value("title"),
          description: value("description"),
          location: value("location"),
          startsAt: new Date(value("startsAt")),
          endsAt: new Date(value("endsAt")),
          capacity: Number(action.capacity),
          status: value("status") as
            "ACTIVE" | "DRAFT" | "COMPLETED" | "ARCHIVED",
          details: {
            objective: value("objective"),
            outcomes: value("outcomes"),
            challenges: value("challenges"),
            recommendations: value("recommendations"),
            expenses: Number(action.expenses) || 0,
            photos: existing?.photos ?? [],
            image: existing?.image ?? "/images/community.jpg",
          },
        };
        if (existing)
          await tx.programme.update({
            where: { id: existing.id },
            data: payload,
          });
        else
          await tx.programme.create({
            data: { ...payload, organisationId, createdBy: user.id },
          });
      } else if (action.type === "register") {
        const p = data.programmes.find((p) => p.id === action.id)!;
        await tx.programmeRegistration.upsert({
          where: { programmeId_userId: { programmeId: p.id, userId: user.id } },
          create: { programmeId: p.id, userId: user.id, status: "CONFIRMED" },
          update: {
            status: p.registrationIds.includes(user.id)
              ? "CANCELLED"
              : "CONFIRMED",
          },
        });
      } else if (action.type.startsWith("attendance.")) {
        if (action.type === "attendance.self")
          throw new ApiError(400, "Use a programme's signed check-in link.");
        await tx.attendanceRecord.create({
          data: {
            programmeId: value("programmeId"),
            userId: value("userId"),
            checkedInAt: new Date(),
            createdBy: user.id,
          },
        });
      } else if (action.type.startsWith("volunteer.")) {
        const target =
          action.type === "volunteer.self" ? user.id : value("userId");
        const volunteer = await tx.volunteerProfile.upsert({
          where: { userId: target },
          create: { userId: target, skills: [] },
          update: {},
        });
        await tx.volunteerHour.create({
          data: {
            volunteerId: volunteer.id,
            programmeId: value("programmeId"),
            hours: Number(action.hours),
            serviceDate: new Date(value("date")),
            description: value("description"),
            createdBy: user.id,
          },
        });
      } else if (action.type === "task.save") {
        if (!data.members.some((p) => p.id === action.assignedTo))
          throw new ApiError(400, "Choose a member in this organisation.");
        await tx.programmeTask.create({
          data: {
            programmeId: value("programmeId"),
            title: value("title"),
            assignedTo: value("assignedTo"),
            dueAt: new Date(value("dueAt")),
            createdBy: user.id,
          },
        });
      } else if (action.type === "task.toggle") {
        const t = data.tasks.find((t) => t.id === action.id)!;
        await tx.programmeTask.update({
          where: { id: t.id },
          data: { status: t.status === "DONE" ? "TODO" : "DONE" },
        });
      } else if (action.type === "meeting.save") {
        await tx.meeting.create({
          data: {
            organisationId,
            title: value("title"),
            agenda: value("agenda"),
            location: value("location"),
            startsAt: new Date(value("startsAt")),
            endsAt: new Date(new Date(value("startsAt")).getTime() + 3600000),
            createdBy: user.id,
          },
        });
      } else if (action.type === "meeting.minutes") {
        if (!data.meetings.some((m) => m.id === action.id))
          throw new ApiError(404, "Meeting not found.");
        await tx.meetingMinute.create({
          data: {
            meetingId: value("id"),
            content: value("minutes"),
            createdBy: user.id,
          },
        });
      } else if (action.type === "announcement.save") {
        if (
          action.scheduledAt &&
          !["PROFESSIONAL", "NETWORK"].includes(data.subscription.plan)
        )
          throw new ApiError(
            403,
            "Scheduled announcements are included in Professional.",
          );
        await tx.announcement.create({
          data: {
            organisationId,
            title: value("title"),
            content: value("content"),
            category: value("category") as
              "EVENTS" | "URGENT" | "OPPORTUNITIES",
            createdById: user.id,
            status: "PUBLISHED",
            requiresApproval: false,
            publishedAt: action.scheduledAt
              ? new Date(value("scheduledAt"))
              : new Date(),
          },
        });
      } else if (
        action.type === "organisation.save" ||
        action.type === "membership.type"
      ) {
        const meta = jsonObject(context.club.profile?.metadata);
        if (action.type === "organisation.save") {
          await tx.organisation.update({
            where: { id: organisationId },
            data: {
              name: value("name"),
              description: value("description"),
              contactEmail: value("email"),
              registrationNo: value("registrationNo") || null,
            },
          });
          await tx.organisationProfile.upsert({
            where: { organisationId },
            create: {
              organisationId,
              phone: value("phone"),
              logoUrl: value("logo"),
              metadata: {
                ...meta,
                state: value("state"),
                type: value("organisationType"),
              } as Prisma.InputJsonValue,
            },
            update: {
              phone: value("phone"),
              logoUrl: value("logo"),
              metadata: {
                ...meta,
                state: value("state"),
                type: value("organisationType"),
              } as Prisma.InputJsonValue,
            },
          });
        } else {
          const types = [
            ...data.membershipTypes,
            {
              name: value("name"),
              fee: Number(action.fee),
              duration: Number(action.duration),
            },
          ];
          await tx.organisationProfile.upsert({
            where: { organisationId },
            create: {
              organisationId,
              metadata: {
                ...meta,
                membershipTypes: types,
              } as Prisma.InputJsonValue,
            },
            update: {
              metadata: {
                ...meta,
                membershipTypes: types,
              } as Prisma.InputJsonValue,
            },
          });
        }
      } else if (action.type === "profile.update") {
        await tx.user.update({
          where: { id: user.id },
          data: { name: value("name") },
        });
        await tx.volunteerProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            skills: value("skills")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          },
          update: {
            skills: value("skills")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          },
        });
      } else if (action.type === "document.delete") {
        const d = data.documents.find((d) => d.id === action.id);
        if (!d) throw new ApiError(404, "Document not found.");
        await tx.document.update({
          where: { id: d.id },
          data: { status: "DELETED" },
        });
      } else if (action.type === "report.save") {
        if (data.subscription.plan === "COMMUNITY")
          throw new ApiError(
            403,
            "Programme PDF reports are included in Organisation.",
          );
        const p = data.programmes.find((p) => p.id === action.id);
        if (!p) throw new ApiError(404, "Programme not found.");
        await tx.reportSnapshot.create({
          data: {
            name: p.title,
            scope: organisationId,
            metrics: p as unknown as Prisma.InputJsonValue,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          organisationId,
          actorId: user.id,
          action: action.type,
          entityType: action.type.split(".")[0],
          entityId: action.id ? value("id") : null,
        },
      });
    },
    { maxWait: 10000, timeout: 30000 },
  );
}
