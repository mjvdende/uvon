import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/contact/route";

describe("Contact Form API (/api/contact)", () => {
  test("returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "",
        subject: "Question",
        message: "",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.error, "Alle verplichte velden moeten worden ingevuld.");
  });

  test("returns 200 with success message on valid submission (mock SMTP fallback)", async () => {
    // Ensure mock email fallback by temporarily omitting SMTP_HOST
    const originalHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    try {
      const req = new Request("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Marieke de Boer",
          email: "marieke@example.com",
          subject: "Interesse in lidmaatschap",
          message: "Graag zou ik meer informatie ontvangen over de bijeenkomsten van UVON.",
        }),
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, "Bericht succesvol verzonden.");
    } finally {
      if (originalHost) {
        process.env.SMTP_HOST = originalHost;
      }
    }
  });
});
