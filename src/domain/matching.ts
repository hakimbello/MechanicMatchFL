import {
  type Coordinates,
  type CustomerServiceCategory,
  type LaunchCounty,
  type MatchRequest,
  type Provider,
  type ProviderSpecialty
} from "./providers.ts";
import { getLaunchZipInfo } from "../geography/launchGeography.ts";

const ACTIVE_MATCH_STATUS = "active";

const SERVICE_RELEVANCE: Record<CustomerServiceCategory, Partial<Record<ProviderSpecialty, number>>> = {
  "wont-start": {
    "electrical-diagnostics": 80,
    engine: 70,
    "check-engine-diagnostics": 65,
    "general-repair": 45
  },
  brakes: {
    brakes: 90,
    "general-repair": 45,
    maintenance: 25
  },
  ac: {
    ac: 90,
    "electrical-diagnostics": 45,
    "general-repair": 40,
    "cooling-radiator": 30
  },
  tires: {
    "tires-wheels": 90,
    alignment: 55,
    "general-repair": 35
  },
  engine: {
    engine: 90,
    "check-engine-diagnostics": 60,
    "general-repair": 40,
    "cooling-radiator": 35
  },
  transmission: {
    transmission: 95,
    "general-repair": 35
  },
  electrical: {
    "electrical-diagnostics": 90,
    "check-engine-diagnostics": 55,
    "general-repair": 35
  },
  suspension: {
    suspension: 90,
    alignment: 50,
    "general-repair": 35
  },
  maintenance: {
    maintenance: 80,
    "general-repair": 55,
    brakes: 20,
    "tires-wheels": 20
  },
  "check-engine-light": {
    "check-engine-diagnostics": 90,
    "electrical-diagnostics": 55,
    engine: 50,
    "general-repair": 35
  },
  "other-not-sure": {
    "general-repair": 45,
    "check-engine-diagnostics": 35,
    maintenance: 25
  }
};

export interface MatchScore {
  total: number;
  service: number;
  vehicle: number;
  geography: number;
  suitability: number;
}

export interface ProviderMatch {
  provider: Provider;
  score: MatchScore;
  distanceMiles?: number;
  reasons: string[];
}

export function matchProviders(request: MatchRequest, providers: Provider[]): ProviderMatch[] {
  const matches = providers
    .map((provider) => scoreProvider(request, provider))
    .filter((match): match is ProviderMatch => Boolean(match));

  return matches.sort(compareProviderMatches);
}

export function scoreProvider(request: MatchRequest, provider: Provider): ProviderMatch | null {
  if (provider.status !== ACTIVE_MATCH_STATUS) {
    return null;
  }

  const service = scoreService(request.serviceCategory, provider.services);
  if (service.score <= 0) {
    return null;
  }

  const vehicle = scoreVehicle(request.vehicle.make, provider);
  if (vehicle.score <= 0) {
    return null;
  }

  const geography = scoreGeography(request, provider);
  if (!geography.eligible) {
    return null;
  }

  const suitability = scoreSuitability(provider);
  const total = service.score + vehicle.score + geography.score + suitability.score;

  return {
    provider,
    score: {
      total,
      service: service.score,
      vehicle: vehicle.score,
      geography: geography.score,
      suitability: suitability.score
    },
    distanceMiles: geography.distanceMiles,
    reasons: [...service.reasons, ...vehicle.reasons, ...geography.reasons, ...suitability.reasons]
  };
}

function scoreService(
  category: CustomerServiceCategory,
  services: ProviderSpecialty[]
): { score: number; reasons: string[] } {
  const relevance = SERVICE_RELEVANCE[category];
  const best = services.reduce(
    (current, service) => {
      const score = relevance[service] ?? 0;
      return score > current.score ? { service, score } : current;
    },
    { service: undefined as ProviderSpecialty | undefined, score: 0 }
  );

  if (!best.service) {
    return { score: 0, reasons: [] };
  }

  return {
    score: best.score,
    reasons: [`service:${best.service}`]
  };
}

function scoreVehicle(make: string, provider: Provider): { score: number; reasons: string[] } {
  const requestedMake = normalizeMake(make);
  const specialtyMakes = new Set((provider.specialtyMakes ?? []).map(normalizeMake));
  const servicedMakes = new Set((provider.makesServiced ?? []).map(normalizeMake));

  if (specialtyMakes.has(requestedMake)) {
    return { score: 30, reasons: [`vehicle:specialty-make:${make}`] };
  }

  if (provider.allMakes) {
    return { score: 22, reasons: ["vehicle:all-makes"] };
  }

  if (servicedMakes.has(requestedMake)) {
    return { score: 24, reasons: [`vehicle:make:${make}`] };
  }

  return { score: 0, reasons: [] };
}

