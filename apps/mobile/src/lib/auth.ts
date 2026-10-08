import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "inventory.accessToken";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "WAREHOUSE_MANAGER" | "WAREHOUSE_STAFF";
  assignedWarehouseId: string | null;
  status: "ACTIVE";
  additionalPermissions: string[];
};

type LoginResult = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(path: string, options: RequestInit): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new ApiError(0, "Chưa cấu hình EXPO_PUBLIC_API_BASE_URL.");
  }

  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(`${baseUrl}${path}`, options);
    rawBody = await response.text();
  } catch (error) {
    const wasCancelled =
      options.signal?.aborted ||
      (error instanceof Error && error.name === "AbortError");

    if (wasCancelled) {
      throw error;
    }

    throw new ApiError(
      0,
      "Không kết nối được Gateway. Kiểm tra địa chỉ máy và mạng Wi-Fi.",
    );
  }
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    const contentType = response.headers.get("content-type") ?? "không có";
    const preview = rawBody.replace(/\s+/g, " ").slice(0, 120);

    throw new ApiError(
      response.status,
      `HTTP ${response.status}; content-type: ${contentType}; body: ${preview || "(rỗng)"}`,
    );
  }

  if (!response.ok) {
    const data =
      body !== null && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};

    throw new ApiError(
      response.status,
      typeof data.message === "string"
        ? data.message
        : "Không thể xử lý yêu cầu.",
    );
  }

  return body as T;
}

export function login(identifier: string, password: string) {
  return requestJson<LoginResult>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
}

export function getMe(token: string, signal?: AbortSignal) {
  return requestJson<CurrentUser>("/api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
}

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
