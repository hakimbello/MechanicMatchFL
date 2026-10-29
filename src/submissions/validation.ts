import {
  LAUNCH_COUNTIES,
  PROVIDER_SPECIALTIES,
  PROVIDER_TYPES,
  type LaunchCounty,
  type ProviderSpecialty,
  type ProviderType
} from "../domain/providers.ts";
import { getLaunchZipInfo, hasLaunchZipCoordinates, isLaunchZip } from "../geography/launchGeography.ts";
import {
  AUTHORIZATION_RELATIONSHIPS,
  type AuthorizationRelationship,
  type ProviderSubmissionInput,
  type ProviderSubmissionRecord,
  type SubmissionFieldErrors
} from "./submissionTypes.ts";

export function validateProviderSubmission(input: ProviderSubmissionInput): SubmissionFieldErrors {
  const errors: SubmissionFieldErrors = {};

  if (!input.businessName.trim()) {
    errors.businessName = "Enter the provider or business name.";
  } else if (input.businessName.trim().length > 120) {
    errors.businessName = "Keep the provider or business name under 120 characters.";
  }

  if (!isValidPhone(input.phone)) {
    errors.phone = "Enter a valid 10-digit phone number.";
  }

  if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email address.";
  } else if (input.email.trim().length > 254) {
    errors.email = "Keep the email address under 254 characters.";
  }

  if (!isProviderType(input.providerType)) {
    errors.providerType = "Choose a provider type.";
  }

  if (input.services.length === 0 || input.services.some((service) => !isProviderSpecialty(service))) {
    errors.services = "Choose at least one service.";
  }

  if (!input.allMakes && splitCommaValues(input.makesServiced).length === 0) {
    errors.makesServiced = "Choose all makes or enter the makes you service.";
  } else if (input.makesServiced.length > 300) {
    errors.makesServiced = "Keep makes serviced under 300 characters.";
  }

  if (input.specialtyMakes.length > 300) {
    errors.specialtyMakes = "Keep specialty makes under 300 characters.";
  }

  if (input.yearsExperience.trim()) {
    const yearsExperience = Number(input.yearsExperience);
    if (!Number.isInteger(yearsExperience) || yearsExperience < 1 || yearsExperience > 100) {
      errors.yearsExperience = "Enter whole years of experience between 1 and 100.";
    }
  }

  if (input.spokenLanguages.some((language) => language !== "English" && language !== "Spanish")) {
    errors.spokenLanguages = "Choose English, Spanish, or enter another language.";
  }

  if (input.otherLanguage.trim().length > 60) {
    errors.otherLanguage = "Keep the other language under 60 characters.";
  }

  if (input.locationKind === "physical") {
    if (!input.street.trim()) {
      errors.street = "Enter the shop street address.";
    } else if (input.street.trim().length > 160) {
      errors.street = "Keep the shop street address under 160 characters.";
    }

    if (!input.city.trim()) {
      errors.city = "Enter the shop city.";
    } else if (input.city.trim().length > 80) {
      errors.city = "Keep the shop city under 80 characters.";
    }

    if (!isLaunchCounty(input.county)) {
      errors.county = "Choose Miami-Dade or Broward.";
    }

    if (!isValidZip(input.zip)) {
      errors.zip = "Enter a valid 5-digit ZIP code.";
    } else if (!isLaunchZip(input.zip)) {
      errors.zip = "Enter a Miami-Dade or Broward ZIP code.";
    } else if (!hasLaunchZipCoordinates(input.zip)) {
      errors.zip = "Distance matching is not available for this ZIP yet. Use a nearby residential ZIP.";
    } else if (input.county && !getLaunchZipInfo(input.zip)?.counties.includes(input.county as LaunchCounty)) {
      errors.zip = "The ZIP code does not match the selected county.";
    }
  } else if (input.locationKind === "mobile") {
    const rawServiceZips = splitCommaValues(input.serviceZipCodes);
    const serviceZips = splitZipValues(input.serviceZipCodes);
    const hasRadiusInput = Boolean(input.serviceBaseZip.trim() || input.serviceRadiusMiles.trim());

    if (rawServiceZips.length !== serviceZips.length) {
      errors.serviceZipCodes = "Enter only comma-separated 5-digit ZIP codes.";
    } else if (serviceZips.some((zip) => !isLaunchZip(zip) || !hasLaunchZipCoordinates(zip))) {
      errors.serviceZipCodes = "Use Miami-Dade or Broward residential ZIP codes with available distance coverage.";
    }

    if (serviceZips.length === 0 && !hasRadiusInput) {
      errors.serviceZipCodes = "Enter service ZIP codes or a base ZIP and service radius.";
    }

    if (hasRadiusInput) {
      if (!isValidZip(input.serviceBaseZip) || !isLaunchZip(input.serviceBaseZip)) {
        errors.serviceBaseZip = "Enter a Miami-Dade or Broward base ZIP code.";
      } else if (!hasLaunchZipCoordinates(input.serviceBaseZip)) {
        errors.serviceBaseZip = "Distance matching is not available for this base ZIP.";
      }

      const radius = Number(input.serviceRadiusMiles);
      if (!Number.isFinite(radius) || radius < 1 || radius > 100) {
        errors.serviceRadiusMiles = "Enter a service radius from 1 to 100 miles.";
      }
    }

    if (input.serviceCounties.some((county) => !isLaunchCounty(county))) {
      errors.serviceCounties = "Choose only Miami-Dade or Broward.";
    }
  } else {
    errors.locationKind = "Choose physical shop or mobile mechanic.";
  }

  if (!isAuthorizationRelationship(input.authorizationRelationship)) {
    errors.authorizationRelationship = "Choose your relationship to the business.";
  }

  if (!input.authorizationAttested) {
    errors.authorizationAttested = "Confirm that you are authorized to create or manage this profile.";
  }

  const descriptionLength = input.description.trim().length;
  if (descriptionLength < 20) {
    errors.description = "Enter a short description of at least 20 characters.";
  } else if (descriptionLength > 500) {
    errors.description = "Keep the description under 500 characters.";
  }

  if (input.profileImageRef.trim()) {
    errors.profileImageRef = "Provider images are deferred for V1.";
  }

  return errors;
}

