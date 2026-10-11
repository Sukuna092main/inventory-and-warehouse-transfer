import { requestJson } from "./auth";
import type { CurrentUser } from "./auth";

export type UserListItem = Omit<CurrentUser, "status"> & {
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type UserListQuery = {
  page: number;
  size: number;
  search?: string;
  role?: CurrentUser["role"];
  status?: UserListItem["status"];
};

export type UserListResponse = {
  items: UserListItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export function getUsers(
  token: string,
  query: UserListQuery,
  signal?: AbortSignal,
): Promise<UserListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.size),
  });

  const search = query.search?.trim();

  if (search) params.set("search", search);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);

  return requestJson<UserListResponse>(`/api/users?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
}
