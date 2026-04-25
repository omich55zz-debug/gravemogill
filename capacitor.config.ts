import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.gravemogils.app",
  appName: "Кладбище мистера Королёва",
  webDir: "dist",
  backgroundColor: "#0b0b12",
  android: {
    backgroundColor: "#0b0b12",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#0b0b12",
    contentInset: "always",
  },
};

export default config;
