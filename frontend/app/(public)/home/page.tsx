"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser, type User } from "@/lib/api/auth-api";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("Checking authentication...");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getCurrentUser();
        setUser(result.user);
        setMessage("");
      } catch {
        router.replace("/login");
      }
    };

    void loadUser();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logoutUser();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold tracking-widest text-[#45726D]">
          UNSLOUCH
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Backend test dashboard
        </h1>

        {!user ? (
          <p className="mt-6 text-slate-600">{message}</p>
        ) : (
          <>
            <div className="mt-6 rounded-xl bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-800">
                Authentication successful
              </p>
              <p className="mt-2 text-sm text-emerald-700">
                The backend accepted the HTTP-only authentication cookie.
              </p>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="font-medium text-slate-500">Name</dt>
                <dd className="text-right text-slate-900">{user.name}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="text-right text-slate-900">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="font-medium text-slate-500">User ID</dt>
                <dd className="break-all text-right font-mono text-xs text-slate-900">
                  {user.user_id}
                </dd>
              </div>
            </dl>

            <Link
              href="/pairing"
              className="mt-8 block w-full rounded-lg bg-[#094A44] px-4 py-2.5 text-center font-semibold text-white transition hover:bg-[#063a35]">
              Pair a device
            </Link>

            <button
              className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}>
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link className="hover:underline" href="/">
            Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
