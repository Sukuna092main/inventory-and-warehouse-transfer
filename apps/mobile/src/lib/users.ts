import { requestJson } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";

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
  const params: [string, string][] = [
    ["page", String(query.page)],
    ["size", String(query.size)],
  ];

  const search = query.search?.trim();

  if (search) params.push(["search", search]);
  if (query.role) params.push(["role", query.role]);
  if (query.status) params.push(["status", query.status]);

  const queryString = params
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return requestJson<UserListResponse>(`/api/users?${queryString}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
}
