"use client";

import {
  recordMechanicContactClick,
  type MechanicContactEventInput
} from "../../../src/analytics/contactEvents.ts";
import type { ContactAction } from "../../../src/profiles/contact.ts";
import { getPublicMessages } from "../../../src/i18n/messages.ts";
import type { PublicLocale } from "../../../src/i18n/locale.ts";

interface ContactActionsProps {
  actions: ContactAction[];
  eventContext: Omit<MechanicContactEventInput, "contactMethod">;
  locale?: PublicLocale;
}

export function ContactActions({ actions, eventContext, locale = "en" }: ContactActionsProps) {
  const messages = getPublicMessages(locale).profile;
  if (actions.length === 0) {
    return (
      <div className="contact-panel">
        <h2>{messages.contact}</h2>
        <p className="muted-text">{messages.contactUnavailable}</p>
      </div>
    );
  }

  return (
    <div className="contact-panel">
      <h2>{messages.contact}</h2>
      <div className="contact-actions">
        {actions.map((action) => (
          <a
            className={action.primary ? "contact-action primary-contact" : "contact-action"}
            href={action.href}
            key={action.method}
            onClick={() =>
              recordMechanicContactClick({
                ...eventContext,
                contactMethod: action.method
              })
            }
            rel={action.external ? "noopener noreferrer" : undefined}
            target={action.external ? "_blank" : undefined}
          >
            <span>{action.label}</span>
            <span>{action.displayValue}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
