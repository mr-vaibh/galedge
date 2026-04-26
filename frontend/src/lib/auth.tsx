"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  organization: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    org: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "galedge_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const saveToken = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Validate token and fetch user profile
  const fetchMe = useCallback(
    async (t: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) return false;
        const data = await res.json();
        setUser(data);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // On mount: check for saved token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
      fetchMe(stored).then((valid) => {
        if (!valid) clearToken();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [fetchMe, clearToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      // OAuth2PasswordRequestForm expects form-urlencoded, not JSON
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        const msg = typeof err?.detail === "string" ? err.detail : "Invalid email or password";
        throw new Error(msg);
      }
      const data = await res.json();
      saveToken(data.access_token);
      await fetchMe(data.access_token);
    },
    [saveToken, fetchMe]
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string, org: string) => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization: org,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Registration failed");
      }
      const data = await res.json();
      saveToken(data.access_token);
      await fetchMe(data.access_token);
    },
    [saveToken, fetchMe]
  );

  const logout = useCallback(() => {
    clearToken();
    router.push("/login");
  }, [clearToken, router]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
