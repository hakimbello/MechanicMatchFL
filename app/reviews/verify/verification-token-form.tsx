"use client";

import { useEffect, useState } from "react";

import { verifyReviewEmailAction } from "./actions";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import type { PublicLocale } from "../../../src/i18n/locale.ts";

export function VerificationTokenForm({ locale = "en" }: { locale?: PublicLocale }) {
  const messages = getPublicMessages(locale).verification;
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fragmentToken = window.location.hash.startsWith("#token=")
      ? window.location.hash.slice("#token=".length)
      : "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setToken(/^[A-Za-z0-9_-]{40,60}$/.test(fragmentToken) ? fragmentToken : "");
  }, []);

  if (token === null) return <p className="muted-text" role="status">{messages.preparing}</p>;
  if (!token) return <p className="intro" role="alert">{messages.invalidLink}</p>;

  return (
    <form action={verifyReviewEmailAction}>
      <input name="token" type="hidden" value={token} />
      <input name="locale" type="hidden" value={locale} />
      <button className="primary-action" type="submit">{messages.button}</button>
    </form>
  );
}
