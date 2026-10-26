import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { POST as applyPOST } from "../src/app/api/members/apply/route";
import { POST as registerPOST } from "../src/app/api/events/register/route";

describe("Membership Application API (/api/members/apply)", () => {
  test("rejects request if mandatory fields are missing", async () => {
    const req = new Request("http://localhost:3000/api/members/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Applicant",
        email: "applicant@example.com",
        // phone missing
        companyName: "Acme Corp",
        businessSector: "Tech",
        description: "",
      }),
    });

    const res = await applyPOST(req);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.error, "Alle verplichte velden moeten worden ingevuld.");
  });
});

describe("Event Registration API (/api/events/register)", () => {
  test("rejects request if eventId is missing", async () => {
    const req = new Request("http://localhost:3000/api/events/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isMember: false,
        name: "Guest User",
        email: "guest@example.com",
        phone: "0612345678",
      }),
    });

    const res = await registerPOST(req);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.error, "Alle verplichte velden moeten worden ingevuld.");
  });

  test("rejects guest registration if name or phone are missing", async () => {
    const req = new Request("http://localhost:3000/api/events/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: "some-event-id",
        isMember: false,
        name: "",
        email: "guest@example.com",
        phone: "",
      }),
    });

    const res = await registerPOST(req);
    assert.strictEqual(res.status, 400);

    const data = await res.json();
    assert.strictEqual(data.error, "Alle verplichte velden moeten worden ingevuld.");
  });
});
