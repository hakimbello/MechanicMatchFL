"use client";

import {
  recordMechanicContactClick,
  type MechanicContactEventInput
} from "../../../src/analytics/contactEvents.ts";
import type { ContactAction } from "../../../src/profiles/contact.ts";

interface ContactActionsProps {
  actions: ContactAction[];
  eventContext: Omit<MechanicContactEventInput, "contactMethod">;
}

export function ContactActions({ actions, eventContext }: ContactActionsProps) {
  if (actions.length === 0) {
    return (
      <div className="contact-panel">
        <h2>Contact</h2>
        <p className="muted-text">Contact information is not available for this provider yet.</p>
      </div>
    );
  }

  return (
    <div className="contact-panel">
      <h2>Contact mechanic</h2>
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
