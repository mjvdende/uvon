import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createMollieClient } from "@mollie/api-client";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, isMember, name, email, phone, companyName } = body;

    // Validate request
    if (!eventId || (!isMember && (!name || !email || !phone))) {
      return NextResponse.json({ error: "Alle verplichte velden moeten worden ingevuld." }, { status: 400 });
    }

    // Fetch the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Bijeenkomst niet gevonden." }, { status: 404 });
    }

    const today = new Date(new Date().setHours(0, 0, 0, 0));
    if (event.date < today) {
      return NextResponse.json({ error: "Deze bijeenkomst heeft al plaatsgevonden." }, { status: 400 });
    }

    let targetUserId = "";

    if (isMember) {
      // Find the member by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json({ error: "Lidmaatschapsaccount met dit e-mailadres niet gevonden." }, { status: 404 });
      }
      targetUserId = user.id;
    } else {
      // It is a guest registration.
      // Search if a user with this email already exists, otherwise create a guest record
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create an inactive guest account in the DB
        user = await prisma.user.create({
          data: {
            email,
            passwordHash: "GUEST_USER_NO_PASSWORD",
            name,
            companyName: companyName || null,
            businessSector: "Gast",
            description: `Gastregistratie voor telefoonnummer: ${phone}`,
            role: "MEMBER",
          },
        });
      }
      targetUserId = user.id;
    }

    // Check if registration already exists for this event and user
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_eventId: {
          userId: targetUserId,
          eventId,
        },
      },
    });

    if (existingRegistration) {
      if (existingRegistration.status === "PAID") {
        return NextResponse.json({ error: "Je bent al aangemeld en de betaling is reeds voltooid." }, { status: 400 });
      }
      // If pending or failed, we can re-create or reuse it. For simplicity, we delete the pending one and recreate it
      await prisma.registration.delete({
        where: { id: existingRegistration.id },
      });
    }

    // Create the registration record in status PENDING
    const registration = await prisma.registration.create({
      data: {
        userId: targetUserId,
        eventId,
        status: event.price === 0 ? "PAID" : "PENDING",
      },
      include: {
        user: true,
      },
    });

    // If event is free, directly complete the registration and return success
    if (event.price === 0) {
      // Send confirmation email
      await sendConfirmationEmail(registration.user.name, registration.user.email, event.title, event.location, event.date);
      return NextResponse.json({ success: true, message: "Aanmelding succesvol voltooid." });
    }

    // If event is paid, configure Mollie payment
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const appUrl = process.env.NEXTAUTH_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") 
      || "http://localhost:3000";

    if (mollieApiKey && mollieApiKey.startsWith("test_")) {
      try {
        const mollieClient = createMollieClient({ apiKey: mollieApiKey });

        const payment = await mollieClient.payments.create({
          amount: {
            currency: "EUR",
            value: event.price.toFixed(2),
          },
          description: `UVON Noord-Brabant: ${event.title}`,
          redirectUrl: `${appUrl}/evenementen/${event.id}?payment=success`,
          webhookUrl: `${appUrl}/api/events/webhook`,
          metadata: {
            registrationId: registration.id,
          },
        });

        // Save Mollie payment ID in the registration
        await prisma.registration.update({
          where: { id: registration.id },
          data: {
            molliePaymentId: payment.id,
          },
        });

        return NextResponse.json({ success: true, paymentUrl: payment.getCheckoutUrl() });
      } catch (err) {
        console.error("Mollie API Error, falling back to mock mode:", err);
      }
    }

    // Fallback to local Mock payment checkout if Mollie API Key is missing or fails
    console.warn("Mollie API key missing or failing. Running in MOCK payment mode.");
    const mockPaymentUrl = `${appUrl}/api/events/register/mock-checkout?id=${registration.id}`;
    
    // Save a mock payment ID
    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        molliePaymentId: `mock_tr_${registration.id}`,
      },
    });

    return NextResponse.json({ success: true, paymentUrl: mockPaymentUrl });
  } catch (error) {
    console.error("Error registering for event:", error);
    return NextResponse.json(
      { error: "Er is een serverfout opgetreden bij de inschrijving." },
      { status: 500 }
    );
  }
}

// Mail confirmation helper
async function sendConfirmationEmail(name: string, email: string, eventTitle: string, location: string, date: Date) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          password: SMTP_PASSWORD,
        },
      } as any);

      const formattedDate = date.toLocaleDateString("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await transporter.sendMail({
        from: `"UVON Noord-Brabant" <${SMTP_USER}>`,
        to: email,
        subject: `Bevestiging aanmelding: ${eventTitle}`,
        text: `Beste ${name},\n\nJe bent succesvol aangemeld voor de bijeenkomst "${eventTitle}".\n\nDetails:\nDatum: ${formattedDate}\nLocatie: ${location}\n\nWe kijken uit naar je komst!\n\nMet vriendelijke groet,\nBestuur UVON Noord-Brabant`,
        html: `
          <h3>Aanmeldingsbevestiging bijeenkomst</h3>
          <p>Beste <strong>${name}</strong>,</p>
          <p>Je bent succesvol aangemeld voor de bijeenkomst:</p>
          <blockquote style="font-size: 16px; font-weight: bold; color: #270d36; padding: 10px; border-left: 4px solid #ead5ff; background: #f9f6fc; margin: 15px 0;">
            ${eventTitle}
          </blockquote>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Locatie:</strong> ${location}</p>
          <br/>
          <p>We kijken uit naar je komst!</p>
          <br/>
          <p>Met vriendelijke groet,</p>
          <p><strong>Bestuur UVON Noord-Brabant</strong></p>
        `,
      });
      console.log(`Confirmation email sent to ${email}`);
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }
  } else {
    console.log(`[MOCK EMAIL SENT] To: ${email} | Subject: Bevestiging aanmelding: ${eventTitle}`);
  }
}
