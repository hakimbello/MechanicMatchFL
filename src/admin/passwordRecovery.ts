export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_PASSWORD_RECOVERY_REQUEST_PATH = "/admin/forgot-password";
export const ADMIN_PASSWORD_RECOVERY_CALLBACK_PATH = "/admin/recover/callback";
export const ADMIN_PASSWORD_RECOVERY_UPDATE_PATH = "/admin/recover";

export const PASSWORD_RESET_REQUEST_CONFIRMATION =
  "If an account exists for that email, a password reset link has been sent.";

export interface PasswordUpdateValidationResult {
  password?: string;
  confirmPassword?: string;
}

export function buildAdminRecoveryCallbackUrl(origin: string): string {
  const url = new URL(origin);
  url.pathname = ADMIN_PASSWORD_RECOVERY_CALLBACK_PATH;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function validatePasswordUpdate(password: string, confirmPassword: string): PasswordUpdateValidationResult {
  const errors: PasswordUpdateValidationResult = {};

  if (password.length < 12) {
    errors.password = "Use at least 12 characters.";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
