interface Config {
  ENV: string;
  PORT: string;
  FIREBASE_CREDENTIALS: string;
}

function loadConfig(): Config {
  return {
    ENV: getEnv("ENV", "development"),
    PORT: getEnv("PORT", "8080"),
    FIREBASE_CREDENTIALS: getEnv(
      "FIREBASE_CREDENTIALS",
      "configs/firebase_config.json"
    )
  };
}

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = loadConfig();
