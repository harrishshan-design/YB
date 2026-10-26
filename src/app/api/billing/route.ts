import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext } from "@/lib/product/server";
import { canBill } from "@/lib/product/types";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/payments";
import { paymentProvider } from "@/lib/product/payment-provider";
const schema = z.object({
  action: z.enum(["checkout", "portal", "cancel", "invoices"]),
  plan: z
    .enum(["COMMUNITY", "ORGANISATION", "PROFESSIONAL", "NETWORK"])
    .optional(),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});
export async function POST(request: Request) {
  try {
    const c = await workspaceContext(request);
    if (c.club.parentId)
      throw new ApiError(
        400,
        "Billing for this branch is managed from its parent organisation.",
      );
    if (!canBill(c.role))
      throw new ApiError(
        403,
        "Only the organisation owner can manage billing.",
      );
    const input = schema.parse(await request.json());
    let sub = await db.subscription.findFirst({
      where: { organisationId: c.organisationId },
      orderBy: { createdAt: "desc" },
    });
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    if (input.action === "cancel") {
      if (sub?.providerSubscriptionId) {
        if (!process.env.STRIPE_SECRET_KEY)
          throw new ApiError(503, "Billing is not connected yet.");
        await paymentProvider.cancel(sub.providerSubscriptionId);
      } else if (sub)
        await db.subscription.update({
          where: { id: sub.id },
          data: { cancelAtPeriodEnd: true },
        });
      await db.auditLog.create({
        data: {
          organisationId: c.organisationId,
          actorId: c.user.id,
          action: "Subscription cancellation scheduled",
          entityType: "subscription",
        },
      });
      return NextResponse.json({
        message: "Cancellation scheduled. Your records remain available.",
      });
    }
    if (!process.env.STRIPE_SECRET_KEY)
      throw new ApiError(
        503,
        "Online billing is being set up. Your current workspace and records remain available. Contact support to arrange an upgrade.",
      );
    if (input.action === "portal" || input.action === "invoices") {
      if (!sub?.providerCustomerId)
        throw new ApiError(
          400,
          "No billing account yet. Choose a paid plan to create one.",
        );
      return NextResponse.json({
        url: await paymentProvider.portal(
          sub.providerCustomerId,
          `${origin}/president?view=billing`,
        ),
      });
    }
    if (!input.plan || input.plan === "COMMUNITY")
      throw new ApiError(
        400,
        "Choose a paid plan, or schedule a downgrade to Community.",
      );
    if (
      sub?.providerSubscriptionId &&
      !["cancelled", "expired"].includes(sub.status.toLowerCase())
    ) {
      return NextResponse.json({
        url: await paymentProvider.portal(
          sub.providerCustomerId!,
          `${origin}/president?view=billing`,
        ),
      });
    }
    let customerId = sub?.providerCustomerId;
    if (
      sub?.providerSubscriptionId &&
      ["cancelled", "expired"].includes(sub.status.toLowerCase())
    ) {
      sub = await db.subscription.create({
        data: {
          organisationId: c.organisationId,
          plan: "COMMUNITY",
          status: "incomplete",
          providerCustomerId: customerId,
          createdBy: c.user.id,
        },
      });
    }
    if (!customerId) {
      const customer = await getStripe().customers.create(
        {
          email: c.club.contactEmail ?? c.user.email,
          name: c.club.name,
          metadata: { organisationId: c.organisationId },
        },
        { idempotencyKey: `ybngo-customer-${c.organisationId}` },
      );
      customerId = customer.id;
      if (sub)
        sub = await db.subscription.update({
          where: { id: sub.id },
          data: { providerCustomerId: customerId },
        });
      else
        sub = await db.subscription.create({
          data: {
            organisationId: c.organisationId,
            plan: "COMMUNITY",
            status: "active",
            providerCustomerId: customerId,
          },
        });
    }
    return NextResponse.json({
      url: await paymentProvider.checkout({
        organisationId: c.organisationId,
        customerId,
        plan: input.plan,
        cycle: input.cycle,
        origin,
      }),
    });
  } catch (error) {
    return respondToError(error);
  }
}
