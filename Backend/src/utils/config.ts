/**
 * Environment Configuration & Validation
 * Validates and exposes all environment variables with type safety
 */

import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "./logger";

// Ensure environment variables from .env are loaded prior to validation
dotenv.config();

export type currentEnviromentType = "Production" | "Test" | "Development";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DEVELOPMENT_DEPLOYMENT_URI: z.string(),
  TEST_DEPLOYMENT_URI: z.string(),
  PRODUCTION_DEPLOYMENT_URI: z.string(),
  PORT: z.string().regex(/^\d+$/).default("5000").transform(Number),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for production").default(""),
  JWT_EXPIRES_IN: z.string().default("7d"),
  RESEND_EMAIL_API: z.string(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GEMINI_FALL_BACK_KEY: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(), // Comma-separated string for Rotation Policy Implementation (RPI)
  OPENAI_API_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MAX_REQUEST_SIZE: z.string().default("10mb"),
  REQUEST_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default(30000),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default(900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default(100),
  ENABLE_RATE_LIMITER: z
    .string()
    .transform((val) => val === "true")
    .default(true),
  AUTH_RATE_LIMITER: z.string().regex(/^\d+$/).default("100").transform(Number),
  AI_RATE_LIMITER: z.string().regex(/^\d+$/).default("100").transform(Number),
  API_RATE_LIMITER: z.string().regex(/^\d+$/).default("1000").transform(Number),
  ENABLE_DEBUG_LOGGING: z
    .string()
    .transform((val) => val === "true")
    .default(false),
  APP_VERSION: z.string().default("1.10.0"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.string().regex(/^\d+$/).default("6379").transform(Number),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);

    // Additional validation for production
    if (env.NODE_ENV === "production") {
      if (!env.JWT_SECRET || env.JWT_SECRET === "default_fallback_secret_key_change_in_production") {
        throw new Error(
          "CRITICAL: JWT_SECRET must be set to a secure random value in production. " +
            "Generate with: openssl rand -base64 32"
        );
      }

      if (
        !env.GOOGLE_GENERATIVE_AI_API_KEY &&
        !env.GEMINI_API_KEYS &&
        !env.GEMINI_FALL_BACK_KEY &&
        !env.OPENAI_API_KEY
      ) {
        logger.warn("No AI API keys configured. Meeting summarization will use fallback heuristics.", {
          environment: "production",
        });
      }
    }

    return env;
  } catch (error) {
    logger.error(
      "Environment validation failed. Please check .env file and required variables.",
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

export const config = validateEnv();

/**
 * Get environment variable with fallback
 */
export const getEnv = (key: keyof EnvConfig, fallback?: string): string => {
  const value = config[key];
  if (value === undefined && !fallback) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return String(value || fallback || "");
};

/**
 * Check if running in production
 */
export const isProduction = () => config.NODE_ENV === "production";
export const isDevelopment = () => config.NODE_ENV === "development";
export const isTest = () => config.NODE_ENV === "test";
export const getCurrentEnviroment = (): currentEnviromentType => {
  if (isProduction()) {
    return "Production";
  }

  if (isTest()) {
    return "Test";
  }

  return "Development";
};
