import { useUser } from "@clerk/react";

export type Tier = "free" | "premium";

export function useUserTier() {
  const { user, isLoaded, isSignedIn } = useUser();

  const tier: Tier =
    isLoaded && isSignedIn && user?.publicMetadata?.tier === "premium"
      ? "premium"
      : "free";

  return {
    tier,
    isSignedIn: isLoaded ? (isSignedIn ?? false) : false,
    isLoaded,
    user,
  };
}
