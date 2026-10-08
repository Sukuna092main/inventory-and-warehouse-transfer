import { useState } from "react";
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
import { CurrentUser } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";
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

export default function HomeScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    hasSession,
    user,
    restoring,
    busy,
    error,
    profileError,
    refreshing,
    signIn,
    signOut,
    retryProfile,
  } = useAuthSession();

  async function handleLogin() {
    const succeeded = await signIn(identifier, password);

    if (succeeded) {
      setPassword("");
      setShowPassword(false);
    }
  }

  async function handleLogout() {
    setPassword("");
    setShowPassword(false);
    await signOut();
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
              ) : hasSession ? (
                <View style={styles.fields}>
                  <Text variant="headlineSmall">Xác nhận tài khoản</Text>

                  {refreshing && (
                    <>
                      <ActivityIndicator />
                      <Text>Đang tải thông tin tài khoản...</Text>
                    </>
                  )}

                  {profileError && (
                    <>
                      <Text style={styles.error}>{profileError}</Text>
                      <Text>
                        Chưa xác nhận được tài khoản và quyền. Phiên đăng nhập
                        vẫn được giữ trên thiết bị.
                      </Text>
                      <Button
                        mode="contained"
                        disabled={busy || refreshing}
                        onPress={retryProfile}
                      >
                        Thử lại
                      </Button>
                    </>
                  )}

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
                  {refreshing && (
                    <Text>Đang xác nhận lại tài khoản và quyền...</Text>
                  )}

                  {profileError && (
                    <View style={styles.fields}>
                      <Text style={styles.error}>
                        Chưa cập nhật được tài khoản: {profileError}
                      </Text>
                      <Text>
                        Thông tin và quyền đang hiển thị là dữ liệu cũ, chưa
                        được xác nhận lại.
                      </Text>
                      <Button
                        mode="outlined"
                        disabled={busy || refreshing}
                        onPress={retryProfile}
                      >
                        Thử lại
                      </Button>
                    </View>
                  )}

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
