import { apiFetch } from "@/lib/api-request";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:5001";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
};

const getErrorMessage = (payload: ApiResponse<unknown>) => {
  const firstValidationError = payload.errors
    ? Object.values(payload.errors)[0]
    : undefined;

  return firstValidationError ?? payload.message ?? "Request failed";
};

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(getErrorMessage(payload));
  }

  return payload.data as T;
}