"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api/auth-api";
import { RequestFailure } from "@/lib/api-request";

export const Login = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage(null);
    setIsError(false);
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
      router.push("/home");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof RequestFailure || error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-[#FCE5D2] px-6 justify-center font-sans overflow-hidden">
      
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-[1px] border-[#46736A] opacity-40 -translate-y-1/4 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-[1px] border-[#46736A] opacity-40 -translate-y-1/4 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[28rem] h-[28rem] rounded-full border-[1px] border-[#46736A] opacity-40 translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[36rem] h-[36rem] rounded-full border-[1px] border-[#46736A] opacity-40 translate-y-1/2 pointer-events-none"></div>

      <div className="z-10 w-full max-w-sm">
        <h1 className="mb-8 text-3xl font-extrabold text-[#46736A] tracking-tight">
          Sign In {/* */}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-500 outline-none transition focus:ring-2 focus:ring-[#46736A]"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email / Username" /* */
            autoComplete="email"
            required
          />

          <div>
            <input
              className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-500 outline-none transition focus:ring-2 focus:ring-[#46736A]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password" /* */
              autoComplete="current-password"
              minLength={8}
              required
            />
            <div className="mt-2 flex justify-end pr-2">
              <Link 
                href="/forgot-password" 
                className="text-xs font-medium text-[#46736A] transition-colors hover:text-[#0D3830]"
              >
                Forgot password? {/*[cite: 4] */}
              </Link>
            </div>
          </div>

          {message && (
            <p
              className={`rounded-xl px-4 py-2.5 text-sm backdrop-blur-sm ${
                isError
                  ? "bg-red-50/90 text-red-600"
                  : "bg-emerald-50/90 text-emerald-700"
              }`}
            >
              {message}
            </p>
          )}

          <button
            className="mt-6 w-full rounded-[1.25rem] bg-[#46736A] px-4 py-4 text-[15px] font-medium tracking-wide text-white transition hover:bg-[#3B6159] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"} {/*[cite: 4] */}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#46736A]">
          No account yet?{" "}
          <Link
            className="font-semibold text-[#0D3830] transition-colors hover:underline"
            href="/register"
          >
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}