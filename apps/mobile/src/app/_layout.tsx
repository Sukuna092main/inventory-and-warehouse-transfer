import { useEffect } from "react";
import { Text as NativeText, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  configureFonts,
  MD3LightTheme,
  PaperProvider,
} from "react-native-paper";

import { AbyssinicaSIL_400Regular } from "@expo-google-fonts/abyssinica-sil/400Regular";
import { Roboto_400Regular } from "@expo-google-fonts/roboto/400Regular";
import { Roboto_500Medium } from "@expo-google-fonts/roboto/500Medium";
import { Roboto_700Bold } from "@expo-google-fonts/roboto/700Bold";

import QueryProvider from "../providers/query-provider";

import AuthProvider from "@/providers/auth-provider";

void SplashScreen.preventAutoHideAsync().catch(() => {
  console.warn("Không giữ được màn hình khởi động.");
});

const fonts = configureFonts({
  config: {
    fontFamily: "Roboto_400Regular",
    fontWeight: "400",
  },
});

const headingFont = {
  fontFamily: "AbyssinicaSIL_400Regular",
  fontWeight: "400" as const,
};

const mediumFont = {
  fontFamily: "Roboto_500Medium",
  fontWeight: "400" as const,
};

const theme = {
  ...MD3LightTheme,
  roundness: 1,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6B4428",
    onPrimary: "#FFFFFF",
    primaryContainer: "#E9D6B5",
    onPrimaryContainer: "#2D2924",
    secondary: "#9C5B35",
    background: "#FAF8F4",
    onBackground: "#2D2924",
    surface: "#FFFFFF",
    onSurface: "#2D2924",
    surfaceVariant: "#F2EDE4",
    onSurfaceVariant: "#756F65",
    outline: "#756F65",
    outlineVariant: "#DDD6CB",
  },
  fonts: {
    ...fonts,
    headlineLarge: {
      ...fonts.headlineLarge,
      ...headingFont,
    },
    headlineMedium: {
      ...fonts.headlineMedium,
      ...headingFont,
    },
    headlineSmall: {
      ...fonts.headlineSmall,
      ...headingFont,
    },
    titleLarge: {
      ...fonts.titleLarge,
      ...headingFont,
    },
    titleMedium: {
      ...fonts.titleMedium,
      ...mediumFont,
    },
    titleSmall: {
      ...fonts.titleSmall,
      ...mediumFont,
    },
    labelLarge: {
      ...fonts.labelLarge,
      ...mediumFont,
    },
    labelMedium: {
      ...fonts.labelMedium,
      ...mediumFont,
    },
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AbyssinicaSIL_400Regular,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (fontError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#FAF8F4",
        }}
      >
        <NativeText
          accessibilityRole="alert"
          style={{ color: "#2D2924", fontSize: 16 }}
        >
          Không tải được font chữ. Vui lòng đóng và mở lại ứng dụng.
        </NativeText>
      </View>
    );
  }

  return (
    <QueryProvider>
      <AuthProvider>
        <PaperProvider theme={theme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
            }}
          />
        </PaperProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