export function createSubmittedProviderRecord(
  input: ProviderSubmissionInput,
  now: Date = new Date(),
  id: string = buildSubmissionId(input.businessName, now)
): { ok: true; record: ProviderSubmissionRecord } | { ok: false; errors: SubmissionFieldErrors } {
  const errors = validateProviderSubmission(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const timestamp = now.toISOString();

  return {
    ok: true,
    record: {
      id,
      status: "submitted",
      submittedAt: timestamp,
      updatedAt: timestamp,
      businessName: input.businessName.trim(),
      phone: normalizePhone(input.phone),
      email: input.email.trim().toLowerCase(),
      providerType: input.providerType as ProviderType,
      locationKind: input.locationKind as "physical" | "mobile",
      street: input.locationKind === "physical" ? optionalTrim(input.street) : undefined,
      city: input.locationKind === "physical" ? optionalTrim(input.city) : undefined,
      county: input.locationKind === "physical" ? input.county || undefined : undefined,
      zip: input.locationKind === "physical" ? optionalTrim(input.zip) : undefined,
      serviceZipCodes:
        input.locationKind === "mobile" ? Array.from(new Set(splitZipValues(input.serviceZipCodes))) : undefined,
      serviceCounties: input.locationKind === "mobile" ? input.serviceCounties : undefined,
      serviceBaseZip: input.locationKind === "mobile" ? optionalTrim(input.serviceBaseZip) : undefined,
      serviceRadiusMiles:
        input.locationKind === "mobile" && input.serviceRadiusMiles.trim()
          ? Number(input.serviceRadiusMiles)
          : undefined,
      services: input.services,
      allMakes: input.allMakes,
      makesServiced: input.allMakes ? undefined : splitCommaValues(input.makesServiced),
      specialtyMakes: splitCommaValues(input.specialtyMakes),
      yearsExperience: input.yearsExperience.trim() ? Number(input.yearsExperience) : undefined,
      spokenLanguages: uniqueCaseInsensitive([
        ...input.spokenLanguages,
        ...(input.otherLanguage.trim() ? [input.otherLanguage.trim()] : [])
      ]),
      description: input.description.trim(),
      profileImageRef: undefined,
      registration: input.registrationNumber.trim()
        ? { value: input.registrationNumber.trim(), verificationStatus: "submitted-unverified" }
        : undefined,
      authorizationRelationship: input.authorizationRelationship as AuthorizationRelationship,
      authorizationAttested: true
    }
  };
}

export function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitZipValues(value: string): string[] {
  return splitCommaValues(value).filter(isValidZip);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return /^\d{10}$/.test(normalized);
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

function isProviderType(value: string): value is ProviderType {
  return PROVIDER_TYPES.includes(value as ProviderType);
}

function isProviderSpecialty(value: string): value is ProviderSpecialty {
  return PROVIDER_SPECIALTIES.includes(value as ProviderSpecialty);
}

function isLaunchCounty(value: string): value is LaunchCounty {
  return LAUNCH_COUNTIES.includes(value as LaunchCounty);
}

function isAuthorizationRelationship(value: string): value is AuthorizationRelationship {
  return AUTHORIZATION_RELATIONSHIPS.includes(value as AuthorizationRelationship);
}

function optionalTrim(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function uniqueCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function buildSubmissionId(name: string, now: Date): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `submission-${slug || "provider"}-${now.getTime()}`;
}
