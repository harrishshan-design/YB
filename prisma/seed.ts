import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@ngo.local" },
    update: {},
    create: { name: "Super Admin", email: "admin@ngo.local", role: "ADMIN", points: 0 }
  });

  const boardMembers = await Promise.all(
    ["Aina Rahman", "Daniel Lee", "Priya Kumar", "Marcus Tan", "Sofia Noor", "Hafiz Omar", "Mei Wong"].map((name, index) =>
      prisma.user.upsert({
        where: { email: `board${index + 1}@ngo.local` },
        update: {},
        create: { name, email: `board${index + 1}@ngo.local`, role: "BOARD" }
      })
    )
  );

  const members = await Promise.all(
    ["Nadia", "Ethan", "Irfan", "Leah", "Arjun", "Chloe", "Ravi", "Maya", "Yusuf", "Grace", "Jun"].map((name, index) =>
      prisma.user.upsert({
        where: { email: `${name.toLowerCase()}@members.local` },
        update: {},
        create: {
          name,
          email: `${name.toLowerCase()}@members.local`,
          role: "MEMBER",
          points: 40 + index * 12,
          invitedById: index > 2 ? undefined : admin.id
        }
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
      approval: { create: { type: "announcement", status: "APPROVED", reviewerId: boardMembers[0].id, reviewedAt: new Date() } }
    }
  });

  await prisma.meeting.create({
    data: {
      title: "May Board Planning",
      agenda: "Review youth engagement, event approvals, and monthly rewards.",
      startsAt: new Date("2026-05-08T19:30:00+08:00"),
      endsAt: new Date("2026-05-08T20:30:00+08:00"),
      location: "Club office",
      attendance: {
        create: boardMembers.map((member) => ({ userId: member.id }))
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
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
