import type { Provider } from "../domain/providers.ts";
import { getPublicMessages } from "../i18n/messages.ts";
import type { PublicLocale } from "../i18n/locale.ts";

export type ContactMethod = "phone" | "email" | "website";

export interface ContactAction {
  method: ContactMethod;
  label: string;
  href: string;
  displayValue: string;
  primary: boolean;
  external: boolean;
}

export function buildContactActions(provider: Provider, locale: PublicLocale = "en"): ContactAction[] {
  const actions = [
    buildPhoneAction(provider.contact?.phone, locale),
    buildEmailAction(provider.contact?.email, locale),
    buildWebsiteAction(provider.contact?.website, locale)
  ].filter((action): action is ContactAction => Boolean(action));

  return actions.sort((left, right) => Number(right.primary) - Number(left.primary));
}

export function buildPhoneAction(phone?: string, locale: PublicLocale = "en"): ContactAction | null {
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
    label: getPublicMessages(locale).presentation.call,
    href: `tel:+1${normalized}`,
    displayValue: formatPhone(normalized),
    primary: true,
    external: false
  };
}

export function buildEmailAction(email?: string, locale: PublicLocale = "en"): ContactAction | null {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  return {
    method: "email",
    label: getPublicMessages(locale).presentation.email,
    href: `mailto:${normalized}`,
    displayValue: normalized,
    primary: false,
    external: false
  };
}

export function buildWebsiteAction(website?: string, locale: PublicLocale = "en"): ContactAction | null {
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
    label: getPublicMessages(locale).presentation.website,
    href: url.toString(),
    displayValue: url.hostname,
    primary: false,
    external: true
  };
}

function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
