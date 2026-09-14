import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // react-hooks v6 can't see await boundaries and flags the standard
      // fetch-on-mount loader pattern. Keep it visible, not blocking.
      "react-hooks/set-state-in-effect": "warn",
      // PII must never reach logs; route everything through lib/logger.ts.
      "no-console": "error",
    },
  },
  {
    files: ["src/lib/logger.ts", "scripts/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    "public/swe-worker-*.js",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
