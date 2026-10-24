export interface PartnerTenantBranding {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  welcomeHeadline: string;
  welcomeSubtext: string;
}

export interface PartnerTenantAnalytics {
  totalRedemptions: number;
  activeMentees: number;
  lessonsCompleted: number;
}

export interface PartnerTenant {
  id: string;
  organizationName: string;
  contactEmail: string;
  subscriptionTier: 4;
  active: boolean;
  branding: PartnerTenantBranding;
  redemptionCodes: string[];
  analytics: PartnerTenantAnalytics;
}
