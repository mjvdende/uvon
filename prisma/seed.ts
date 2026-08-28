import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string defined (POSTGRES_PRISMA_URL or DATABASE_URL).");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.document.deleteMany();

  // Hash passwords
  const passwordHash = await bcrypt.hash("wachtwoord123", 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@uvonnoordbrabant.nl",
      passwordHash,
      name: "Sabine de Wit",
      companyName: "De Wit Organisatieadvies",
      businessSector: "Organisatieadvies",
      description: "Voorzitter van UVON Noord-Brabant en adviseur voor groeiende ondernemingen.",
      role: "ADMIN",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300",
      website: "https://dewitorganisatieadvies.nl",
      linkedin: "https://linkedin.com/in/sabine-de-wit",
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: "marieke@vandevenconsultancy.nl",
      passwordHash,
      name: "Marieke van de Ven",
      companyName: "Van de Ven Consultancy",
      businessSector: "Zakelijke dienstverlening",
      description: "Business coach gespecialiseerd in vrouwelijke leiderschap en schaalbare bedrijfsmodellen.",
      role: "MEMBER",
      photoUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300",
      website: "https://vandevenconsultancy.nl",
      linkedin: "https://linkedin.com/in/marieke-van-de-ven",
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: "esther@deboeradvocaten.nl",
      passwordHash,
      name: "Esther de Boer",
      companyName: "De Boer & Partners Advocaten",
      businessSector: "Juridische dienstverlening",
      description: "Advocaat intellectueel eigendom en ondernemingsrecht voor het MKB.",
      role: "MEMBER",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
      website: "https://deboeradvocaten.nl",
      linkedin: "https://linkedin.com/in/esther-de-boer",
    },
  });

  const member3 = await prisma.user.create({
    data: {
      email: "sandra@janssendesign.nl",
      passwordHash,
      name: "Sandra Janssen",
      companyName: "Janssen Design",
      businessSector: "Creative Design",
      description: "Grafisch vormgever en brand strategist met passie voor authentieke merkidentiteiten.",
      role: "MEMBER",
      photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
      website: "https://janssendesign.nl",
      linkedin: "https://linkedin.com/in/sandra-janssen",
    },
  });

  console.log("Users created:", { admin: admin.email, member1: member1.email, member2: member2.email, member3: member3.email });

  // 2. Create Events
  const event1 = await prisma.event.create({
    data: {
      title: "juni 2026 zomer: Zoet & Zacht – meesterschap en paardenkracht",
      description: "Met veel plezier nodigen wij jullie uit voor het jaarlijkse zomeruitje van UVON Noord-Brabant. Dit jaar belooft het een bijzondere en inspirerende dag te worden. We bezoeken een ambachtelijke imkerij in de middag, gevolgd door een interactieve sessie over persoonlijk leiderschap met paarden-coaching. We sluiten af met een heerlijk driegangendiner op locatie.",
      date: new Date("2026-06-30T00:00:00.000Z"),
      startTime: "13:00",
      endTime: "21:30",
      location: "Hoeve de Biest, Oirschot",
      price: 75.0,
      maxParticipants: 40,
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      published: true,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: "UVON & NOVO special edition met Charles Groenhuijsen",
      description: "De apenrots wankelt: Nieuwe kansen voor vrouwen én mannen. Worden vrouwen de baas in de wereld? Kortgeleden was die gedachte nog ronduit idioot. Nu niet meer. Journalist en schrijver Charles Groenhuijsen neemt ons mee in de verschuivingen in de maatschappij, gebaseerd op zijn nieuwste boek. Een prikkelende en interactieve avond georganiseerd in samenwerking met NOVO.",
      date: new Date("2026-10-07T00:00:00.000Z"),
      startTime: "17:30",
      endTime: "21:30",
      location: "De Verspillingsfabriek, Veghel",
      price: 75.0,
      maxParticipants: 100,
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      published: true,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: "UVON event oktober '26",
      description: "Netwerkbijeenkomst en lezing over de Brabantse economie en de kansen voor vrouwelijke ondernemers. Spreker wordt binnenkort bekend gemaakt.",
      date: new Date("2026-10-27T00:00:00.000Z"),
      startTime: "19:00",
      endTime: "22:00",
      location: "Hotel van der Valk, Eindhoven",
      price: 0.0,
      maxParticipants: 60,
      published: true,
    },
  });

  const event4 = await prisma.event.create({
    data: {
      title: "UVON kerstdiner '26",
      description: "Het jaarlijkse kerstdiner exclusief voor UVON-leden en genodigden. We kijken terug op een mooi verenigingsjaar onder het genot van goed eten, live muziek en feestelijke gezelligheid.",
      date: new Date("2026-11-24T00:00:00.000Z"),
      startTime: "18:00",
      endTime: "23:00",
      location: "Kasteel Maurick, Vught",
      price: 95.0,
      published: true,
    },
  });

  console.log("Events created:", { event1: event1.title, event2: event2.title });

  // 3. Create Registrations (for testing)
  await prisma.registration.create({
    data: {
      userId: member1.id,
      eventId: event1.id,
      status: "PAID",
      molliePaymentId: "tr_test_payment_1",
    },
  });

  await prisma.registration.create({
    data: {
      userId: member2.id,
      eventId: event1.id,
      status: "PENDING",
      molliePaymentId: "tr_test_payment_2",
    },
  });

  await prisma.registration.create({
    data: {
      userId: member3.id,
      eventId: event2.id,
      status: "PAID",
      molliePaymentId: "tr_test_payment_3",
    },
  });

  // 4. Create Documents
  await prisma.document.create({
    data: {
      title: "Notulen Algemene Ledenvergadering Maart 2026",
      fileUrl: "/documents/notulen_alv_maart_2026.pdf",
      category: "MINUTES",
    },
  });

  await prisma.document.create({
    data: {
      title: "Financieel Jaarverslag 2025",
      fileUrl: "/documents/financieel_jaarverslag_2025.pdf",
      category: "FINANCIAL",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