function scoreGeography(
  request: MatchRequest,
  provider: Provider
): { eligible: boolean; score: number; distanceMiles?: number; reasons: string[] } {
  const requestZip = normalizeZip(request.zip);
  const requestZipInfo = getLaunchZipInfo(requestZip);

  if (!requestZipInfo) {
    return { eligible: false, score: 0, reasons: [] };
  }

  const requestCoordinates = request.coordinates ?? requestZipInfo.coordinates;

  if (provider.locationKind === "mobile") {
    return scoreMobileGeography(requestZip, requestZipInfo.counties, requestCoordinates, provider);
  }

  return scorePhysicalGeography(requestZip, requestZipInfo.counties, requestCoordinates, provider);
}

function scoreMobileGeography(
  requestZip: string,
  requestCounties: LaunchCounty[],
  requestCoordinates: Coordinates | undefined,
  provider: Provider
): { eligible: boolean; score: number; distanceMiles?: number; reasons: string[] } {
  const serviceArea = provider.mobileServiceArea;
  if (!serviceArea) {
    return { eligible: false, score: 0, reasons: [] };
  }

  const serviceZips = new Set((serviceArea.zipCodes ?? []).map(normalizeZip));
  if (serviceZips.has(requestZip)) {
    return { eligible: true, score: 20, reasons: ["geography:mobile-zip"] };
  }

  if (serviceArea.counties?.some((county) => requestCounties.includes(county))) {
    return { eligible: true, score: 16, reasons: ["geography:mobile-county"] };
  }

  if (serviceArea.radiusMiles && serviceArea.baseCoordinates && requestCoordinates) {
    const distanceMiles = haversineMiles(serviceArea.baseCoordinates, requestCoordinates);
    if (distanceMiles <= serviceArea.radiusMiles) {
      return {
        eligible: true,
        score: Math.max(8, 18 - distanceMiles / 4),
        distanceMiles,
        reasons: ["geography:mobile-radius"]
      };
    }
  }

  return { eligible: false, score: 0, reasons: [] };
}

function scorePhysicalGeography(
  requestZip: string,
  requestCounties: LaunchCounty[],
  requestCoordinates: Coordinates | undefined,
  provider: Provider
): { eligible: boolean; score: number; distanceMiles?: number; reasons: string[] } {
  const address = provider.address;
  if (!address || !requestCounties.includes(address.county)) {
    return { eligible: false, score: 0, reasons: [] };
  }

  if (address.zip === requestZip) {
    return { eligible: true, score: 18, reasons: ["geography:shop-same-zip"] };
  }

  const providerCoordinates = address.coordinates ?? getLaunchZipInfo(address.zip)?.coordinates;
  if (requestCoordinates && providerCoordinates) {
    const distanceMiles = haversineMiles(providerCoordinates, requestCoordinates);
    return {
      eligible: true,
      score: Math.max(4, 17 - distanceMiles / 3),
      distanceMiles,
      reasons: ["geography:shop-distance"]
    };
  }

  return { eligible: true, score: 8, reasons: ["geography:shop-launch-county"] };
}

function scoreSuitability(provider: Provider): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (provider.trust?.verified) {
    score += 5;
    reasons.push("suitability:verified");
  }

  if (provider.trust?.claimedProfile) {
    score += 2;
    reasons.push("suitability:claimed");
  }

  if (provider.type === "repair-specialist") {
    score += 4;
    reasons.push("suitability:repair-specialist");
  }

  if (provider.description) {
    score += 1;
    reasons.push("suitability:description");
  }

  return { score, reasons };
}

function compareProviderMatches(left: ProviderMatch, right: ProviderMatch): number {
  return (
    right.score.total - left.score.total ||
    right.score.service - left.score.service ||
    right.score.vehicle - left.score.vehicle ||
    right.score.geography - left.score.geography ||
    left.provider.name.localeCompare(right.provider.name) ||
    left.provider.id.localeCompare(right.provider.id)
  );
}

function normalizeMake(make: string): string {
  return make.trim().toLowerCase();
}

function normalizeZip(zip: string): string {
  return zip.trim();
}

function haversineMiles(first: Coordinates, second: Coordinates): number {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = degreesToRadians(second.latitude - first.latitude);
  const longitudeDelta = degreesToRadians(second.longitude - first.longitude);
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
