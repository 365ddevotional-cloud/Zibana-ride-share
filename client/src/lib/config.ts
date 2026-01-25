type Environment = "development" | "staging" | "production";

interface AppConfig {
  environment: Environment;
  apiBaseUrl: string;
  appName: string;
  appVersion: string;
  debug: boolean;
  features: {
    testAccounts: boolean;
    debugPanel: boolean;
    mockPayments: boolean;
  };
}

function getEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;
  if (env === "production") return "production";
  if (env === "staging") return "staging";
  return "development";
}

function getConfig(): AppConfig {
  const environment = getEnvironment();
  
  const baseConfig = {
    appName: "ZIBA",
    appVersion: "1.0.0",
  };

  switch (environment) {
    case "production":
      return {
        ...baseConfig,
        environment: "production",
        apiBaseUrl: import.meta.env.VITE_API_URL || "",
        debug: false,
        features: {
          testAccounts: false,
          debugPanel: false,
          mockPayments: false,
        },
      };

    case "staging":
      return {
        ...baseConfig,
        environment: "staging",
        apiBaseUrl: import.meta.env.VITE_API_URL || "",
        debug: false,
        features: {
          testAccounts: true,
          debugPanel: false,
          mockPayments: true,
        },
      };

    default:
      return {
        ...baseConfig,
        environment: "development",
        apiBaseUrl: "",
        debug: true,
        features: {
          testAccounts: true,
          debugPanel: true,
          mockPayments: true,
        },
      };
  }
}

export const config = getConfig();

export function isProduction(): boolean {
  return config.environment === "production";
}

export function isDevelopment(): boolean {
  return config.environment === "development";
}

export function isStaging(): boolean {
  return config.environment === "staging";
}
