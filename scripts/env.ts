import nextEnv from "@next/env";

// Match Next.js precedence, including shell overrides and ignored .env.local.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
