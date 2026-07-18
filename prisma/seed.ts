import { PrismaClient, type Role } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Demo!Passw0rd2026";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  }

  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function upsertAuthUser(supabaseAdmin: SupabaseClient, email: string) {
  const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Could not list Supabase auth users: ${listError.message}`);
  }

  const found = existing.users.find((user) => user.email === email);
  if (found) return found;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true
  });

  if (error || !data.user) {
    throw new Error(`Could not create Supabase auth user for ${email}: ${error?.message}`);
  }

  return data.user;
}

async function upsertProfile(
  supabaseAdmin: SupabaseClient,
  input: { name: string; email: string; role: Role; points?: number; invitedById?: string }
) {
  const authUser = await upsertAuthUser(supabaseAdmin, input.email);

  return prisma.user.upsert({
    where: { email: input.email },
    update: { authUserId: authUser.id },
    create: {
      name: input.name,
      email: input.email,
      role: input.role,
      points: input.points ?? 0,
      invitedById: input.invitedById,
      authUserId: authUser.id
    }
  });
}

async function main() {
  const supabaseAdmin = getSupabaseAdmin();

  const master = await upsertProfile(supabaseAdmin, { name: "Master Account", email: "master@demo.com", role: "MASTER" });
  const president = await upsertProfile(supabaseAdmin, { name: "Club President", email: "president@demo.com", role: "PRESIDENT" });
  const admin = await upsertProfile(supabaseAdmin, { name: "Operations Admin", email: "admin@demo.com", role: "ADMIN" });

  const committee = await Promise.all(
    ["Aina Rahman", "Daniel Lee", "Priya Kumar", "Marcus Tan", "Sofia Noor", "Hafiz Omar", "Mei Wong"].map((name, index) =>
      upsertProfile(supabaseAdmin, { name, email: `committee${index + 1}@demo.com`, role: "PRESIDENT" })
    )
  );

  const memberNames = ["Nadia", "Ethan", "Irfan", "Leah", "Arjun", "Chloe", "Ravi", "Maya", "Yusuf", "Grace", "Jun"];
  const members = await Promise.all(
    memberNames.map((name, index) =>
      upsertProfile(supabaseAdmin, {
        name,
        email: index === 0 ? "member@demo.com" : `${name.toLowerCase()}@members.demo`,
        role: "MEMBER",
        points: 40 + index * 12,
        invitedById: index > 2 ? undefined : admin.id
      })
    )
  );

  await prisma.announcement.create({
    data: {
      title: "Youth volunteer drive opens this Friday",
      content: "Members can register for the community clean-up and mentorship booths.",
      category: "EVENTS",
      createdById: admin.id,
      publishedAt: new Date(),
      approval: { create: { type: "announcement", status: "APPROVED", reviewerId: president.id, reviewedAt: new Date() } }
    }
  });

  await prisma.meeting.create({
    data: {
      title: "May Committee Planning",
      agenda: "Review youth engagement, event approvals, and monthly rewards.",
      startsAt: new Date("2026-05-08T19:30:00+08:00"),
      endsAt: new Date("2026-05-08T20:30:00+08:00"),
      location: "Club office",
      createdBy: president.id,
      attendance: {
        create: committee.map((member) => ({ userId: member.id }))
      }
    }
  });

  await prisma.event.create({
    data: {
      title: "Community Service Saturday",
      description: "Volunteer teams support local families and earn contribution points.",
      location: "Community Hall",
      startsAt: new Date("2026-05-16T09:00:00+08:00"),
      endsAt: new Date("2026-05-16T13:00:00+08:00"),
      approval: { create: { type: "event", status: "PENDING" } }
    }
  });

  await Promise.all(
    members.map((member, index) =>
      prisma.reward.create({
        data: {
          userId: member.id,
          points: 10 + index,
          reason: index % 2 === 0 ? "Volunteering" : "Event attendance",
          month: "2026-05"
        }
      })
    )
  );

  console.log(`Seed complete. Demo login password for all seeded accounts: ${DEMO_PASSWORD}`);
  console.log(`Master: ${master.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
