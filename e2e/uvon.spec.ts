import { test, expect } from "@playwright/test";

test.describe("UVON Platform E2E Tests", () => {
  test("Homepage loads properly with brand header and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/UVON Noord-Brabant/);

    // Verify main brand presence
    const brandHeading = page.locator("h1");
    await expect(brandHeading).toBeVisible();

    // Verify key navigation items
    await expect(page.locator("nav")).toContainText("Agenda");
    await expect(page.locator("nav")).toContainText("Leden");
    await expect(page.locator("nav")).toContainText("Contact");
  });

  test("Ledenoverzicht (/leden) displays active members and supports search filtering", async ({ page }) => {
    await page.goto("/leden");
    await expect(page.locator("h1")).toContainText("Ledenoverzicht");

    // Verify that seeded member appears in directory
    await expect(page.getByText("Sabine de Wit")).toBeVisible();

    // Test client-side search input
    const searchInput = page.getByPlaceholder(/Zoek op naam, bedrijf/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Marieke");
    await expect(page.getByText("Marieke van de Ven")).toBeVisible();
    await expect(page.getByText("Sabine de Wit")).not.toBeVisible();
  });

  test("Agenda (/evenementen) displays upcoming bijeenkomsten and navigates to detail", async ({ page }) => {
    await page.goto("/evenementen");
    await expect(page.locator("h1")).toContainText("Agenda");

    // Upcoming events (e.g. kerstdiner or oktober)
    const eventCard = page.locator("article, div").filter({ hasText: /kerstdiner|oktober/i }).first();
    await expect(eventCard).toBeVisible();

    // Click on event detail
    await page.getByRole("link", { name: "Aanmelden" }).first().click();
    await page.waitForURL(/\/evenementen\/.+/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("Archive (/evenementen/archief) displays past bijeenkomsten", async ({ page }) => {
    await page.goto("/evenementen/archief");
    await expect(page.locator("h1")).toContainText("Archief");

    // Check that archived event appears in historical list
    await expect(page.getByText(/Charles Groenhuijsen|Zoet & Zacht/i).first()).toBeVisible();
  });

  test("Contact form page (/contact) renders with all required fields", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("h1")).toContainText(/contact/i);

    await expect(page.locator("input[name='name'], input[id='name']")).toBeVisible();
    await expect(page.locator("input[name='email'], input[id='email']")).toBeVisible();
    await expect(page.locator("textarea[name='message'], textarea[id='message']")).toBeVisible();
  });
});
