import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getMe, login, tokenStorage } from "@/lib/auth";

type Session = {
  id: number;
  token: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export function useAuthSession() {
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const nextSessionId = useRef(0);
  const busyRef = useRef(false);

  const activateSession = useCallback((token: string) => {
    const nextSession = {
      id: ++nextSessionId.current,
      token,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const savedToken = await tokenStorage.get();

        if (active && savedToken) {
          activateSession(savedToken);
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
  }, [activateSession]);

  const profileQuery = useQuery({
    queryKey: ["auth", "me", session?.id ?? 0],
    queryFn: ({ signal }) => {
      if (!session) {
        throw new Error("Chưa có phiên đăng nhập.");
      }

      return getMe(session.token, signal);
    },
    enabled: session !== null && !restoring,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: false,
    networkMode: "always",
  });

  const endSession = useCallback(
    async (expectedSessionId: number, message: string | null) => {
      if (busyRef.current || sessionRef.current?.id !== expectedSessionId) {
        return;
      }

      busyRef.current = true;
      setBusy(true);
      setError(message);

      // Ngắt phiên ngay để phản hồi cũ không được hiển thị lại.
      sessionRef.current = null;
      setSession(null);

      try {
        await queryClient.cancelQueries();
        queryClient.clear();
        await tokenStorage.clear();
      } catch (cause) {
        setError(
          [
            message,
            "Không thể xóa token đã lưu trên thiết bị.",
            errorMessage(cause),
          ]
            .filter(Boolean)
            .join(" "),
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (
      !busy &&
      session &&
      profileQuery.error instanceof ApiError &&
      profileQuery.error.status === 401
    ) {
      const timeout = setTimeout(() => {
        void endSession(
          session.id,
          "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.",
        );
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [busy, session, profileQuery.error, endSession]);

  async function signIn(identifier: string, password: string) {
    if (busyRef.current || restoring || sessionRef.current) {
      return false;
    }

    if (!identifier.trim() || !password) {
      setError("Nhập tài khoản và mật khẩu.");
      return false;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const result = await login(identifier.trim(), password);

      await tokenStorage.set(result.accessToken);
      activateSession(result.accessToken);

      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function signOut() {
    const currentSession = sessionRef.current;

    if (currentSession) {
      await endSession(currentSession.id, null);
    }
  }

  function retryProfile() {
    if (!sessionRef.current || busyRef.current) return;

    setError(null);
    void profileQuery.refetch();
  }

  return {
    hasSession: session !== null,
    user: session ? (profileQuery.data ?? null) : null,
    restoring,
    busy,
    error,
    profileError:
      session && profileQuery.error ? errorMessage(profileQuery.error) : null,
    refreshing: session !== null && profileQuery.isFetching,
    signIn,
    signOut,
    retryProfile,
  };
}
