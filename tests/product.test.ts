import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedWorkspace,
  applyDemoAction,
  effectivePlan,
} from "../src/lib/product/demo";
import { signToken, readToken } from "../src/lib/product/tokens";
import { revenueSummary } from "../src/lib/product/revenue";

test("revenue excludes trials and avoids counting branch subscriptions twice", () => {
  const stats = revenueSummary([
    {
      id: "one",
      name: "One",
      plan: "ORGANISATION",
      status: "active",
      cycle: "yearly",
      members: 10,
    },
    {
      id: "two",
      name: "Two",
      plan: "NETWORK",
      status: "trialing",
      cycle: "monthly",
      members: 20,
    },
    {
      id: "branch",
      name: "Branch",
      plan: "ORGANISATION",
      status: "active",
      cycle: "yearly",
      members: 4,
      parentId: "one",
    },
  ]);
  assert.equal(stats.mrr, 32.5);
  assert.equal(stats.arr, 390);
  assert.equal(stats.paid, 1);
  assert.equal(stats.trial, 1);
});

test("verification tokens reject tampering, the wrong purpose, and expiry", () => {
  const original = process.env.YBNGO_SIGNING_SECRET;
  process.env.YBNGO_SIGNING_SECRET =
    "test-only-signing-secret-that-is-at-least-32-bytes";
  try {
    const token = signToken({
      kind: "card",
      organisationId: "club-a",
      id: "member-a",
      expires: Date.now() + 60000,
    });
    assert.equal(readToken(token, "card").organisationId, "club-a");
    assert.throws(() => readToken(token, "attendance"), /expired/);
    const [body, signature] = token.split(".");
    const altered = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    assert.throws(() => readToken(body + "." + altered, "card"), /invalid/);
    assert.throws(
      () =>
        readToken(
          signToken({
            kind: "card",
            organisationId: "club-a",
            id: "member-a",
            expires: Date.now() - 1,
          }),
          "card",
        ),
      /expired/,
    );
  } finally {
    if (original === undefined) delete process.env.YBNGO_SIGNING_SECRET;
    else process.env.YBNGO_SIGNING_SECRET = original;
  }
});

test("members and committee cannot grant staff access", () => {
  for (const role of [
    "MEMBER",
    "COMMITTEE",
    "PROGRAMME_MANAGER",
    "ADMIN",
  ] as const) {
    const data = seedWorkspace(undefined, role);
    assert.throws(
      () =>
        applyDemoAction(data, {
          type: "member.role",
          id: data.members[2].id,
          role: "ADMIN",
        }),
      /permission|owner/i,
    );
  }
});
test("an admin cannot change billing", () => {
  assert.throws(
    () =>
      applyDemoAction(seedWorkspace(undefined, "ADMIN"), {
        type: "billing.plan",
        plan: "NETWORK",
        cycle: "monthly",
      }),
    /owner/,
  );
});
test("attendance records cannot be duplicated", () => {
  const input = seedWorkspace();
  const action = {
    type: "attendance.mark",
    programmeId: input.programmes[0].id,
    userId: "demo-self",
  };
  const next = applyDemoAction(input, action);
  assert.equal(next.programmes[0].attendance.length, 1);
  assert.equal(input.programmes[0].attendance.length, 0);
  assert.throws(() => applyDemoAction(next, action), /already checked in/);
});
test("foreign-club programme identifiers are rejected", () => {
  const input = seedWorkspace("demo-hh-charity");
  const foreign = seedWorkspace("demo-youth-club");
  assert.throws(
    () =>
      applyDemoAction(input, {
        type: "attendance.mark",
        programmeId: foreign.programmes[0].id,
        userId: input.members[0].id,
      }),
    /active member and programme/,
  );
});
test("Community stops at 30 members and retains existing data", () => {
  let data = seedWorkspace();
  data.subscription = {
    ...data.subscription,
    plan: "COMMUNITY",
    status: "active",
  };
  for (
    let i = data.members.filter(
      (m) => !["PENDING", "REJECTED"].includes(m.status),
    ).length;
    i < 30;
    i++
  )
    data = applyDemoAction(data, {
      type: "member.add",
      name: `Test ${i}`,
      email: `test${i}@example.com`,
    });
  assert.equal(
    data.members.filter((m) => !["PENDING", "REJECTED"].includes(m.status))
      .length,
    30,
  );
  assert.throws(
    () =>
      applyDemoAction(data, {
        type: "member.add",
        name: "Over limit",
        email: "over@example.com",
      }),
    /30 members/,
  );
  const pending = data.members.find((m) => m.status === "PENDING")!;
  assert.throws(
    () =>
      applyDemoAction(data, {
        type: "member.status",
        id: pending.id,
        status: "ACTIVE",
      }),
    /30 members/,
  );
  assert.equal(
    data.members.filter((m) => !["PENDING", "REJECTED"].includes(m.status))
      .length,
    30,
  );
});
test("expired trials and failed payments return to Community without deleting records", () => {
  const data = seedWorkspace();
  const old = new Date(Date.now() - 8 * 86400000).toISOString();
  data.subscription.trialEnd = old;
  assert.equal(effectivePlan(data.subscription), "COMMUNITY");
  data.subscription.status = "past_due";
  data.subscription.graceEndsAt = new Date(Date.now() + 86400000).toISOString();
  assert.equal(effectivePlan(data.subscription), "PROFESSIONAL");
  data.subscription.graceEndsAt = old;
  assert.equal(effectivePlan(data.subscription), "COMMUNITY");
  assert.equal(data.members.length, 10);
});
test("unknown and incomplete subscription states do not enable premium features", () => {
  const data = seedWorkspace();
  assert.equal(
    effectivePlan({ ...data.subscription, status: "incomplete" }),
    "COMMUNITY",
  );
  assert.equal(
    effectivePlan({ ...data.subscription, plan: "INVALID" as never }),
    "COMMUNITY",
  );
});
test("committee can complete only their assigned tasks", () => {
  const data = seedWorkspace(undefined, "COMMITTEE");
  assert.throws(
    () => applyDemoAction(data, { type: "task.toggle", id: data.tasks[0].id }),
    /assigned tasks/,
  );
  assert.equal(
    applyDemoAction(data, { type: "task.toggle", id: data.tasks[1].id })
      .tasks[1].status,
    "DONE",
  );
});
test("full programmes reject a new registration", () => {
  const data = seedWorkspace(undefined, "MEMBER");
  data.programmes[1].capacity = 1;
  assert.throws(
    () =>
      applyDemoAction(data, { type: "register", id: data.programmes[1].id }),
    /full/,
  );
});
test("photo uploads and programme edits stay in the selected workspace", () => {
  const a = seedWorkspace("demo-hh-charity");
  const b = seedWorkspace("demo-youth-club");
  const next = applyDemoAction(a, {
    type: "programme.photo",
    programmeId: a.programmes[0].id,
    url: "data:image/png;base64,demo",
    size: 10,
  });
  assert.equal(next.programmes[0].photos.length, 1);
  assert.equal(b.programmes[0].photos.length, 0);
});
