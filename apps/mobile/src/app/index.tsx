import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
} from "react-native-paper";
import {
  ApiError,
  getMe,
  login,
  tokenStorage,
  type CurrentUser,
} from "@/lib/auth";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const roleLabels: Record<CurrentUser["role"], string> = {
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

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export default function HomeScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const savedToken = await tokenStorage.get();
        if (!savedToken) return;

        try {
          const currentUser = await getMe(savedToken);
          if (active) setUser(currentUser);
        } catch (cause) {
          if (cause instanceof ApiError && cause.status === 401) {
            await tokenStorage.clear();
            if (active)
              setError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
          } else if (active) {
            setError(errorMessage(cause));
          }
        }
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        if (active) setRestoring(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError("Nhập tài khoản và mật khẩu.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await login(identifier.trim(), password);
      const currentUser = await getMe(result.accessToken);
      await tokenStorage.set(result.accessToken);
      setPassword("");
      setShowPassword(false);
      setUser(currentUser);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError(null);

    try {
      await tokenStorage.clear();
      setShowPassword(false);
      setUser(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          persistentScrollbar={Platform.OS === "android"}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.brand}>
                📦 Inventory & Warehouse Transfer
              </Text>

              {restoring ? (
                <ActivityIndicator style={styles.loading} />
              ) : user ? (
                <View style={styles.fields}>
                  <Text variant="headlineSmall">Xin chào, {user.username}</Text>
                  <Text>{user.email}</Text>
                  <Text>Vai trò: {roleLabels[user.role]}</Text>
                  <Text>
                    Kho phụ trách:{" "}
                    {user.assignedWarehouseId ?? "Chưa được phân công"}
                  </Text>
                  <View style={styles.permissionSection}>
                    <Text variant="titleSmall">Quyền bổ sung</Text>

                    {user.additionalPermissions.length === 0 ? (
                      <Text>Không có quyền bổ sung.</Text>
                    ) : (
                      <View style={styles.permissionList}>
                        {user.additionalPermissions.map((permission) => (
                          <Chip
                            key={permission}
                            mode="outlined"
                            style={styles.permissionChip}
                          >
                            {permissionLabels[permission] ?? permission}
                          </Chip>
                        ))}
                      </View>
                    )}
                  </View>
                  {error && <Text style={styles.error}>{error}</Text>}
                  <Button
                    mode="outlined"
                    disabled={busy}
                    onPress={() => void handleLogout()}
                  >
                    {busy ? "Đang đăng xuất..." : "Đăng xuất"}
                  </Button>
                </View>
              ) : (
                <View style={styles.fields}>
                  <Text variant="headlineMedium">Đăng nhập</Text>
                  <Text>Đăng nhập để quản lý kho và phiếu chuyển kho.</Text>

                  {error && <Text style={styles.error}>{error}</Text>}

                  <TextInput
                    label="Username hoặc email"
                    mode="outlined"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={identifier}
                    onChangeText={setIdentifier}
                    editable={!busy}
                  />
                  <TextInput
                    label="Mật khẩu"
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={setPassword}
                    editable={!busy}
                    right={
                      <TextInput.Icon
                        icon={({ size, color }) => (
                          <MaterialCommunityIcons
                            name={showPassword ? "eye-off" : "eye"}
                            size={size}
                            color={color}
                          />
                        )}
                        onPress={() => setShowPassword((previous) => !previous)}
                        accessibilityLabel={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                        disabled={busy}
                        forceTextInputFocus={false}
                      />
                    }
                  />
                  <Button
                    mode="contained"
                    disabled={busy}
                    onPress={() => void handleLogin()}
                  >
                    {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#E9D6B5" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: { backgroundColor: "#FFF9EC" },
  brand: { color: "#6B4428", fontWeight: "700", marginBottom: 24 },
  fields: { gap: 16 },
  loading: { marginVertical: 32 },
  error: { color: "#B3261E" },
  permissionSection: {
    gap: 8,
  },
  permissionList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  permissionChip: {
    maxWidth: "100%",
  },
});
