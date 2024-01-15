import dotenv from "dotenv";

dotenv.config();

if (
  !process.env.OPENPIPE_BASE_URL_PROD ||
  !process.env.OPENPIPE_BASE_URL_LOCAL ||
  !process.env.OPENPIPE_API_KEY_PROD ||
  !process.env.OPENPIPE_API_KEY_LOCAL
) {
  throw new Error("Environment variables for production are not set");
}

let OPENPIPE_API_URL: string;
let OPENPIPE_API_KEY: string;

if (process.env.ENVIRONMENT === "production") {
  OPENPIPE_API_URL = process.env.OPENPIPE_BASE_URL_PROD;
  OPENPIPE_API_KEY = process.env.OPENPIPE_API_KEY_PROD;
} else {
  OPENPIPE_API_URL = process.env.OPENPIPE_BASE_URL_LOCAL;
  OPENPIPE_API_KEY = process.env.OPENPIPE_API_KEY_LOCAL;
}

const TEST_LAST_LOGGED = process.env.ENVIRONMENT === "local" ? true : false;

export { OPENPIPE_API_URL, OPENPIPE_API_KEY, TEST_LAST_LOGGED };
