import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import { CurrentUser } from "@/lib/auth";
import { useAuthSession } from "@/providers/auth-provider";
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
          <View style={styles.screen}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons
                name="cube-outline"
                size={30}
                color="#6B4428"
                accessible={false}
              />

              <View>
                <Text style={styles.brandName}>Inventory</Text>
                <Text style={styles.brandSubtitle}>WAREHOUSE TRANSFER</Text>
              </View>
            </View>

            {restoring ? (
              <ActivityIndicator style={styles.loading} />
            ) : user ? (
              <View style={styles.account}>
                <View style={styles.accountIntro}>
                  <Text variant="headlineMedium">Tài khoản</Text>
                  <Text style={styles.description}>
                    Thông tin và quyền truy cập hiện hành.
                  </Text>
                </View>

                {user.role === "ADMIN" && (
                  <Button
                    mode="contained"
                    disabled={busy || Boolean(profileError)}
                    onPress={() => router.push("/users")}
                    style={styles.accountButton}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                  >
                    Quản lý người dùng
                  </Button>
                )}

                {refreshing && (
                  <View style={styles.refreshRow}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.refreshText}>
                      Đang xác nhận lại tài khoản và quyền...
                    </Text>
                  </View>
                )}

                {profileError && (
                  <View style={styles.profileNotice}>
                    <Text accessibilityRole="alert" style={styles.error}>
                      Chưa cập nhật được tài khoản: {profileError}
                    </Text>
                    <Text style={styles.description}>
                      Thông tin và quyền bên dưới là dữ liệu cũ, chưa được xác
                      nhận lại. Phiên đăng nhập vẫn được giữ trên thiết bị.
                    </Text>
                    <Button
                      mode="outlined"
                      disabled={busy || refreshing}
                      onPress={retryProfile}
                      style={styles.accountButton}
                      contentStyle={styles.buttonContent}
                      labelStyle={styles.buttonLabel}
                    >
                      Thử lại
                    </Button>
                  </View>
                )}

                <View style={styles.accountSection}>
                  <Text style={styles.accountUsername}>{user.username}</Text>
                  <Text style={styles.description}>{user.email}</Text>

                  <View style={styles.accountStatus}>
                    <View style={styles.statusDot} accessible={false} />
                    <Text style={styles.statusText}>
                      {profileError
                        ? "Đang hoạt động — theo dữ liệu đã tải"
                        : "Đang hoạt động"}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountSection}>
                  <View style={styles.accountField}>
                    <Text style={styles.accountLabel}>Vai trò</Text>
                    <Text style={styles.accountValue}>
                      {roleLabels[user.role] ?? user.role}
                    </Text>
                  </View>

                  <View style={styles.accountField}>
                    <Text style={styles.accountLabel}>Kho phụ trách (ID)</Text>
                    <Text style={styles.warehouseId}>
                      {user.assignedWarehouseId ?? "Chưa được phân công"}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountSection}>
                  <Text variant="titleLarge">Quyền bổ sung</Text>

                  {user.additionalPermissions.length === 0 ? (
                    <Text>Không có quyền bổ sung.</Text>
                  ) : (
                    <View style={styles.accountPermissions}>
                      {user.additionalPermissions.map((permission) => (
                        <View key={permission} style={styles.permissionRow}>
                          <MaterialCommunityIcons
                            name="check"
                            size={20}
                            color="#6B4428"
                            accessible={false}
                          />
                          <Text style={styles.permissionText}>
                            {permissionLabels[permission] ?? permission}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.accountHint}>
                    Bạn vẫn có các quyền mặc định theo vai trò.
                  </Text>
                </View>

                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}

                <Button
                  mode="outlined"
                  disabled={busy}
                  loading={busy}
                  onPress={() => void handleLogout()}
                  style={styles.accountButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
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
                      Chưa xác nhận được tài khoản và quyền. Phiên đăng nhập vẫn
                      được giữ trên thiết bị.
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
              <View style={styles.loginForm}>
                <View style={styles.loginIntro}>
                  <Text variant="headlineMedium" style={styles.loginHeading}>
                    {"Chào mừng\ntrở lại."}
                  </Text>

                  <Text style={styles.description}>
                    Đăng nhập để quản lý tồn kho và phối hợp chuyển hàng.
                  </Text>
                </View>

                {error && (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username hoặc email</Text>

                  <TextInput
                    accessibilityLabel="Username hoặc email"
                    placeholder="Nhập username hoặc email"
                    mode="outlined"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    value={identifier}
                    onChangeText={setIdentifier}
                    editable={!busy}
                    outlineColor="#DDD6CB"
                    activeOutlineColor="#6B4428"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mật khẩu</Text>

                  <TextInput
                    accessibilityLabel="Mật khẩu"
                    placeholder="Nhập mật khẩu"
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    value={password}
                    onChangeText={setPassword}
                    editable={!busy}
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      if (!busy) void handleLogin();
                    }}
                    outlineColor="#DDD6CB"
                    activeOutlineColor="#6B4428"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={({ size, color }) => (
                          <MaterialCommunityIcons
                            name={
                              showPassword ? "eye-off-outline" : "eye-outline"
                            }
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
                </View>

                <Button
                  mode="contained"
                  disabled={busy}
                  loading={busy}
                  onPress={() => void handleLogin()}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {busy ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>

                <View style={styles.loginSupport}>
                  <Text style={styles.description}>
                    {"Cần tài khoản hoặc hỗ trợ?\nLiên hệ quản trị viên."}
                  </Text>
                </View>

                <Text style={styles.footer}>
                  INVENTORY / WAREHOUSE TRANSFER
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF8F4",
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  loading: { marginVertical: 32 },
  error: { color: "#B3261E" },
  screen: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD6CB",
  },
  brandName: {
    fontFamily: "Roboto_700Bold",
    fontWeight: "400",
    fontSize: 22,
    lineHeight: 28,
    color: "#2D2924",
  },
  brandSubtitle: {
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: "#756F65",
  },
  fields: {
    gap: 12,
  },
  loginForm: {
    gap: 24,
  },
  loginIntro: {
    gap: 20,
    marginBottom: 4,
  },
  loginHeading: {
    fontFamily: "AbyssinicaSIL_400Regular",
    fontWeight: "400",
    fontSize: 32,
    lineHeight: 44,
    color: "#2D2924",
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#756F65",
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontFamily: "Roboto_500Medium",
    fontWeight: "400",
    fontSize: 14,
    color: "#2D2924",
  },
  input: {
    backgroundColor: "#FFFFFF",
    fontSize: 16,
  },
  inputOutline: {
    borderRadius: 4,
  },
  loginButton: {
    borderRadius: 4,
  },
  buttonContent: {
    minHeight: 52,
  },
  buttonLabel: {
    fontFamily: "Roboto_500Medium",
    fontWeight: "400",
    fontSize: 16,
  },
  loginSupport: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#DDD6CB",
  },
  footer: {
    fontSize: 11,
    lineHeight: 18,
    color: "#756F65",
  },
  account: {
    gap: 24,
  },
  accountIntro: {
    gap: 12,
  },
  accountSection: {
    gap: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#DDD6CB",
  },
  accountUsername: {
    fontFamily: "Roboto_500Medium",
    fontWeight: "400",
    fontSize: 23,
    lineHeight: 32,
    color: "#2D2924",
  },
  accountStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#30654D",
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#30654D",
  },
  accountField: {
    gap: 8,
  },
  accountLabel: {
    fontSize: 13,
    color: "#756F65",
  },
  accountValue: {
    fontFamily: "Roboto_500Medium",
    fontWeight: "400",
    fontSize: 16,
    lineHeight: 24,
  },
  warehouseId: {
    fontFamily: "Roboto_500Medium",
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 22,
  },
  accountPermissions: {
    gap: 20,
    paddingVertical: 4,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  accountHint: {
    fontSize: 12,
    lineHeight: 20,
    color: "#756F65",
  },
  accountButton: {
    borderRadius: 4,
    borderColor: "#DDD6CB",
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  refreshText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#756F65",
  },
  profileNotice: {
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#DDD6CB",
  },
});
