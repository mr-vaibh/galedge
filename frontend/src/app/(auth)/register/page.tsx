"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { register, user, token } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!(user || token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, fullName, organization);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      {isLoggedIn && (
        <div className="mx-4 mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-400">
            <p className="font-medium">You&apos;re already logged in as {user?.email}.</p>
            <p className="mt-0.5 text-amber-400/80">Creating a new account will switch to the new session. <button className="underline" onClick={() => router.push("/home")}>Go to app instead</button></p>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Create Account
        </CardTitle>
        <CardDescription>
          Register for a new Galedge Alpha account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              type="text"
              placeholder="Your company or fund"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
