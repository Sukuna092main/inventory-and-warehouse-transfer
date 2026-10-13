import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useFocusEffect } from "expo-router";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  IconButton,
  Menu,
  Text,
  TextInput,
} from "react-native-paper";
import { ApiError } from "@/lib/auth";
import type { CurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/users";
import type { UserListItem, UserListQuery } from "@/lib/users";
import { useAuthSession } from "@/providers/auth-provider";

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

function SelectionMenu({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      contentStyle={styles.menu}
      anchor={
        <Button
          mode="outlined"
          compact
          icon="menu-down"
          accessibilityLabel={`${label}: ${selected?.label ?? value}`}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            Keyboard.dismiss();
            setOpen(true);
          }}
          style={styles.button}
          contentStyle={styles.selectContent}
          labelStyle={styles.filterLabel}
        >
          {selected?.label ?? value}
        </Button>
      }
    >
      {options.map((option) => (
        <Menu.Item
          key={option.value}
          title={option.label}
          trailingIcon={option.value === value ? "check" : undefined}
          accessibilityLabel={`${option.label}${option.value === value ? ", đã chọn" : ""}`}
          onPress={() => {
            onSelect(option.value);
            setOpen(false);
          }}
        />
      ))}
    </Menu>
  );
}

function UserRow({ item }: { item: UserListItem }) {
  const active = item.status === "ACTIVE";
  return (
    <View style={styles.userRow}>
      <View style={styles.identity}>
        <Text selectable style={styles.username}>
          {item.username}
        </Text>
        <View style={[styles.badge, !active && styles.inactiveBadge]}>
          <Text style={[styles.status, !active && styles.inactiveStatus]}>
            {active ? "Hoạt động" : "Vô hiệu hóa"}
          </Text>
        </View>
      </View>
      <Text selectable style={styles.muted}>
        {item.email}
      </Text>
      <Text style={styles.role}>{roleLabels[item.role] ?? item.role}</Text>
      <View style={styles.warehouse}>
        <Text style={styles.smallMuted}>Kho phụ trách (ID)</Text>
        <Text selectable style={styles.small}>
          {item.assignedWarehouseId ?? "Không được phân công"}
        </Text>
      </View>
      <Text style={styles.smallMuted}>
        Quyền bổ sung:{" "}
        {item.additionalPermissions.length
          ? item.additionalPermissions
              .map((code) => permissionLabels[code] ?? code)
              .join(" · ")
          : "Không có"}
      </Text>
    </View>
  );
}

