import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import { useAuthSessionState } from "@/hooks/use-auth-session";

type AuthContextValue = ReturnType<typeof useAuthSessionState>;

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: PropsWithChildren) {
  const auth = useAuthSessionState();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthContextValue {
  const auth = useContext(AuthContext);

  if (auth === null) {
    throw new Error("useAuthSession phải được dùng bên trong AuthProvider.");
  }

  return auth;
}
