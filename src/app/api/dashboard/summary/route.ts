import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, respondToError } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

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
      db.user.count({ where: { role: "MEMBER", isActive: true } }),
      db.user.count({ where: { role: "PRESIDENT", isActive: true } }),
      db.approval.count({ where: { status: "PENDING" } }),
      db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { createdBy: true } }),
      db.meeting.findMany({ orderBy: { startsAt: "asc" }, take: 5, include: { attendance: true } }),
      db.user.findMany({ where: { role: "MEMBER" }, orderBy: { points: "desc" }, take: 10 }),
      db.budget.aggregate({ _sum: { amount: true }, where: { status: "ACTIVE" } }),
      db.expense.count({ where: { status: "SUBMITTED" } }),
      db.grantApplication.count({ where: { status: { in: ["SUBMITTED", "DRAFT"] } } }),
      db.volunteerHour.aggregate({ _sum: { hours: true } }),
      db.caseComplaint.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
      db.programme.count({ where: { status: "ACTIVE" } })
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
