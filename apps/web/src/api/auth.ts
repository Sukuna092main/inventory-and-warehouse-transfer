export type LoginInput = {
  identifier: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "WAREHOUSE_MANAGER" | "WAREHOUSE_STAFF";
  assignedWarehouseId: string | null;
  status: "ACTIVE";
  additionalPermissions: string[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(path: string, options: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, { ...options, cache: "no-store" });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c Gateway. Vui lÃ²ng kiá»ƒm tra káº¿t ná»‘i rá»“i thá»­ láº¡i.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "Pháº£n há»“i tá»« há»‡ thá»‘ng khÃ´ng há»£p lá»‡.",
    );
  }

  if (!response.ok) {
    const error =
      body !== null && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};

    throw new ApiError(
      response.status,
      typeof error.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error.message === "string"
        ? error.message
        : "KhÃ´ng thá»ƒ xá»­ lÃ½ yÃªu cáº§u.",
    );
  }

  return body as T;
}

export function login(input: LoginInput): Promise<LoginResult> {
  return requestJson<LoginResult>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getMe(token: string): Promise<CurrentUser> {
  return requestJson<CurrentUser>("/api/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

