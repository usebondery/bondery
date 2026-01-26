import { checkEnvVariables } from "@bondery/helpers/check-env";
import { resolve } from "path";

const environment = (process.env.NODE_ENV || "development") as "production" | "development";

checkEnvVariables({
  environment,
  appPath: resolve(__dirname, ".."),
  requiredVars: ["NEXT_PUBLIC_WEBAPP_URL"],
});
