import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { AppState } from "react-native";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

export default function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  );

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === "active");

    const listener = AppState.addEventListener("change", (nextState) => {
      focusManager.setFocused(nextState === "active");
    });

    return () => {
      listener.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
