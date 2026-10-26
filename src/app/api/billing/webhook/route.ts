import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/payments";
import { paymentProvider } from "@/lib/product/payment-provider";
import { Prisma } from "@prisma/client";
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json(
      { message: "Signature required" },
      { status: 400 },
    );
  let event: Stripe.Event;
  try {
    event = paymentProvider.verify(await request.text(), sig);
  } catch {
    return NextResponse.json(
      { message: "Webhook verification failed" },
      { status: 400 },
    );
  }
  try {
    if (await db.paymentEvent.findUnique({ where: { id: event.id } }))
      return NextResponse.json({ received: true });
    const object = event.data.object as unknown as {
      id: string;
      object: string;
      subscription?: string;
      parent?: { subscription_details?: { subscription?: string } };
    };
    const subId =
      object.object === "subscription"
        ? object.id
        : (object.subscription ??
          object.parent?.subscription_details?.subscription);
    if (
      subId &&
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_failed",
        "invoice.paid",
        "checkout.session.completed",
      ].includes(event.type)
    ) {
      // Retrieve current provider state so an older callback cannot restore stale entitlements.
      const subscription = await getStripe().subscriptions.retrieve(subId);
      const metadata = subscription.metadata;
      const organisationId = metadata.organisationId;
      const plan = metadata.plan;
      if (
        !organisationId ||
        !["ORGANISATION", "PROFESSIONAL", "NETWORK"].includes(plan)
      )
        return NextResponse.json(
          { message: "Unknown subscription" },
          { status: 400 },
        );
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const existing = await db.subscription.findFirst({
        where: {
          organisationId,
          providerCustomerId: customerId,
          OR: [
            { providerSubscriptionId: subscription.id },
            { providerSubscriptionId: null },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      if (!existing)
        return NextResponse.json(
          { message: "Unrecognised billing account" },
          { status: 400 },
        );
      const item = subscription.items.data[0];
      const payload = {
        plan,
        billingCycle: metadata.cycle === "yearly" ? "yearly" : "monthly",
        status:
          subscription.status === "canceled"
            ? "cancelled"
            : subscription.status === "unpaid"
              ? "expired"
              : subscription.status,
        currentPeriodStart: item
          ? new Date(item.current_period_start * 1000)
          : null,
        currentPeriodEnd: item
          ? new Date(item.current_period_end * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        graceEndsAt: ["past_due", "unpaid"].includes(subscription.status)
          ? (existing.graceEndsAt ?? new Date(Date.now() + 7 * 86400000))
          : null,
        providerSubscriptionId: subscription.id,
      };
      await db.$transaction(async (tx) => {
        await tx.paymentEvent.create({ data: { id: event.id } });
        await tx.subscription.update({
          where: { id: existing.id },
          data: payload,
        });
        await tx.auditLog.create({
          data: {
            organisationId,
            action: `Billing: ${event.type}`,
            entityType: "subscription",
            entityId: existing.id,
            metadata: {
              previousStatus: existing.status,
              status: payload.status,
              previousPlan: existing.plan,
              plan: payload.plan,
            },
          },
        });
      });
    } else await db.paymentEvent.create({ data: { id: event.id } });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json({ received: true });
    console.error("Payment webhook processing failed", error);
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
