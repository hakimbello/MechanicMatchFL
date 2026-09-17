"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ADMIN_LOGIN_PATH, validatePasswordUpdate } from "../../../src/admin/passwordRecovery.ts";
import { updateRecoveryPasswordAction } from "./actions";

export function RecoveryPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validatePasswordUpdate>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validatePasswordUpdate(password, confirmPassword);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    let result: Awaited<ReturnType<typeof updateRecoveryPasswordAction>>;
    try {
      result = await updateRecoveryPasswordAction({ password, confirmPassword });
    } catch {
      setPassword("");
      setConfirmPassword("");
      setIsSubmitting(false);
      setFormError("The password could not be updated. Choose a different password and try again.");
      return;
    }

    setPassword("");
    setConfirmPassword("");

    if (!result.ok) {
      setIsSubmitting(false);
      if (result.reason === "invalid-input") {
        setErrors(result.errors ?? {});
      } else if (result.reason === "invalid-session") {
        setFormError("This recovery session is no longer valid. Request another reset link.");
      } else {
        setFormError("The password could not be updated. Choose a different password and try again.");
      }
      return;
    }

    router.replace(`${ADMIN_LOGIN_PATH}?reset=success`);
    router.refresh();
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section" aria-labelledby="new-password-title">
        <h2 id="new-password-title">New password</h2>
        <div className="field-group">
          <label htmlFor="new-password">New password</label>
          <input
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            id="new-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {errors.password ? <p className="field-error">{errors.password}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="confirm-new-password">Confirm new password</label>
          <input
            aria-invalid={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            id="confirm-new-password"
            minLength={12}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
          {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword}</p> : null}
        </div>
        {formError ? (
          <p className="field-error" role="alert">
            {formError}
          </p>
        ) : null}
        <button className="primary-action" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </section>
    </form>
  );
}
