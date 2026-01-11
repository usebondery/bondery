import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * Configuration for environment variable validation
 */
export interface EnvCheckConfig {
  /** Environment type: 'production' or 'development' */
  environment: "production" | "development";
  /** Absolute path to the app directory */
  appPath: string;
  /** List of required environment variable names */
  requiredVars: string[];
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

/**
 * Parses an .env file and returns key-value pairs
 */
function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};

  content.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      const value = valueParts.join("=").trim();
      if (key && value) {
        env[key.trim()] = value;
      }
    }
  });

  return env;
}

/**
 * Checks if all required environment variables are defined.
 * Exits with error code 1 if any required variables are missing.
 *
 * @param config - Configuration object for env validation
 * @throws Exits process with code 1 if validation fails
 *
 * @example
 * ```typescript
 * checkEnvVariables({
 *   environment: 'production',
 *   appPath: __dirname,
 *   requiredVars: ['API_URL', 'API_KEY']
 * });
 * ```
 */
export function checkEnvVariables(config: EnvCheckConfig): void {
  const { environment, appPath, requiredVars } = config;
  const envFile = `.env.${environment}.local`;
  const envFilePath = resolve(appPath, envFile);

  console.log(
    `\n${colors.blue}🔍 Checking environment variables...${colors.reset}`
  );
  console.log(`   Environment: ${colors.green}${environment}${colors.reset}`);

  // Check if env file exists (optional for CI/CD environments like Vercel)
  const fileExists = existsSync(envFilePath);
  
  if (fileExists) {
    console.log(`   Source: ${colors.green}${envFile}${colors.reset}\n`);
  } else {
    console.log(`   Source: ${colors.yellow}process.env (CI/CD mode)${colors.reset}\n`);
  }

  // Parse env file if it exists
  const envVars = fileExists ? parseEnvFile(envFilePath) : {};

  // Merge with process.env (process.env takes precedence for CI/CD)
  const allEnv = { ...envVars, ...process.env };

  // Check for missing variables
  const missing: string[] = [];

  requiredVars.forEach((varName) => {
    if (!allEnv[varName] || allEnv[varName] === "") {
      missing.push(varName);
    }
  });

  // Report results
  if (missing.length > 0) {
    console.error(
      `${colors.red}❌ Missing required environment variables:${colors.reset}\n`
    );
    missing.forEach((varName) => {
      console.error(`   ${colors.red}✗${colors.reset} ${varName}`);
    });
    
    if (fileExists) {
      console.error(
        `\n${colors.yellow}Please add these variables to ${envFile} or set them in your environment${colors.reset}`
      );
    } else {
      console.error(
        `\n${colors.yellow}Please set these variables in your CI/CD environment (e.g., Vercel dashboard)${colors.reset}`
      );
    }
    process.exit(1);
  }

  console.log(
    `${colors.green}✅ All ${requiredVars.length} required environment variables are set${colors.reset}\n`
  );
}
