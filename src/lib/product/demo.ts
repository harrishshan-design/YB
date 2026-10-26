import type { Action, WorkspaceData, WorkspaceRole } from "./types";
import { canBill, canManage, canProgramme } from "./types";
import { getPlan, type PlanId } from "./plans";

export const DEMO_KEY = "ybngo.workspace.v3";
export const photos = {
  community: "/images/community.jpg",
  food: "/images/food-aid.jpg",
  youth: "/images/youth.jpg",
};
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};
export function seedWorkspace(
  clubId = "demo-hh-charity",
  role: WorkspaceRole = "OWNER",
): WorkspaceData {
  const youth = clubId === "demo-youth-club";
  const name = youth ? "Kelab Belia Kita" : "HH Charity";
  const people = [
    "Aisha Rahman",
    "Arvind Kumar",
    "Mei Ling Tan",
    "Siti Nurhaliza",
    "Daniel Lim",
    "Priya Devi",
    "Ahmad Hakim",
    "Sarah Lee",
    "Ravi Chandran",
    "Nur Aina",
  ];
  return {
    club: {
      id: clubId,
      name,
      description: youth
        ? "Young people making a difference, together."
        : "A little kindness. A stronger community.",
      inviteCode: youth ? "ORG-YOUTH" : "ORG-HHDEMO",
      type: youth ? "Youth club" : "Charitable organisation",
      state: youth ? "Kuala Lumpur" : "Selangor",
      registrationNo: "PPM-001-10-2024",
      email: youth ? "hello@belia.example" : "hello@hhcharity.example",
      phone: "+60 12 345 6789",
      logo: "",
      role,
    },
    members: people.map((n, i) => ({
      id: i === 0 ? "demo-self" : `${clubId}-person-${i}`,
      name: n,
      email: n.toLowerCase().replaceAll(" ", ".") + "@example.com",
      number: `YB-${String(i + 1).padStart(4, "0")}`,
      category:
        i === 0
          ? "Committee Member"
          : i % 3 === 0
            ? "Volunteer"
            : "Ordinary Member",
      role:
        i === 0 ? role : i === 1 ? "ADMIN" : i === 2 ? "COMMITTEE" : "MEMBER",
      status: i === 8 ? "PENDING" : i === 9 ? "INACTIVE" : "ACTIVE",
      joinedAt: day(-180 + i * 14),
      expiresAt: day(150),
      invitedById: i > 2 ? "demo-self" : null,
      hours: i === 0 ? 24 : 8 + i * 4,
      skills:
        i % 2 === 0 ? ["Event support", "Community outreach"] : ["Logistics"],
    })),
    programmes: [
      {
        id: `${clubId}-p1`,
        title: youth ? "Youth Community Day" : "Community Food Basket Drive",
        description:
          "A morning of packing essentials and bringing support to families in our community.",
        location: youth
          ? "Dewan Komuniti, Kuala Lumpur"
          : "Dewan Komuniti, Shah Alam",
        startsAt: day(5),
        endsAt: new Date(
          new Date(day(5)).getTime() + 4 * 3600000,
        ).toISOString(),
        capacity: 60,
        status: "ACTIVE",
        image: photos.food,
        objective:
          "Distribute 60 food baskets to families and strengthen local volunteer participation.",
        outcomes: "",
        challenges: "",
        recommendations: "",
        expenses: 0,
        photos: [],
        registrationIds: [
          "demo-self",
          `${clubId}-person-1`,
          `${clubId}-person-3`,
        ],
        attendance: [],
      },
      {
        id: `${clubId}-p2`,
        title: "Jom Bersih: Neighbourhood Clean-up",
        description:
          "Friends, neighbours and volunteers coming together for cleaner shared spaces.",
        location: "Taman Tasik, Petaling Jaya",
        startsAt: day(12),
        endsAt: new Date(
          new Date(day(12)).getTime() + 3 * 3600000,
        ).toISOString(),
        capacity: 40,
        status: "ACTIVE",
        image: photos.youth,
        objective: "Clean public spaces and encourage community stewardship.",
        outcomes: "",
        challenges: "",
        recommendations: "",
        expenses: 0,
        photos: [],
        registrationIds: [`${clubId}-person-2`],
        attendance: [],
      },
      {
        id: `${clubId}-p3`,
        title: "Back-to-School Essentials",
        description:
          "School supplies and a little encouragement for the year ahead.",
        location: "Pusat Komuniti, Klang",
        startsAt: day(-10),
        endsAt: new Date(
          new Date(day(-10)).getTime() + 4 * 3600000,
        ).toISOString(),
        capacity: 80,
        status: "COMPLETED",
        image: photos.community,
        objective:
          "Equip children from underserved families with essential school supplies.",
        outcomes:
          "Delivered school kits to 45 children with the support of community volunteers.",
        challenges: "Some families needed transport assistance.",
        recommendations:
          "Arrange a shared transport route for the next programme.",
        expenses: 2450,
        photos: [photos.community],
        registrationIds: people
          .slice(0, 7)
          .map((_, i) => (i === 0 ? "demo-self" : `${clubId}-person-${i}`)),
        attendance: people.slice(0, 6).map((_, i) => ({
          userId: i === 0 ? "demo-self" : `${clubId}-person-${i}`,
          checkedInAt: day(-10),
        })),
      },
    ],
    volunteerEntries: [
      {
        id: "vol-1",
        userId: "demo-self",
        programmeId: `${clubId}-p3`,
        hours: 4,
        date: day(-10),
        description: "Registration and school kit distribution",
      },
      {
        id: "vol-2",
        userId: `${clubId}-person-3`,
        programmeId: `${clubId}-p3`,
        hours: 5,
        date: day(-10),
        description: "Programme preparation and logistics",
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Confirm food basket suppliers",
        programmeId: `${clubId}-p1`,
        assignedTo: `${clubId}-person-1`,
        dueAt: day(2),
        status: "TODO",
      },
      {
        id: "task-2",
        title: "Prepare volunteer briefing",
        programmeId: `${clubId}-p1`,
        assignedTo: "demo-self",
        dueAt: day(3),
        status: "IN_PROGRESS",
      },
      {
        id: "task-3",
        title: "Approve October membership applications",
        programmeId: `${clubId}-p1`,
        assignedTo: "demo-self",
        dueAt: day(1),
        status: "TODO",
      },
    ],
    meetings: [
      {
        id: "meeting-1",
        title: "Monthly committee meeting",
        agenda:
          "Programme planning\nVolunteer assignments\nMembership applications",
        startsAt: day(3),
        location: "HH Charity office / Google Meet",
        minutes: "",
        status: "SCHEDULED",
      },
    ],
    documents: [
      {
        id: "doc-1",
        name: "Organisation constitution",
        category: "Governance",
        size: 0,
        createdAt: day(-30),
        status: "ACTIVE",
      },
      {
        id: "doc-2",
        name: "September committee minutes",
        category: "Meeting minutes",
        size: 0,
        createdAt: day(-20),
        status: "ACTIVE",
      },
    ],
    announcements: [
      {
        id: "news-1",
        title: "Together, we made 45 school days brighter.",
        content:
          "Thank you to everyone who helped with our Back-to-School programme. Your time and care made a real difference.",
        category: "EVENTS",
        createdAt: day(-2),
        status: "PUBLISHED",
      },
      {
        id: "news-2",
        title: "Volunteers needed for the food basket drive",
        content:
          "Our next programme is coming up. Register in Programmes and join the team.",
        category: "OPPORTUNITIES",
        createdAt: day(-1),
        status: "PUBLISHED",
      },
    ],
    audit: [
      {
        id: "audit-1",
        action: "Back-to-School Essentials completed",
        actor: "Aisha Rahman",
        createdAt: day(-10),
      },
      {
        id: "audit-2",
        action: "Food basket drive opened for registration",
        actor: "Arvind Kumar",
        createdAt: day(-3),
      },
      {
        id: "audit-3",
        action: "New membership application received",
        actor: "Ravi Chandran",
        createdAt: day(-1),
      },
    ],
    subscription: {
      plan: "PROFESSIONAL",
      status: "trialing",
      cycle: "monthly",
      periodEnd: day(14),
      trialEnd: day(14),
      cancelAtPeriodEnd: false,
      storageBytes: 0,
    },
    membershipTypes: [
      { name: "Ordinary Member", fee: 30, duration: 12 },
      { name: "Lifetime Member", fee: 300, duration: 0 },
      { name: "Student Member", fee: 10, duration: 12 },
      { name: "Volunteer", fee: 0, duration: 12 },
      { name: "Committee Member", fee: 30, duration: 12 },
      { name: "Honorary Member", fee: 0, duration: 12 },
    ],
  };
}

