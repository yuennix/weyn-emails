export type Tier = "premium";

  export interface UserProfile {
    tier: Tier;
    isAdmin: boolean;
    allowedDomainIds: number[];
  }

  export function useUserTier(): UserProfile & { loading: false; profile: null; premiumExpiresAt: null; refresh: () => void } {
    return {
      profile: null,
      loading: false,
      tier: "premium",
      isAdmin: false,
      premiumExpiresAt: null,
      allowedDomainIds: [],
      refresh: () => {},
    };
  }
  