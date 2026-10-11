import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { ApiError } from "../api/auth";
import { getUsers } from "../api/users";
import type { UserListQuery } from "../api/users";

const roleLabels = {
  ADMIN: "Quản trị viên",
  WAREHOUSE_MANAGER: "Quản lý kho",
  WAREHOUSE_STAFF: "Nhân viên kho",
};

const permissionLabels: Record<string, string> = {
  VIEW_OTHER_INVENTORY: "Xem tồn kho khác",
  SHIP_TRANSFER: "Xuất hàng chuyển kho",
  RECEIVE_TRANSFER: "Nhận hàng chuyển kho",
  ADJUST_INVENTORY: "Điều chỉnh tồn kho",
};

type Props = {
  token: string;
  sessionId: string;
  onUnauthorized: () => void;
};

export default function UsersPage({ token, sessionId, onUnauthorized }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<NonNullable<UserListQuery["role"]> | "">("");
  const [status, setStatus] = useState<
    NonNullable<UserListQuery["status"]> | ""
  >("");

  const [query, setQuery] = useState<UserListQuery>({
    page: 0,
    size: 20,
  });

  const users = useQuery({
    queryKey: ["users", "list", sessionId, query],
    queryFn: ({ signal }) => getUsers(token, query, signal),
    retry: false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  useEffect(() => {
    if (!(users.error instanceof ApiError)) return;

    if (users.error.status === 401) {
      onUnauthorized();
    } else if (users.error.status === 403) {
      void queryClient.invalidateQueries({
        queryKey: ["auth", "me"],
      });
    }
  }, [users.error, onUnauthorized, queryClient]);

  const data = users.data;
  const pageOutOfRange =
    data !== undefined && query.page > 0 && query.page >= data.totalPages;

  return (
    <Container
      maxWidth="xl"
      sx={{ py: { xs: 3, md: 5 }, px: { xs: 3, md: 5 } }}
    >
      <Stack
        component="header"
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          pb: 3,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontSize: 21, fontWeight: 700 }}>
          Inventory
        </Typography>
        <Button component={RouterLink} to="/">
          Tài khoản
        </Button>
      </Stack>

      <Box component="main" sx={{ mt: 4 }}>
        <Typography component="h1" variant="h4">
          Người dùng
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Tra cứu tài khoản, vai trò và quyền trong hệ thống.
        </Typography>

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({
              page: 0,
              size: query.size,
              search: search.trim(),
              role: role || undefined,
              status: status || undefined,
            });
          }}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto",
            },
            gap: 2,
            mt: 4,
            mb: 3,
          }}
        >
          <TextField
            label="Username hoặc email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 254 } }}
            fullWidth
          />

          <TextField
            select
            label="Vai trò"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            fullWidth
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(roleLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Trạng thái"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            fullWidth
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="ACTIVE">Đang hoạt động</MenuItem>
            <MenuItem value="INACTIVE">Đã vô hiệu hóa</MenuItem>
          </TextField>

          <Button type="submit" variant="contained">
            Tìm kiếm
          </Button>
        </Box>

        {users.isPending ? (
          <Stack spacing={2} sx={{ alignItems: "center", py: 6 }}>
            <CircularProgress />
            <Typography role="status">Đang tải người dùng...</Typography>
          </Stack>
        ) : users.isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                disabled={users.isFetching}
                onClick={() => void users.refetch()}
              >
                Thử lại
              </Button>
            }
          >
            {users.error instanceof ApiError
              ? users.error.message
              : "Không tải được danh sách người dùng."}
          </Alert>
        ) : data ? (
          <Box aria-busy={users.isFetching}>
            <Box sx={{ height: 4 }}>
              {users.isFetching && <LinearProgress />}
            </Box>

            <Typography color="text.secondary" sx={{ my: 2 }}>
              Tổng số: {data.total} người dùng
            </Typography>

            {data.items.length === 0 ? (
              <Stack spacing={2} sx={{ py: 4 }}>
                <Typography>
                  {pageOutOfRange
                    ? "Trang này không còn dữ liệu."
                    : "Không có người dùng phù hợp."}
                </Typography>
                {pageOutOfRange && (
                  <Button
                    sx={{ alignSelf: "flex-start" }}
                    onClick={() =>
                      setQuery((current) => ({ ...current, page: 0 }))
                    }
                  >
                    Về trang đầu
                  </Button>
                )}
              </Stack>
            ) : (
              <TableContainer>
                <Table aria-label="Danh sách người dùng" sx={{ minWidth: 850 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tài khoản</TableCell>
                      <TableCell>Vai trò</TableCell>
                      <TableCell>Kho phụ trách (ID)</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Quyền bổ sung</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {data.items.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{ maxWidth: 260, overflowWrap: "anywhere" }}
                        >
                          <Typography sx={{ fontWeight: 500 }}>
                            {user.username}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: 13 }}
                          >
                            {user.email}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {roleLabels[user.role] ?? user.role}
                        </TableCell>

                        <TableCell
                          sx={{ maxWidth: 260, overflowWrap: "anywhere" }}
                        >
                          {user.assignedWarehouseId ?? "Chưa được phân công"}
                        </TableCell>

                        <TableCell>
                          {user.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : "Đã vô hiệu hóa"}
                        </TableCell>

                        <TableCell
                          sx={{ maxWidth: 280, overflowWrap: "anywhere" }}
                        >
                          {user.additionalPermissions.length === 0
                            ? "Không có"
                            : user.additionalPermissions
                                .map((code) => permissionLabels[code] ?? code)
                                .join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {!pageOutOfRange && (
              <TablePagination
                component="div"
                count={data.total}
                page={query.page}
                rowsPerPage={query.size}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={(_event, page) =>
                  setQuery((current) => ({ ...current, page }))
                }
                onRowsPerPageChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    page: 0,
                    size: Number(event.target.value),
                  }))
                }
                labelRowsPerPage="Số dòng:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} / ${count}`
                }
                getItemAriaLabel={(type) =>
                  ({
                    first: "Trang đầu",
                    last: "Trang cuối",
                    next: "Trang tiếp",
                    previous: "Trang trước",
                  })[type]
                }
              />
            )}
          </Box>
        ) : null}
      </Box>
    </Container>
  );
}
