import { isProduction } from "@/lib/utils";

interface LogLevel {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug: (message: string) => void;
}

// Logger utility that only works in development
export const logger: LogLevel = {
  info: (message: string) => {
    if (!isProduction) {
      console.log(`[INFO] ${message}`);
    }
  },
  warn: (message: string) => {
    if (!isProduction) {
      console.warn(`[WARN] ${message}`);
    }
  },
  error: (message: string) => {
    if (!isProduction) {
      console.error(`[ERROR] ${message}`);
    }
  },
  debug: (message: string) => {
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`);
    }
  },
};
