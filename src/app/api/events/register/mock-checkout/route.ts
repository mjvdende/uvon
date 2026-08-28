import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import nodemailer from "nodemailer";

// GET handler returns a premium simulated checkout page
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response("Missing registration ID", { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: true,
        user: true,
      },
    });

    if (!registration) {
      return new Response("Registration not found", { status: 404 });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mollie Simuleer Betaling - UVON Noord-Brabant</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
          }
          h1, h2, h3 {
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
        </style>
      </head>
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl max-w-md w-full relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-800 to-indigo-600"></div>
          
          <div className="text-center mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              Mollie Sandbox (Simulatie)
            </span>
            <h1 className="text-xl font-bold mt-4 text-slate-800">Simuleer betaling voor UVON</h1>
            <p className="text-xs text-slate-400 mt-1">U bevindt zich in de lokale test-omgeving</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 text-sm text-slate-600 space-y-2">
            <p><strong>Bijeenkomst:</strong> <span className="text-slate-800">${registration.event.title}</span></p>
            <p><strong>Naam:</strong> <span className="text-slate-800">${registration.user.name}</span></p>
            <p><strong>E-mail:</strong> <span className="text-slate-800">${registration.user.email}</span></p>
            <p><strong>Te betalen bedrag:</strong> <span className="text-purple-800 font-bold text-base">€ ${registration.event.price.toFixed(2)}</span></p>
          </div>

          <form action="/api/events/register/mock-checkout" method="POST" className="space-y-3">
            <input type="hidden" name="registrationId" value="${registration.id}" />
            
            <button
              type="submit"
              name="status"
              value="paid"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow transition-colors flex items-center justify-center text-sm"
            >
              Simuleer Betaling Gelukt (PAID)
            </button>
            
            <button
              type="submit"
              name="status"
              value="failed"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow transition-colors flex items-center justify-center text-sm"
            >
              Simuleer Betaling Mislukt (FAILED)
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400 mt-6 leading-relaxed">
            Als er geldige Mollie API-keys in de .env-configuratie worden ingevuld, zal deze test-pagina automatisch worden vervangen door de echte Mollie-betaalomgeving.
          </p>
        </div>
      </body>
      </html>
    `;

    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error generating mock checkout screen:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// POST handler processes mock payment, updates DB, sends mail and redirects
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const registrationId = formData.get("registrationId") as string;
    const paymentStatus = formData.get("status") as string;

    if (!registrationId || !paymentStatus) {
      return new Response("Missing parameters", { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        user: true,
      },
    });

    if (!registration) {
      return new Response("Registration not found", { status: 404 });
    }

    const appUrl = process.env.NEXTAUTH_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") 
      || "http://localhost:3000";

    if (paymentStatus === "paid") {
      // Update DB to PAID
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: "PAID" },
      });

      // Send confirmation email
      await sendConfirmationEmail(
        registration.user.name,
        registration.user.email,
        registration.event.title,
        registration.event.location,
        registration.event.date
      );

      // Redirect back with success indicator
      return NextResponse.redirect(`${appUrl}/evenementen/${registration.event.id}?payment=success`);
    } else {
      // Update DB to FAILED
      await prisma.registration.update({
        where: { id: registrationId },
        data: { status: "FAILED" },
      });

      // Redirect back with failure indicator
      return NextResponse.redirect(`${appUrl}/evenementen/${registration.event.id}?payment=failed`);
    }
  } catch (error) {
    console.error("Error processing mock payment POST:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// SMTP Mail confirmation copy from main register route
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
