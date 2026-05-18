import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_DEFAULT_CHAIN: z.string().default("celo"),
  NEXT_PUBLIC_MINIPAY_ONLY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default("support@yieldcopilot.app"),
  API_BASE_URL: z.string().url().default("http://localhost:4000")
});

const serverEnvSchema = publicEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini")
});

export function readPublicEnv(env: Record<string, string | undefined>) {
  return publicEnvSchema.parse(env);
}

export function readServerEnv(env: Record<string, string | undefined>) {
  return serverEnvSchema.parse(env);
}
