import type { Provider } from "../domain/providers.ts";

export const DEVELOPMENT_PROVIDERS: Provider[] = [
  {
    id: "dev-dade-ac-specialist",
    name: "Bayfront Auto Climate",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "810 NE 125th St",
      city: "North Miami",
      county: "Miami-Dade",
      zip: "33161",
      coordinates: { latitude: 25.893, longitude: -80.182 }
    },
    services: ["ac", "electrical-diagnostics", "cooling-radiator"],
    allMakes: false,
    makesServiced: ["Honda", "Toyota", "Nissan"],
    contact: {
      phone: "(305) 555-0148",
      email: "hello@bayfrontautoclimate.test",
      website: "https://bayfrontautoclimate.example"
    },
    description: "Fictional development provider focused on auto AC and electrical diagnostics.",
    trust: { verified: true, claimedProfile: true }
  },
  {
    id: "dev-dade-mobile",
    name: "Sunrise Mobile Wrench",
    type: "mobile-mechanic",
    status: "active",
    locationKind: "mobile",
    mobileServiceArea: {
      zipCodes: ["33161", "33130", "33155"]
    },
    services: ["ac", "maintenance"],
    allMakes: true,
    contact: {
      phone: "305-555-0199",
      email: "dispatch@sunrisemobilewrench.test"
    },
    description: "Fictional mobile mechanic serving selected Miami-Dade ZIP codes.",
    trust: { claimedProfile: true }
  },
  {
    id: "dev-dade-general-honda",
    name: "Cypress Grove Auto Care",
    type: "independent-auto-repair-shop",
    status: "active",
    locationKind: "physical",
    address: {
      street: "4800 SW 8th St",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33155",
      coordinates: { latitude: 25.737, longitude: -80.315 }
    },
    services: ["general-repair", "maintenance", "brakes"],
    allMakes: false,
    makesServiced: ["Honda", "Toyota", "Nissan"],
    contact: {
      phone: "305.555.0172",
      website: "https://cypressgroveautocare.example"
    },
    description: "Fictional independent shop for common repairs and maintenance."
  },
  {
    id: "dev-broward-transmission",
    name: "Riverwalk Transmission Lab",
    type: "repair-specialist",
    status: "active",
    locationKind: "physical",
    address: {
      street: "910 SE 17th St",
      city: "Fort Lauderdale",
      county: "Broward",
      zip: "33316",
      coordinates: { latitude: 26.102, longitude: -80.136 }
    },
    services: ["transmission"],
    allMakes: false,
    makesServiced: ["Ford", "Chevrolet", "Honda"],
    specialtyMakes: ["Ford"],
    contact: {
      phone: "(954) 555-0133",
      email: "service@riverwalktransmission.test",
      website: "https://riverwalktransmission.example"
    },
    description: "Fictional Broward transmission specialist with Ford truck experience.",
    trust: { verified: true }
  },
  {
    id: "dev-broward-general",
    name: "Las Olas General Repair",
    type: "independent-auto-repair-shop",
    status: "active",
    locationKind: "physical",
    address: {
      street: "620 NW 27th Ave",
      city: "Fort Lauderdale",
      county: "Broward",
      zip: "33311",
      coordinates: { latitude: 26.145, longitude: -80.174 }
    },
    services: ["general-repair", "maintenance", "brakes"],
    allMakes: false,
    makesServiced: ["Ford", "Chevrolet", "Honda", "Toyota"],
    contact: {
      phone: "(954) 555-0177",
      website: "javascript:alert('not-safe')"
    },
    description: "Fictional general repair shop serving central Broward."
  },
  {
    id: "dev-broward-tire",
    name: "Atlantic Tire & Alignment",
    type: "tire-service-shop",
    status: "active",
    locationKind: "physical",
    address: {
      street: "1450 Hollywood Blvd",
      city: "Hollywood",
      county: "Broward",
      zip: "33020",
      coordinates: { latitude: 26.011, longitude: -80.149 }
    },
    services: ["tires-wheels", "alignment", "maintenance"],
    allMakes: true,
    contact: {
      phone: "954-555-0188",
      website: "https://atlantictirealignment.example"
    },
    description: "Fictional tire, wheel, and alignment service shop."
  },
  {
    id: "dev-inactive-electrical",
    name: "Inactive Diagnostic Garage",
    type: "repair-specialist",
    status: "deactivated",
    locationKind: "physical",
    address: {
      street: "100 Test Ave",
      city: "Miami",
      county: "Miami-Dade",
      zip: "33161"
    },
    services: ["electrical-diagnostics", "check-engine-diagnostics"],
    allMakes: true,
    description: "Fictional inactive provider that should never appear in search results."
  }
];
