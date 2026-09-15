import { sendAnalyticsEvent, type AnalyticsSink } from "./client.ts";
import {
  buildMechanicContactEvent,
  type MechanicContactEventInput
} from "./events.ts";

export { buildMechanicContactEvent, type MechanicContactEventInput } from "./events.ts";

export function recordMechanicContactClick(input: MechanicContactEventInput, sink?: AnalyticsSink): void {
  sendAnalyticsEvent(buildMechanicContactEvent(input), sink);
}
