import type { Provider } from "../domain/providers.ts";

export type ContactMethod = "phone" | "email" | "website";

export interface ContactAction {
  method: ContactMethod;
  label: string;
  href: string;
  displayValue: string;
  primary: boolean;
  external: boolean;
}

export function buildContactActions(provider: Provider): ContactAction[] {
  const actions = [
    buildPhoneAction(provider.contact?.phone),
    buildEmailAction(provider.contact?.email),
    buildWebsiteAction(provider.contact?.website)
  ].filter((action): action is ContactAction => Boolean(action));

  return actions.sort((left, right) => Number(right.primary) - Number(left.primary));
}

export function buildPhoneAction(phone?: string): ContactAction | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (!/^\d{10}$/.test(normalized)) {
    return null;
  }

  return {
    method: "phone",
    label: "Call Mechanic",
    href: `tel:+1${normalized}`,
    displayValue: formatPhone(normalized),
    primary: true,
    external: false
  };
}

export function buildEmailAction(email?: string): ContactAction | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  return {
    method: "email",
    label: "Email Mechanic",
    href: `mailto:${normalized}`,
    displayValue: normalized,
    primary: false,
    external: false
  };
}

export function buildWebsiteAction(website?: string): ContactAction | null {
  if (!website) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(website.trim());
  } catch {
    return null;
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    return null;
  }

  return {
    method: "website",
    label: "Visit Website",
    href: url.toString(),
    displayValue: url.hostname,
    primary: false,
    external: true
  };
}

function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
