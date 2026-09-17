import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_PASSWORD_RECOVERY_CALLBACK_PATH,
  PASSWORD_RESET_REQUEST_CONFIRMATION,
  buildAdminRecoveryCallbackUrl,
  validatePasswordUpdate
} from "../src/admin/passwordRecovery.ts";

const loginForm = readFileSync("app/admin/login/admin-login-form.tsx", "utf8");
const loginPage = readFileSync("app/admin/login/page.tsx", "utf8");
const forgotPage = readFileSync("app/admin/forgot-password/page.tsx", "utf8");
const forgotForm = readFileSync("app/admin/forgot-password/forgot-password-form.tsx", "utf8");
const callbackRoute = readFileSync("app/admin/recover/callback/route.ts", "utf8");
const recoveryPage = readFileSync("app/admin/recover/page.tsx", "utf8");
const recoveryForm = readFileSync("app/admin/recover/recovery-password-form.tsx", "utf8");
const recoveryAction = readFileSync("app/admin/recover/actions.ts", "utf8");
const adminAuth = readFileSync("src/admin/adminAuth.ts", "utf8");

test("admin login exposes a focused forgot-password path", () => {
  assert.match(loginForm, /href="\/admin\/forgot-password"/);
  assert.match(loginForm, /Forgot password\?/);
  assert.match(forgotPage, /ForgotPasswordForm/);
});

test("password reset request uses Supabase with a controlled same-origin callback", () => {
  assert.match(forgotForm, /resetPasswordForEmail/);
  assert.match(forgotForm, /window\.location\.origin/);
  assert.match(forgotForm, /buildAdminRecoveryCallbackUrl/);
  assert.equal(forgotForm.includes("SUPABASE_SECRET_KEY"), false);
  assert.equal(forgotForm.includes("analytics"), false);

  assert.equal(
    buildAdminRecoveryCallbackUrl("http://localhost:3000/untrusted?next=https://attacker.example"),
    `http://localhost:3000${ADMIN_PASSWORD_RECOVERY_CALLBACK_PATH}`
  );
  assert.equal(
    buildAdminRecoveryCallbackUrl("https://mechanicmatchfl.example/anything"),
    `https://mechanicmatchfl.example${ADMIN_PASSWORD_RECOVERY_CALLBACK_PATH}`
  );
});

test("password reset request always presents a generic anti-enumeration response", () => {
  assert.match(forgotForm, /PASSWORD_RESET_REQUEST_CONFIRMATION/);
  assert.equal(
    PASSWORD_RESET_REQUEST_CONFIRMATION,
    "If an account exists for that email, a password reset link has been sent."
  );
  assert.doesNotMatch(forgotForm, /user.*exists|email.*registered/i);
});

test("recovery callback exchanges the PKCE code and collapses invalid links to a safe state", () => {
  assert.match(callbackRoute, /exchangeCodeForSession\(code/);
  assert.match(callbackRoute, /sb_flow_id/);
  assert.match(callbackRoute, /searchParams\.get\("error_code"\)/);
  assert.match(callbackRoute, /searchParams\.set\("error", "invalid-link"\)/);
  assert.match(callbackRoute, /new URL\(ADMIN_PASSWORD_RECOVERY_UPDATE_PATH, request\.nextUrl\.origin\)/);
  assert.equal(callbackRoute.includes("error_description"), false);
  assert.equal(callbackRoute.includes("access_token"), false);
  assert.equal(callbackRoute.includes("refresh_token"), false);
});

test("new-password validation rejects short and mismatched values", () => {
  assert.deepEqual(validatePasswordUpdate("short", "different"), {
    password: "Use at least 12 characters.",
    confirmPassword: "Passwords do not match."
  });
  assert.deepEqual(validatePasswordUpdate("long-enough-value", "long-enough-value"), {});
});

test("password update requires the existing admin authorization boundary", () => {
  assert.match(recoveryPage, /getAdminAuthorization/);
  assert.match(recoveryPage, /invalid-link/);
  assert.match(recoveryPage, /Request Another Reset Link/);
  assert.match(recoveryForm, /confirmPassword/);
  assert.match(recoveryAction, /getAdminAuthorization/);
  assert.match(recoveryAction, /supabase\.auth\.updateUser\(\{ password: input\.password \}\)/);
  assert.match(recoveryAction, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(adminAuth, /rpc\("is_mechanicmatch_admin"\)/);
  assert.equal(recoveryAction.includes("SUPABASE_SECRET_KEY"), false);
});

test("successful password recovery returns to normal admin login", () => {
  assert.match(recoveryForm, /ADMIN_LOGIN_PATH/);
  assert.match(recoveryForm, /reset=success/);
  assert.match(loginPage, /Password updated/);
  assert.match(loginPage, /Sign in with your new password/);
});