export function effectivePlan(
  subscription: WorkspaceData["subscription"],
  now = Date.now(),
): PlanId {
  if (
    subscription.cancelAtPeriodEnd &&
    subscription.periodEnd &&
    new Date(subscription.periodEnd).getTime() <= now
  )
    return "COMMUNITY";
  if (
    subscription.status === "trialing" &&
    subscription.trialEnd &&
    new Date(subscription.trialEnd).getTime() < now
  )
    return "COMMUNITY";
  if (
    ["cancelled", "expired"].includes(subscription.status) &&
    (!subscription.periodEnd ||
      new Date(subscription.periodEnd).getTime() < now)
  )
    return "COMMUNITY";
  if (
    ["past_due", "grace_period"].includes(subscription.status) &&
    (!subscription.graceEndsAt ||
      new Date(subscription.graceEndsAt).getTime() < now)
  )
    return "COMMUNITY";
  if (
    !["active", "trialing", "past_due", "grace_period", "cancelled"].includes(
      subscription.status,
    )
  )
    return "COMMUNITY";
  return getPlan(subscription.plan).id;
}

export function assertAction(
  data: WorkspaceData,
  action: Action,
  role: WorkspaceRole,
  userId: string,
) {
  const memberActions = [
    "register",
    "attendance.self",
    "volunteer.self",
    "profile.update",
  ];
  const programmeActions = [
    "programme.save",
    "programme.photo",
    "attendance.mark",
    "volunteer.add",
    "report.save",
    "task.save",
  ];
  if (action.type.startsWith("billing.")) {
    if (!canBill(role))
      throw new Error("Only the organisation owner can manage billing.");
    return;
  }
  if (memberActions.includes(action.type)) return;
  if (
    action.type === "task.toggle" &&
    (role === "COMMITTEE" || role === "PROGRAMME_MANAGER" || canManage(role))
  ) {
    const task = data.tasks.find((t) => t.id === action.id);
    if (!canManage(role) && task?.assignedTo !== userId)
      throw new Error("You can only update your assigned tasks.");
    return;
  }
  if (programmeActions.includes(action.type) && canProgramme(role)) return;
  if (!canManage(role))
    throw new Error("Your role does not have permission to make this change.");
}

