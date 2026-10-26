import type Stripe from "stripe";
import { getStripe } from "@/lib/payments";
import { ApiError } from "@/lib/auth";
import { getPlan, type PlanId, type BillingCycle } from "./plans";
export interface PaymentProvider {
  checkout(input: {
    organisationId: string;
    customerId: string;
    plan: PlanId;
    cycle: BillingCycle;
    origin: string;
  }): Promise<string>;
  portal(customerId: string, returnUrl: string): Promise<string>;
  cancel(subscriptionId: string): Promise<void>;
  verify(payload: string, signature: string): Stripe.Event;
}
export const paymentProvider: PaymentProvider = {
  async checkout(input) {
    const plan = getPlan(input.plan);
    if (plan.monthly === 0)
      throw new ApiError(400, "Community doesn't require payment.");
    const amount =
      (input.cycle === "yearly" ? plan.yearly : plan.monthly) * 100;
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "subscription",
        customer: input.customerId,
        client_reference_id: input.organisationId,
        line_items: [
          {
            price_data: {
              currency: "myr",
              unit_amount: amount,
              recurring: {
                interval: input.cycle === "yearly" ? "year" : "month",
              },
              product_data: { name: `YBNGO ${plan.name}` },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            organisationId: input.organisationId,
            plan: input.plan,
            cycle: input.cycle,
          },
        },
        success_url: `${input.origin}/president?view=billing&checkout=success`,
        cancel_url: `${input.origin}/president?view=billing`,
        metadata: { organisationId: input.organisationId },
        payment_method_types: ["card"],
      },
      {
        idempotencyKey: `checkout-${input.organisationId}-${input.plan}-${input.cycle}-${new Date().toISOString().slice(0, 13)}`,
      },
    );
    if (!session.url) throw new ApiError(503, "Checkout couldn't be created.");
    return session.url;
  },
  async portal(customer, returnUrl) {
    return (
      await getStripe().billingPortal.sessions.create({
        customer,
        return_url: returnUrl,
      })
    ).url;
  },
  async cancel(id) {
    await getStripe().subscriptions.update(id, { cancel_at_period_end: true });
  },
  verify(payload, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
      throw new ApiError(503, "Payment webhooks are not configured.");
    return getStripe().webhooks.constructEvent(payload, signature, secret);
  },
};
