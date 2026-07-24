import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgScope, requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    const requester = await requireUser();
    const scope = orgScope(requester);
    const approvalScope = requester.role === "MASTER" ? {} : { announcement: { organisationId: requester.organisationId } };
    const volunteerScope = requester.role === "MASTER" ? {} : { volunteer: { user: { organisationId: requester.organisationId } } };

    const [
      members,
      presidents,
      pendingApprovals,
      announcements,
      meetings,
      leaderboard,
      budgetTotal,
      expensesPending,
      grantApplications,
      volunteerHours,
      openCases,
      openProgrammes
    ] = await Promise.all([
      db.user.count({ where: { role: "MEMBER", isActive: true, ...scope } }),
      db.user.count({ where: { role: "PRESIDENT", isActive: true, ...scope } }),
      db.approval.count({ where: { status: "PENDING", ...approvalScope } }),
      db.announcement.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: true } }),
      db.meeting.findMany({ where: scope, orderBy: { startsAt: "asc" }, take: 5, include: { attendance: true } }),
      db.user.findMany({ where: { role: "MEMBER", ...scope }, orderBy: { points: "desc" }, take: 10 }),
      db.budget.aggregate({ _sum: { amount: true }, where: { status: "ACTIVE", ...scope } }),
      db.expense.count({ where: { status: "SUBMITTED", ...scope } }),
      db.grantApplication.count({ where: { status: { in: ["SUBMITTED", "DRAFT"] }, ...scope } }),
      db.volunteerHour.aggregate({ _sum: { hours: true }, where: volunteerScope }),
      db.caseComplaint.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] }, ...scope } }),
      db.programme.count({ where: { status: "ACTIVE", ...scope } })
    ]);

    return NextResponse.json({
      members,
      presidents,
      pendingApprovals,
      openCases,
      openProgrammes,
      announcements,
      meetings,
      leaderboard,
      money: {
        approvedBudget: budgetTotal._sum.amount ?? 0,
        expensesPending,
        grantApplications
      },
      volunteerHours: volunteerHours._sum.hours ?? 0
    });
  } catch (error) {
    return respondToError(error);
  }
}
