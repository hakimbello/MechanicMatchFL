import {
  LAUNCH_COUNTIES,
  PROVIDER_SPECIALTIES,
  PROVIDER_TYPES,
  type LaunchCounty,
  type ProviderSpecialty,
  type ProviderType
} from "../domain/providers.ts";
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
  }

  if (!isValidPhone(input.phone)) {
    errors.phone = "Enter a valid 10-digit phone number.";
  }

  if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!isProviderType(input.providerType)) {
    errors.providerType = "Choose a provider type.";
  }

  if (input.services.length === 0 || input.services.some((service) => !isProviderSpecialty(service))) {
    errors.services = "Choose at least one service.";
  }

  if (!input.allMakes && splitCommaValues(input.makesServiced).length === 0) {
    errors.makesServiced = "Choose all makes or enter the makes you service.";
  }

  if (input.locationKind === "physical") {
    if (!input.street.trim()) {
      errors.street = "Enter the shop street address.";
    }

    if (!input.city.trim()) {
      errors.city = "Enter the shop city.";
    }

    if (!isLaunchCounty(input.county)) {
      errors.county = "Choose Miami-Dade or Broward.";
    }

    if (!isValidZip(input.zip)) {
      errors.zip = "Enter a valid 5-digit ZIP code.";
    }
  } else if (input.locationKind === "mobile") {
    if (splitZipValues(input.serviceZipCodes).length === 0 && input.serviceCounties.length === 0) {
      errors.serviceZipCodes = "Enter service ZIP codes or choose a service county.";
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
      street: optionalTrim(input.street),
      city: optionalTrim(input.city),
      county: input.county || undefined,
      zip: optionalTrim(input.zip),
      serviceZipCodes: splitZipValues(input.serviceZipCodes),
      serviceCounties: input.serviceCounties,
      services: input.services,
      allMakes: input.allMakes,
      makesServiced: input.allMakes ? undefined : splitCommaValues(input.makesServiced),
      specialtyMakes: splitCommaValues(input.specialtyMakes),
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

function buildSubmissionId(name: string, now: Date): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `submission-${slug || "provider"}-${now.getTime()}`;
}