export default function UsersScreen() {
  const auth = useAuthSession();
  const { expireSession } = auth;
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<UserListItem>>(null);
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<CurrentUser["role"] | "">("");
  const [status, setStatus] = useState<UserListItem["status"] | "">("");
  const [query, setQuery] = useState<UserListQuery>({ page: 0, size: 10 });
  const session = auth.session;
  const isAdmin = auth.user?.role === "ADMIN";

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const users = useQuery({
    queryKey: ["users", "list", session?.id ?? 0, query],
    queryFn: ({ signal }) => {
      if (!session) throw new Error("Chưa có phiên đăng nhập.");
      return getUsers(session.token, query, signal);
    },
    enabled: focused && Boolean(session) && isAdmin && !auth.profileError,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: false,
    networkMode: "always",
  });

  useEffect(() => {
    if (!session || !(users.error instanceof ApiError)) return;
    if (users.error.status === 401) {
      void expireSession(session.id);
    } else if (users.error.status === 403) {
      void queryClient.invalidateQueries({
        queryKey: ["auth", "me", session.id],
      });
    }
  }, [session, users.error, expireSession, queryClient]);

  function applyFilters(clear = false) {
    Keyboard.dismiss();
    if (clear) {
      setSearch("");
      setRole("");
      setStatus("");
    }
    const next: UserListQuery = {
      page: 0,
      size: query.size,
      search: clear ? undefined : search.trim() || undefined,
      role: clear ? undefined : role || undefined,
      status: clear ? undefined : status || undefined,
    };
    if (JSON.stringify(next) === JSON.stringify(query)) void users.refetch();
    else setQuery(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function changePage(page: number, size = query.size) {
    setQuery((previous) => ({ ...previous, page, size }));
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  if (auth.restoring)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  if (!session || (auth.user && !isAdmin)) return <Redirect href="/" />;
  if (!auth.user || auth.profileError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text variant="headlineSmall">Xác nhận quyền truy cập</Text>
        {auth.refreshing && <ActivityIndicator />}
        <Text accessibilityRole="alert" style={styles.muted}>
          {auth.profileError ?? "Đang kiểm tra tài khoản và quyền hiện hành…"}
        </Text>
        <Button
          disabled={auth.refreshing || auth.busy}
          onPress={auth.retryProfile}
        >
          Thử lại
        </Button>
        <Button onPress={() => router.replace("/")}>Về tài khoản</Button>
      </SafeAreaView>
    );
  }

  const data = users.isSuccess ? users.data : undefined;
  const outsidePage = Boolean(
    data && query.page > 0 && query.page >= data.totalPages,
  );
  const hasFilters = Boolean(query.search || query.role || query.status);
  const forbidden =
    users.error instanceof ApiError && users.error.status === 403;
  const header = (
    <View style={styles.header}>
      <View style={styles.nav}>
        <Button
          icon="arrow-left"
          onPress={() => router.replace("/")}
          labelStyle={styles.backLabel}
        >
          Tài khoản
        </Button>
        <Text style={styles.brand}>INVENTORY</Text>
      </View>
      <Text style={styles.heading}>Người dùng</Text>
      <Text style={styles.description}>
        Danh sách tài khoản trong hệ thống.
      </Text>
      <TextInput
        mode="outlined"
        placeholder="Username hoặc email"
        accessibilityLabel="Tìm theo username hoặc email"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        returnKeyType="search"
        onSubmitEditing={() => applyFilters()}
        outlineStyle={styles.inputOutline}
        outlineColor="#756F65"
        style={styles.input}
      />
      <View style={styles.filters}>
        <View style={styles.filter}>
          <Text style={styles.smallMuted}>Vai trò</Text>
          <SelectionMenu
            label="Vai trò"
            value={role}
            options={[
              { value: "", label: "Tất cả vai trò" },
              ...Object.entries(roleLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onSelect={(value) => setRole(value as typeof role)}
          />
        </View>
        <View style={styles.filter}>
          <Text style={styles.smallMuted}>Trạng thái</Text>
          <SelectionMenu
            label="Trạng thái"
            value={status}
            options={[
              { value: "", label: "Tất cả" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "INACTIVE", label: "Vô hiệu hóa" },
            ]}
            onSelect={(value) => setStatus(value as typeof status)}
          />
        </View>
      </View>
      <Button
        mode="contained"
        onPress={() => applyFilters()}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Tìm kiếm
      </Button>
      <View style={styles.summary}>
        <Text style={styles.muted}>
          {data ? `${data.total} người dùng` : ""}
        </Text>
        {users.isFetching && <ActivityIndicator size="small" />}
      </View>
      {auth.refreshing && (
        <Text style={styles.smallMuted}>
          Đang xác nhận lại tài khoản và quyền…
        </Text>
      )}
    </View>
  );

  const empty = users.isPending ? (
    <View style={styles.notice}>
      <ActivityIndicator />
      <Text style={styles.muted}>Đang tải danh sách người dùng…</Text>
    </View>
  ) : users.isError ? (
    <View style={styles.notice}>
      <Text variant="headlineSmall">
        {forbidden ? "Quyền truy cập đã thay đổi" : "Chưa tải được danh sách"}
      </Text>
      <Text accessibilityRole="alert" style={styles.muted}>
        {forbidden
          ? "Bạn không có quyền xem danh sách này. Hệ thống đang xác nhận lại tài khoản."
          : users.error.message}
      </Text>
      <Button
        mode="contained"
        loading={users.isFetching}
        disabled={users.isFetching}
        onPress={() => void users.refetch()}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Thử lại
      </Button>
      {forbidden && (
        <Button onPress={() => router.replace("/")}>Về tài khoản</Button>
      )}
    </View>
  ) : (
    <View style={styles.notice}>
      <Text variant="headlineSmall">
        {outsidePage
          ? "Trang này không còn dữ liệu"
          : hasFilters
            ? "Không tìm thấy tài khoản"
            : "Chưa có người dùng"}
      </Text>
      <Text style={styles.muted}>
        {outsidePage
          ? "Danh sách đã thay đổi. Quay về trang đầu để xem lại."
          : hasFilters
            ? "Thử đổi từ khóa, vai trò hoặc trạng thái để tìm tài khoản bạn cần."
            : "Danh sách hiện chưa có tài khoản. Bạn có thể tải lại để kiểm tra."}
      </Text>
      <Button
        mode="outlined"
        style={styles.button}
        contentStyle={styles.buttonContent}
        onPress={() =>
          outsidePage
            ? changePage(0)
            : hasFilters
              ? applyFilters(true)
              : void users.refetch()
        }
      >
        {outsidePage ? "Về trang đầu" : hasFilters ? "Xóa bộ lọc" : "Tải lại"}
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "android" ? "height" : "padding"}
      >
        <FlatList<UserListItem>
          ref={listRef}
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow item={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={
            data && !outsidePage ? (
              <View style={styles.pagination}>
                <SelectionMenu
                  label="Số người dùng mỗi trang"
                  value={String(query.size)}
                  options={[10, 20, 50, 100].map((size) => ({
                    value: String(size),
                    label: `${size} / trang`,
                  }))}
                  onSelect={(value) => changePage(0, Number(value))}
                />
                <View style={styles.pageButtons}>
                  <IconButton
                    icon="chevron-left"
                    accessibilityLabel="Trang trước"
                    disabled={query.page === 0 || users.isFetching}
                    onPress={() => changePage(query.page - 1)}
                    style={styles.pageButton}
                  />
                  <Text style={styles.muted}>
                    {data.totalPages ? query.page + 1 : 0} / {data.totalPages}
                  </Text>
                  <IconButton
                    icon="chevron-right"
                    accessibilityLabel="Trang tiếp theo"
                    disabled={
                      query.page + 1 >= data.totalPages || users.isFetching
                    }
                    onPress={() => changePage(query.page + 1)}
                    style={styles.pageButton}
                  />
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          persistentScrollbar={Platform.OS === "android"}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FAF8F4" },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
    backgroundColor: "#FAF8F4",
  },
  content: {
    flexGrow: 1,
    padding: 24,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  header: { gap: 20 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backLabel: { marginHorizontal: 0, fontSize: 15 },
  brand: { fontSize: 10, color: "#756F65", letterSpacing: 0.5 },
  heading: {
    fontFamily: "AbyssinicaSIL_400Regular",
    fontSize: 30,
    lineHeight: 42,
    color: "#2D2924",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#756F65",
    marginTop: -12,
  },
  input: { backgroundColor: "#FFFFFF", fontSize: 15 },
  inputOutline: { borderRadius: 4 },
  filters: { flexDirection: "row", gap: 14 },
  filter: { flex: 1, gap: 8, minWidth: 0 },
  filterLabel: { fontSize: 13, marginHorizontal: 8 },
  selectContent: { minHeight: 48, flexDirection: "row-reverse" },
  button: { borderRadius: 4, borderColor: "#DDD6CB" },
  buttonContent: { minHeight: 48 },
  menu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#DDD6CB",
  },
  summary: {
    borderTopWidth: 1,
    borderColor: "#DDD6CB",
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
  },
  userRow: {
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#DDD6CB",
  },
  identity: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  username: {
    flex: 1,
    fontFamily: "Roboto_500Medium",
    fontSize: 17,
    lineHeight: 25,
    color: "#2D2924",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: "#F2EDE4",
  },
  inactiveBadge: { backgroundColor: "#E9D6B5" },
  status: { fontSize: 12, color: "#30654D" },
  inactiveStatus: { color: "#6B4428" },
  role: {
    fontFamily: "Roboto_500Medium",
    fontSize: 14,
    lineHeight: 22,
    color: "#2D2924",
  },
  warehouse: { gap: 4 },
  muted: { fontSize: 13, lineHeight: 21, color: "#756F65" },
  smallMuted: { fontSize: 12, lineHeight: 19, color: "#756F65" },
  small: { fontSize: 12, lineHeight: 19, color: "#2D2924" },
  notice: { gap: 24, paddingTop: 64, paddingBottom: 32 },
  pagination: {
    paddingTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageButtons: { flexDirection: "row", gap: 6, alignItems: "center" },
  pageButton: {
    margin: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DDD6CB",
  },
});
