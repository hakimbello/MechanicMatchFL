export interface AdminAccessBoundary {
  allowed: boolean;
  mode: "development-only";
  message: string;
}

export function getDevelopmentAdminAccess(): AdminAccessBoundary {
  return {
    allowed: true,
    mode: "development-only",
    message:
      "Development only: production admin access control is not implemented and remains a launch blocker."
  };
}
