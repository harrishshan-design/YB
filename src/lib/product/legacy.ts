import { NextResponse } from "next/server";
import {
  workspaceContext,
  readWorkspace,
  visibleWorkspace,
  mutateWorkspace,
} from "./server";
import { ApiError, respondToError } from "@/lib/auth";
import { canManage, canProgramme } from "./types";
export async function legacyGet(request: Request, resource: string) {
  try {
    const c = await workspaceContext(request);
    const full = await readWorkspace(c);
    const data = visibleWorkspace(full, c.user.id);
    if (resource === "summary")
      return NextResponse.json({
        members: data.members.length,
        openProgrammes: data.programmes.filter((p) => p.status === "ACTIVE")
          .length,
        pendingApprovals: canManage(c.role)
          ? data.members.filter((m) => m.status === "PENDING").length
          : 0,
        openCases: 0,
        volunteerHours: data.volunteerEntries.reduce((n, v) => n + v.hours, 0),
        money: { approvedBudget: 0, expensesPending: 0, grantApplications: 0 },
      });
    if (resource === "members")
      return NextResponse.json(
        data.members.map((m) => ({
          ...m,
          points: 0,
          invitedBy: data.members.find((p) => p.id === m.invitedById)
            ? { name: data.members.find((p) => p.id === m.invitedById)!.name }
            : null,
        })),
      );
    if (resource === "announcements")
      return NextResponse.json(data.announcements);
    if (resource === "programmes") return NextResponse.json(data.programmes);
    if (resource === "meetings") {
      if (!canManage(c.role) && c.role !== "COMMITTEE")
        throw new ApiError(403, "Committee access is required.");
      return NextResponse.json(data.meetings);
    }
    throw new ApiError(404, "Resource not found.");
  } catch (error) {
    return respondToError(error);
  }
}
export async function legacyPost(request: Request, resource: string) {
  try {
    const c = await workspaceContext(request);
    const body = await request.json();
    const action =
      resource === "members"
        ? {
            type: "member.add",
            name: body.name,
            email: body.email,
            category: "Ordinary Member",
          }
        : resource === "announcements"
          ? {
              type: "announcement.save",
              title: body.title,
              content: body.content,
              category: body.category,
              scheduledAt: "",
            }
          : {
              type: "meeting.save",
              title: body.title,
              agenda: body.agenda,
              startsAt: body.startsAt,
              location: body.location ?? "Online",
            };
    await mutateWorkspace(c, action);
    const data = await readWorkspace(c);
    return NextResponse.json(
      resource === "members"
        ? data.members.find((m) => m.email === body.email)
        : resource === "announcements"
          ? data.announcements[0]
          : data.meetings.find((m) => m.title === body.title),
      { status: 201 },
    );
  } catch (error) {
    return respondToError(error);
  }
}
