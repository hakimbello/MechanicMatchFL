"use client";

import { useEffect, useState } from "react";

import { verifyReviewEmailAction } from "./actions";

export function VerificationTokenForm() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fragmentToken = window.location.hash.startsWith("#token=")
      ? window.location.hash.slice("#token=".length)
      : "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setToken(/^[A-Za-z0-9_-]{40,60}$/.test(fragmentToken) ? fragmentToken : "");
  }, []);

  if (token === null) return <p className="muted-text" role="status">Preparing secure verification...</p>;
  if (!token) return <p className="intro" role="alert">This verification link is invalid. The review was not published.</p>;

  return (
    <form action={verifyReviewEmailAction}>
      <input name="token" type="hidden" value={token} />
      <button className="primary-action" type="submit">Verify email</button>
    </form>
  );
}