export function resolveSubscription(
  subscription: WorkspaceData["subscription"],
): WorkspaceData["subscription"] {
  const plan = effectivePlan(subscription);
  if (plan === "COMMUNITY" && subscription.plan !== "COMMUNITY")
    return {
      ...subscription,
      plan,
      status: "active",
      trialEnd: null,
      periodEnd: null,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
    };
  return { ...subscription, plan };
}

export function applyDemoAction(
  input: WorkspaceData,
  action: Action,
  userId = "demo-self",
): WorkspaceData {
  const data = structuredClone(input);
  const role = data.club.role;
  assertAction(data, action, role, userId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const plan = getPlan(effectivePlan(data.subscription));
  const value = (key: string) => String(action[key] ?? "");
  const occupiedSlots =
    data.subscription.memberUsage ??
    data.members.filter((m) => !["PENDING", "REJECTED"].includes(m.status))
      .length;
  if (
    plan.id === "COMMUNITY" &&
    [
      "meeting.save",
      "meeting.minutes",
      "task.save",
      "membership.type",
      "member.role",
      "report.save",
    ].includes(action.type)
  )
    throw new Error(
      "This tool is available on the Organisation plan. Existing records remain available.",
    );
  if (
    action.type === "announcement.save" &&
    action.scheduledAt &&
    !["PROFESSIONAL", "NETWORK"].includes(plan.id)
  )
    throw new Error("Scheduled announcements are included in Professional.");
  if (action.type === "programme.photo") {
    const programme = data.programmes.find((p) => p.id === action.programmeId);
    if (!programme) throw new Error("Programme not found.");
    if (plan.id === "COMMUNITY")
      throw new Error(
        "Programme photo galleries are available on a paid plan.",
      );
    programme.photos.push(value("url"));
    data.subscription.storageBytes += Number(action.size) || 0;
  } else if (action.type === "member.add") {
    if (occupiedSlots >= plan.members)
      throw new Error(
        `Your ${plan.name} plan supports ${plan.members} members. View plans to add more capacity.`,
      );
    if (
      data.members.some(
        (m) => m.email.toLowerCase() === value("email").toLowerCase(),
      )
    )
      throw new Error("This email is already in your member directory.");
    data.members.push({
      id,
      name: value("name"),
      email: value("email"),
      number: `YB-${String(data.members.length + 1).padStart(4, "0")}`,
      category: value("category") || "Ordinary Member",
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: now,
      expiresAt: day(365),
      invitedById: userId,
      hours: 0,
      skills: [],
    });
    if (data.subscription.memberUsage !== undefined)
      data.subscription.memberUsage++;
  } else if (action.type === "membership.update") {
    const person = data.members.find((m) => m.id === action.id);
    if (!person) throw new Error("Member not found in this organisation.");
    if (!data.membershipTypes.some((t) => t.name === value("category")))
      throw new Error("Choose a membership type from this organisation.");
    person.category = value("category");
    person.expiresAt = value("expiresAt") || null;
  } else if (action.type === "member.status") {
    const person = data.members.find((m) => m.id === action.id);
    if (!person) throw new Error("Member not found.");
    if (
      ["PENDING", "REJECTED"].includes(person.status) &&
      !["PENDING", "REJECTED"].includes(value("status"))
    ) {
      if (occupiedSlots >= plan.members)
        throw new Error(
          `Your ${plan.name} plan supports ${plan.members} members. View plans before approving more members.`,
        );
      if (data.subscription.memberUsage !== undefined)
        data.subscription.memberUsage++;
    }
    if (person.id === userId)
      throw new Error("You cannot deactivate your own account.");
    if (person.role === "OWNER" && value("status") !== "ACTIVE")
      throw new Error("An organisation owner cannot be deactivated here.");
    person.status = value("status");
  } else if (action.type === "member.role") {
    if (!canBill(role))
      throw new Error("Only the organisation owner can assign permissions.");
    const person = data.members.find((m) => m.id === action.id);
    if (!person) throw new Error("Member not found.");
    if (person.id === userId)
      throw new Error("You cannot change your own owner permission.");
    const next = value("role") as WorkspaceRole;
    if (!["MEMBER", "COMMITTEE", "PROGRAMME_MANAGER", "ADMIN"].includes(next))
      throw new Error("Choose a valid organisation role.");
    if (
      next === "ADMIN" &&
      plan.admins !== null &&
      data.members.filter((m) => ["ADMIN", "OWNER"].includes(m.role)).length >=
        plan.admins
    )
      throw new Error("This plan's admin allowance is full.");
    person.role = next;
  } else if (action.type === "programme.save") {
    const existing = data.programmes.find((p) => p.id === action.id);
    if (
      !existing &&
      plan.programmes !== null &&
      data.programmes.filter(
        (p) => p.startsAt.slice(0, 7) === value("startsAt").slice(0, 7),
      ).length >= plan.programmes
    )
      throw new Error(
        "Community includes 3 programmes per month. View plans for unlimited programmes.",
      );
    const item = {
      id: existing?.id ?? id,
      title: value("title"),
      description: value("description"),
      location: value("location"),
      startsAt: value("startsAt"),
      endsAt: value("endsAt"),
      capacity: Number(action.capacity) || 60,
      status: value("status") || "ACTIVE",
      image: photos.food,
      objective: value("objective"),
      outcomes: value("outcomes"),
      challenges: value("challenges"),
      recommendations: value("recommendations"),
      expenses: Number(action.expenses) || 0,
      photos: existing?.photos ?? [],
      registrationIds: existing?.registrationIds ?? [],
      attendance: existing?.attendance ?? [],
    };
    if (existing) Object.assign(existing, item);
    else data.programmes.unshift(item);
  } else if (action.type === "register") {
    const programme = data.programmes.find((p) => p.id === action.id);
    if (!programme || programme.status !== "ACTIVE")
      throw new Error("Registration is closed.");
    if (programme.registrationIds.includes(userId))
      programme.registrationIds = programme.registrationIds.filter(
        (x) => x !== userId,
      );
    else {
      if (programme.registrationIds.length >= programme.capacity)
        throw new Error("This programme is full.");
      programme.registrationIds.push(userId);
    }
  } else if (action.type.startsWith("attendance.")) {
    const programme = data.programmes.find((p) => p.id === action.programmeId);
    const person = action.type === "attendance.self" ? userId : value("userId");
    if (
      !programme ||
      !data.members.some((m) => m.id === person && m.status === "ACTIVE")
    )
      throw new Error("Choose an active member and programme.");
    if (programme.attendance.some((a) => a.userId === person))
      throw new Error("This member has already checked in.");
    programme.attendance.push({ userId: person, checkedInAt: now });
  } else if (action.type.startsWith("volunteer.")) {
    if (plan.id === "COMMUNITY")
      throw new Error(
        "Volunteer management is available from the Organisation plan.",
      );
    const person = action.type === "volunteer.self" ? userId : value("userId");
    if (
      !data.members.some((m) => m.id === person) ||
      !data.programmes.some((p) => p.id === action.programmeId)
    )
      throw new Error("Choose a member and programme in this organisation.");
    if (Number(action.hours) <= 0 || Number(action.hours) > 24)
      throw new Error("Enter between 0 and 24 hours.");
    data.volunteerEntries.unshift({
      id,
      userId: person,
      programmeId: value("programmeId"),
      hours: Number(action.hours),
      date: value("date") || now,
      description: value("description"),
    });
  } else if (action.type === "task.save") {
    if (!data.programmes.some((p) => p.id === action.programmeId))
      throw new Error("Select a programme first.");
    data.tasks.unshift({
      id,
      title: value("title"),
      programmeId: value("programmeId"),
      assignedTo: value("assignedTo"),
      dueAt: value("dueAt"),
      status: "TODO",
    });
  } else if (action.type === "task.toggle") {
    const task = data.tasks.find((t) => t.id === action.id);
    if (task) task.status = task.status === "DONE" ? "TODO" : "DONE";
  } else if (action.type === "meeting.save") {
    data.meetings.unshift({
      id,
      title: value("title"),
      agenda: value("agenda"),
      startsAt: value("startsAt"),
      location: value("location"),
      minutes: "",
      status: "SCHEDULED",
    });
  } else if (action.type === "meeting.minutes") {
    const meeting = data.meetings.find((m) => m.id === action.id);
    if (meeting) meeting.minutes = value("minutes");
  } else if (action.type === "announcement.save") {
    data.announcements.unshift({
      id,
      title: value("title"),
      content: value("content"),
      category: value("category") || "EVENTS",
      createdAt: now,
      scheduledAt: value("scheduledAt"),
      status: value("scheduledAt") ? "SCHEDULED" : "PUBLISHED",
    });
  } else if (action.type === "organisation.save") {
    for (const key of [
      "name",
      "description",
      "email",
      "phone",
      "state",
      "registrationNo",
      "logo",
    ] as const)
      if (action[key] !== undefined) data.club[key] = value(key);
    if (action.organisationType) data.club.type = value("organisationType");
  } else if (action.type === "membership.type") {
    data.membershipTypes.push({
      name: value("name"),
      fee: Number(action.fee) || 0,
      duration: Number(action.duration) || 12,
    });
  } else if (action.type === "document.add") {
    if (
      data.subscription.storageBytes + Number(action.size) >
      plan.storage * 1e9
    )
      throw new Error("Your document storage allowance is full.");
    data.documents.unshift({
      id,
      name: value("name"),
      category: value("category"),
      size: Number(action.size),
      createdAt: now,
      url: value("url"),
      status: "ACTIVE",
    });
    data.subscription.storageBytes += Number(action.size);
  } else if (action.type === "document.delete") {
    const document = data.documents.find((d) => d.id === action.id);
    data.subscription.storageBytes = Math.max(
      0,
      data.subscription.storageBytes - (document?.size ?? 0),
    );
    data.documents = data.documents.filter((d) => d.id !== action.id);
  } else if (action.type === "billing.plan") {
    data.subscription = {
      ...data.subscription,
      plan: value("plan") as PlanId,
      cycle: value("cycle") === "yearly" ? "yearly" : "monthly",
      status: "active",
      trialEnd: null,
      periodEnd: day(value("cycle") === "yearly" ? 365 : 30),
      cancelAtPeriodEnd: false,
    };
  } else if (action.type === "billing.cancel") {
    data.subscription.cancelAtPeriodEnd = true;
  } else if (action.type === "profile.update") {
    const person = data.members.find((m) => m.id === userId);
    if (person) {
      person.name = value("name");
      person.skills = value("skills")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } else if (action.type !== "report.save") throw new Error("Unknown action.");
  data.audit.unshift({
    id,
    action:
      action.type.replaceAll(".", " ") +
      (action.title ? `: ${value("title")}` : ""),
    actor:
      data.members.find((m) => m.id === userId)?.name ?? "Organisation admin",
    createdAt: now,
  });
  return data;
}
