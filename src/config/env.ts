import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

interface Config {
  ENV: string;
  PORT: string;
  FIREBASE_CREDENTIALS: string;
}

function loadConfig(): Config {
  return {
    ENV: getEnv("ENV", "development"),
    PORT: getEnv("PORT", "8080"),
    FIREBASE_CREDENTIALS: resolvePath(
      getEnv("FIREBASE_CREDENTIALS", "./configs/firebase_config.json")
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

function resolvePath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

export const env = loadConfig();
