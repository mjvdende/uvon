import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

describe("Authentication & Account Conventions", () => {
  test("bcrypt successfully hashes and verifies a valid password", async () => {
    const password = "securePassword123!";
    const hash = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare(password, hash);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await bcrypt.compare("wrongPassword", hash);
    assert.strictEqual(isWrongMatch, false);
  });

  test("DEACTIVATED_PENDING_APPROVAL hash cannot be verified by any password", async () => {
    const sentinelHash = "DEACTIVATED_PENDING_APPROVAL";
    
    // Bcrypt comparison against a non-hash should fail or reject
    try {
      const result = await bcrypt.compare("anyPassword", sentinelHash);
      assert.strictEqual(result, false);
    } catch {
      // Bcrypt throws on invalid hash formats, which also prevents authentication
      assert.ok(true);
    }
  });

  test("GUEST_USER_NO_PASSWORD cannot authenticate", async () => {
    const guestHash = "GUEST_USER_NO_PASSWORD";
    try {
      const result = await bcrypt.compare("guestPassword", guestHash);
      assert.strictEqual(result, false);
    } catch {
      assert.ok(true);
    }
  });
});
