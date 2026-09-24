import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { ApiError, getMe, login } from "./api/auth";
import type { CurrentUser, LoginInput } from "./api/auth";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Nhập username hoặc email.").max(254),
  password: z.string().min(1, "Nhập mật khẩu.").max(128),
});

type Session = {
  id: string;
  token: string;
};

const roleLabels: Record<string, string> = {
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

function LoginPage({
  onLogin,
  busy,
  error,
  sessionExpired,
}: {
  onLogin: (input: LoginInput) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  sessionExpired: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 12 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ mb: 2, alignItems: "center" }}
          >
            <Box
              component="img"
              src="/brand-mark.svg"
              alt=""
              sx={{ width: 48, height: 48 }}
            />
            <Typography
              variant="subtitle1"
              color="primary"
              sx={{ fontWeight: 700 }}
            >
              Inventory & Warehouse Transfer
            </Typography>
          </Stack>

          <Box>
            <Typography variant="overline" color="primary">
              Inventory & Warehouse Transfer
            </Typography>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
              Đăng nhập
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Sử dụng tài khoản được cấp để quản lý kho và phiếu chuyển kho.
            </Typography>
          </Box>

          {sessionExpired && (
            <Alert severity="warning">
              Phiên đăng nhập đã hết hạn hoặc tài khoản không còn khả dụng. Vui
              lòng đăng nhập lại.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <Box
            component="form"
            noValidate
            onSubmit={handleSubmit(async (values) => {
              await onLogin(values);
            })}
          >
            <Stack spacing={2.5}>
              <TextField
                label="Username hoặc email"
                autoComplete="username"
                autoFocus
                fullWidth
                error={Boolean(errors.identifier)}
                helperText={errors.identifier?.message}
                {...register("identifier")}
              />
              <TextField
                label="Mật khẩu"
                type="password"
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register("password")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy}
                fullWidth
              >
                {busy ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

function AccountPage({
  user,
  onLogout,
}: {
  user: CurrentUser;
  onLogout: () => void;
}) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
            }}
          >
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
                Xin chào, {user.username}
              </Typography>
              <Typography color="text.secondary">{user.email}</Typography>
            </Box>
            <Button variant="outlined" onClick={onLogout}>
              Đăng xuất
            </Button>
          </Stack>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Vai trò
            </Typography>
            <Chip label={roleLabels[user.role] ?? user.role} color="primary" />
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Kho phụ trách
            </Typography>
            <Typography>
              {user.assignedWarehouseId ?? "Chưa được phân công"}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Quyền bổ sung hiện hành
            </Typography>
            {user.additionalPermissions.length === 0 ? (
              <Typography>Không có quyền bổ sung.</Typography>
            ) : (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ mt: 1, flexWrap: "wrap" }}
              >
                {user.additionalPermissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={permissionLabels[permission] ?? permission}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}

function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const account = useQuery({
    queryKey: ["auth", "me", session?.id],
    queryFn: () => getMe(session!.token),
    enabled: session !== null,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  const sessionExpired =
    account.error instanceof ApiError && account.error.status === 401;

  async function handleLogin(input: LoginInput): Promise<boolean> {
    setLoginError(null);
    setLoginBusy(true);
    try {
      const result = await login(input);
      queryClient.clear();
      setSession({ id: crypto.randomUUID(), token: result.accessToken });
      return true;
    } catch (error) {
      setLoginError(
        error instanceof ApiError
          ? error.message
          : "Không thể đăng nhập. Vui lòng thử lại.",
      );
      return false;
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setLoginError(null);
    queryClient.clear();
  }

  let home: React.ReactNode;
  if (!session || sessionExpired) {
    home = <Navigate to="/login" replace />;
  } else if (account.isPending) {
    home = (
      <Container sx={{ py: 10, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Đang tải tài khoản...</Typography>
      </Container>
    );
  } else if (account.isError) {
    home = (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Alert severity="error">
          {account.error instanceof ApiError
            ? account.error.message
            : "Không tải được tài khoản."}
        </Alert>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => void account.refetch()}>
            Thử lại
          </Button>
          <Button onClick={handleLogout}>Đăng xuất</Button>
        </Stack>
      </Container>
    );
  } else {
    home = <AccountPage user={account.data} onLogout={handleLogout} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session && !sessionExpired ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                onLogin={handleLogin}
                busy={loginBusy}
                error={loginError}
                sessionExpired={sessionExpired}
              />
            )
          }
        />
        <Route path="/" element={home} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
