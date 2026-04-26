"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth";

/**
 * Redirects to /login if user is not authenticated.
 * Returns { user, token, loading } for convenience.
 */
export function useRequireAuth() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  return { user, token, loading, isAuthenticated: !!token };
}
