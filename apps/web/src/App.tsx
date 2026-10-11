import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  SvgIcon,
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
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  return (
    <Container
      maxWidth={false}
      sx={{
        maxWidth: 1440,
        px: { xs: 3, md: 6 },
        py: { xs: 3, md: 4 },
        minHeight: "100dvh",
      }}
    >
      <Stack
        component="header"
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          pb: 3,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          component="img"
          src="/brand-mark.svg"
          alt=""
          sx={{ width: 32, height: 32 }}
        />

        <Box>
          <Typography sx={{ fontSize: 21, fontWeight: 700 }}>
            Inventory
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 10, letterSpacing: 0.5 }}
          >
            WAREHOUSE TRANSFER
          </Typography>
        </Box>
      </Stack>

      <Box
        component="main"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1.15fr) minmax(0, 1fr)",
          },
          gap: { xs: 4, md: 8 },
          alignItems: "center",
          mt: 3,
        }}
      >
        <Stack
          component="section"
          spacing={3}
          sx={{
            display: { xs: "none", md: "flex" },
            backgroundColor: "#E9D6B5",
            p: 5,
            minHeight: 650,
            boxSizing: "border-box",
          }}
        >
          <Typography color="primary" sx={{ fontSize: 12, fontWeight: 500 }}>
            INVENTORY / WAREHOUSE TRANSFER
          </Typography>

          <Typography
            component="h2"
            variant="h3"
            sx={{ fontSize: { md: 36, lg: 40 }, lineHeight: 1.6 }}
          >
            Kho gọn.
            <br />
            Luồng hàng rõ.
          </Typography>

          <Typography sx={{ fontSize: 18, lineHeight: 1.6 }}>
            Quản lý tồn kho và phối hợp chuyển hàng trong một không gian làm
            việc chung.
          </Typography>

          <Box
            component="svg"
            viewBox="0 0 544 150"
            fill="none"
            aria-hidden="true"
            sx={{
              width: "100%",
              height: "auto",
              color: "primary.main",
              my: 1,
            }}
          >
            <g stroke="currentColor" strokeWidth="2">
              <path d="M16 134H528M36 134V16H238V134M306 134V16H508V134M36 72H238M306 72H508" />
              <path d="M54 30H122V72H54ZM144 38H212V72H144ZM54 86H122V134H54ZM144 94H212V134H144ZM326 30H394V72H326ZM414 38H486V72H414ZM326 86H394V134H326ZM414 94H486V134H414Z" />
              <path d="M88 30V42M178 38V50M360 30V42M450 38V50M250 80H294M280 66L294 80L280 94" />
            </g>
          </Box>

          <Typography
            color="primary"
            sx={{
              pt: 2,
              borderTop: 1,
              borderColor: "primary.main",
              fontSize: 14,
            }}
          >
            Tồn kho rõ ràng / Chuyển kho có kiểm soát
          </Typography>
        </Stack>

        <Stack
          component="section"
          spacing={3}
          sx={{
            width: "100%",
            maxWidth: 440,
            justifySelf: "center",
            py: { xs: 3, md: 4 },
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontSize: { xs: 30, md: 32 }, fontWeight: 400 }}
            >
              Chào mừng trở lại
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Đăng nhập để bắt đầu công việc hôm nay.
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
            aria-busy={busy}
            onSubmit={handleSubmit(async (values) => {
              if (busy) return;

              const success = await onLogin(values);
              if (success) setShowPassword(false);
            })}
          >
            <Stack spacing={3}>
              <Box>
                <Typography
                  component="label"
                  htmlFor="login-identifier"
                  sx={{
                    display: "block",
                    mb: 1.25,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Username hoặc email
                </Typography>

                <TextField
                  id="login-identifier"
                  placeholder="Nhập username hoặc email"
                  autoComplete="username"
                  autoFocus
                  fullWidth
                  error={Boolean(errors.identifier)}
                  helperText={errors.identifier?.message}
                  slotProps={{
                    input: { readOnly: busy },
                    htmlInput: {
                      autoCapitalize: "none",
                      spellCheck: false,
                    },
                  }}
                  {...register("identifier")}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="login-password"
                  sx={{
                    display: "block",
                    mb: 1.25,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Mật khẩu
                </Typography>

                <TextField
                  id="login-password"
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  fullWidth
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      readOnly: busy,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            edge="end"
                            disabled={busy}
                            aria-label={
                              showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                            }
                            aria-pressed={showPassword}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setShowPassword((value) => !value)}
                          >
                            <SvgIcon sx={{ fontSize: 22 }} viewBox="0 0 24 24">
                              <g
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                                {showPassword && <path d="M3 3 21 21" />}
                              </g>
                            </SvgIcon>
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register("password")}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy}
                fullWidth
                sx={{ minHeight: 52 }}
              >
                {busy ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </Stack>
          </Box>

          <Typography
            color="text.secondary"
            sx={{
              pt: 3,
              borderTop: 1,
              borderColor: "divider",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Cần tài khoản hoặc hỗ trợ? Liên hệ quản trị viên.
          </Typography>
        </Stack>
      </Box>

      <Typography
        component="footer"
        color="text.secondary"
        sx={{ mt: 3, fontSize: 12 }}
      >
        Không gian làm việc cho tồn kho và chuyển hàng.
      </Typography>
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: "240px minmax(0, 1fr)",
        },
        minHeight: "100dvh",
      }}
    >
      <Box
        component="aside"
        sx={{
          backgroundColor: "#F2EDE4",
          p: { xs: 3, md: 3.5 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box
            component="img"
            src="/brand-mark.svg"
            alt=""
            sx={{ width: 30, height: 30 }}
          />

          <Box>
            <Typography sx={{ fontSize: 21, fontWeight: 700 }}>
              Inventory
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 9, letterSpacing: 0.4 }}
            >
              WAREHOUSE TRANSFER
            </Typography>
          </Box>
        </Stack>

        <Box
          component="nav"
          aria-label="Điều hướng chính"
          sx={{
            display: { xs: "none", md: "block" },
            mt: 4,
            pt: 3,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            color="text.secondary"
            sx={{ fontSize: 10, mb: 3, letterSpacing: 0.5 }}
          >
            KHÔNG GIAN LÀM VIỆC
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            aria-current="page"
            sx={{
              alignItems: "center",
              color: "primary.main",
              py: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <SvgIcon viewBox="0 0 24 24">
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
              </g>
            </SvgIcon>

            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
              Tài khoản
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          minWidth: 0,
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ fontSize: 11, letterSpacing: 0.5 }}
        >
          TÀI KHOẢN / THÔNG TIN HIỆN HÀNH
        </Typography>

        <Typography
          component="h1"
          variant="h4"
          sx={{ mt: 3, fontSize: { xs: 30, md: 36 } }}
        >
          Tài khoản của bạn
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Thông tin và quyền truy cập trong hệ thống.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 2fr) minmax(0, 1fr)",
            },
            gap: { xs: 4, lg: 8 },
            mt: 3,
            pt: 3,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            <Box>
              <Typography
                component="h2"
                sx={{
                  fontSize: 26,
                  fontWeight: 500,
                  overflowWrap: "anywhere",
                }}
              >
                {user.username}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 0.5, overflowWrap: "anywhere" }}
              >
                {user.email}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#30654D",
                }}
              />
              <Typography sx={{ fontSize: 13, color: "#30654D" }}>
                {user.status === "ACTIVE" ? "Đang hoạt động" : user.status}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "minmax(0, 1fr) minmax(0, 2fr)",
                },
                gap: 3,
                py: 3,
                borderTop: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Box>
                <Typography color="text.secondary" sx={{ fontSize: 13, mb: 1 }}>
                  Vai trò
                </Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {roleLabels[user.role] ?? user.role}
                </Typography>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography color="text.secondary" sx={{ fontSize: 13, mb: 1 }}>
                  Kho phụ trách (ID)
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 500,
                    overflowWrap: "anywhere",
                  }}
                >
                  {user.assignedWarehouseId ?? "Chưa được phân công"}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography component="h2" variant="h5">
                Quyền bổ sung
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 2, fontSize: 14 }}>
                Bạn vẫn có các quyền mặc định theo vai trò.
              </Typography>

              {user.additionalPermissions.length === 0 ? (
                <Typography sx={{ mt: 3 }}>Không có quyền bổ sung.</Typography>
              ) : (
                <Stack
                  component="ul"
                  spacing={2.5}
                  sx={{ mt: 3, mb: 0, p: 0, listStyle: "none" }}
                >
                  {user.additionalPermissions.map((permission) => (
                    <Stack
                      component="li"
                      key={permission}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "flex-start" }}
                    >
                      <SvgIcon
                        viewBox="0 0 24 24"
                        sx={{
                          fontSize: 20,
                          color: "primary.main",
                          flexShrink: 0,
                          mt: 0.25,
                        }}
                      >
                        <path
                          d="m4 12 5 5L20 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </SvgIcon>
                      <Typography sx={{ overflowWrap: "anywhere" }}>
                        {permissionLabels[permission] ?? permission}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>

          <Stack
            component="section"
            spacing={3}
            sx={{
              minWidth: 0,
              borderTop: { xs: 1, lg: 0 },
              borderColor: "divider",
              pt: { xs: 3, lg: 0 },
            }}
          >
            <Typography component="h2" variant="h5">
              Phiên làm việc
            </Typography>

            <Typography color="text.secondary">
              Thông tin được lấy từ hệ thống sau khi xác thực tài khoản.
            </Typography>

            <Typography color="text.secondary">
              Đăng xuất khi bạn hoàn tất công việc trên thiết bị dùng chung.
            </Typography>

            <Button
              variant="outlined"
              onClick={onLogout}
              fullWidth
              sx={{ minHeight: 52, borderColor: "divider" }}
            >
              Đăng xuất
            </Button>

            <Typography
              color="text.secondary"
              sx={{
                pt: 3,
                borderTop: 1,
                borderColor: "divider",
                fontSize: 14,
              }}
            >
              Cần thay đổi quyền? Liên hệ quản trị viên.
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
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
