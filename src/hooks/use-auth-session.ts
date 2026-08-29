import { useSession } from "next-auth/react";

export function useClientSession() {
  const { data, status, update } = useSession();
  return {
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    user: data?.user,
    isOnboarded: data?.onboarded,
    session: data,
    refreshSession: update,
  };
}
