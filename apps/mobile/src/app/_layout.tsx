import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6B4428",
    secondary: "#9C5B35",
    background: "#E9D6B5",
    surface: "#FFF9EC",
    onSurface: "#2D2118",
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}
