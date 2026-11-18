"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/auth-api";
import { RequestFailure } from "@/lib/api-request";
import Link from "next/link";

export const Register = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser(name, email, password);
      router.push("/onboarding"); // Routing to the onboarding wizard
    } catch (error) {
      setMessage(
        error instanceof RequestFailure || error instanceof Error
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex justify-center min-h-screen flex-col items-center bg-[#FCE5D2] px-6  font-sans overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-[1px] border-[#46736A] opacity-40 -translate-y-1/4 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-[1px] border-[#46736A] opacity-40 -translate-y-1/4 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[28rem] h-[28rem] rounded-full border-[1px] border-[#46736A] opacity-40 translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[36rem] h-[36rem] rounded-full border-[1px] border-[#46736A] opacity-40 translate-y-1/2 pointer-events-none"></div>

      <div className="z-10  w-full  max-w-sm">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#0D3830] tracking-tight">
            Create an Account {/* */}
          </h1>
          <p className="mt-1 text-[#0D3830] font-medium">
            Join Unslouch to track your journey! {/* */}
          </p>
        </div>

        {/* Form Section */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#46736A]"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Username" /* */
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />

          <input
            className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#46736A]"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email" /*[cite: 3] */
            autoComplete="email"
            required
          />

          <input
            className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#46736A]"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password" /*[cite: 3] */
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />

          <input
            className="w-full rounded-[1.25rem] border-none bg-white px-5 py-3.5 text-sm text-[#0D3830] placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#46736A]"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter Password" /*[cite: 3] */
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />

          {message && (
            <p className="rounded-xl bg-red-50/90 px-4 py-2.5 text-sm text-red-600 backdrop-blur-sm">
              {message}
            </p>
          )}

          <button
            className="mt-2 w-full rounded-[1.25rem] bg-[#46736A] px-4 py-4 text-[15px] font-medium tracking-wide text-white transition hover:bg-[#3B6159] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"} {/*[cite: 3] */}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[#46736A]">
          Already have an account?{" "}
          <Link
            className="font-semibold text-[#0D3830] transition-colors hover:underline"
            href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
};
