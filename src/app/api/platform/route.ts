import { NextResponse } from "next/server";
import { requireRole, respondToError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/product/plans";
import { effectivePlan } from "@/lib/product/demo";
import { revenueSummary } from "@/lib/product/revenue";
export async function GET() {
  try {
    await requireRole(["MASTER"]);
    const [clubs, subs] = await Promise.all([
      db.organisation.findMany({
        include: { _count: { select: { memberships: true } } },
      }),
      db.subscription.findMany({ orderBy: { createdAt: "desc" } }),
    ]);
    const organisations = clubs.map((c) => {
      let s = subs.find((s) => s.organisationId === c.id);
      let parent = c.parentId;
      const visited = new Set<string>();
      while (!s && parent && !visited.has(parent)) {
        visited.add(parent);
        s = subs.find((s) => s.organisationId === parent);
        parent = clubs.find((club) => club.id === parent)?.parentId ?? null;
      }
      const plan = s
        ? effectivePlan({
            plan: s.plan as "COMMUNITY",
            status: s.status.toLowerCase(),
            cycle: s.billingCycle === "yearly" ? "yearly" : "monthly",
            periodEnd: s.currentPeriodEnd?.toISOString() ?? null,
            trialEnd: s.trialEnd?.toISOString() ?? null,
            graceEndsAt: s.graceEndsAt?.toISOString() ?? null,
            cancelAtPeriodEnd: s.cancelAtPeriodEnd,
            storageBytes: 0,
          })
        : "COMMUNITY";
      return {
        id: c.id,
        name: c.name,
        plan,
        status: s?.status ?? "active",
        members: c._count.memberships,
        parentId: c.parentId,
        cycle: s?.billingCycle ?? "monthly",
      };
    });
    return NextResponse.json(revenueSummary(organisations), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return respondToError(error);
  }
}
