import { request } from "@/lib/api/client";

export type User = {
  user_id: string;
  name: string;
  email: string;
  scoliosis_type: string | null;
  target_daily_exercise_min: number | null;
  posture_alert_threshold_sec: number | null;
  created_at: string;
  updated_at: string;
};

export const loginUser = async (email: string, password: string) =>
  request<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) =>
  request<{ user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const getCurrentUser = async () =>
  request<{ user: User }>("/api/auth/me");

export const logoutUser = async () =>
  request<void>("/api/auth/logout", {
    method: "POST",
  });