"use client";

import { useEffect } from "react";

import { recordMechanicProfileViewed } from "../../../src/analytics/client.ts";
import type { CustomerServiceCategory, ProviderType } from "../../../src/domain/providers.ts";

interface ProfileAnalyticsProps {
  providerId: string;
  providerType: ProviderType;
  serviceCategory?: CustomerServiceCategory;
}

export function ProfileAnalytics({ providerId, providerType, serviceCategory }: ProfileAnalyticsProps) {
  useEffect(() => {
    recordMechanicProfileViewed({
      providerId,
      providerType,
      serviceCategory
    });
  }, [providerId, providerType, serviceCategory]);

  return null;
}
