import dotenv from "dotenv";

dotenv.config();

let OPENPIPE_BASE_URL: string;
let OPENPIPE_API_KEY: string;
let OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const testProduction = process.env.ENVIRONMENT === "production";

if (testProduction) {
  if (!process.env.OPENPIPE_BASE_URL_PROD || !process.env.OPENPIPE_API_KEY_PROD) {
    throw new Error("Production environment variables are not set");
  }
  OPENPIPE_BASE_URL = process.env.OPENPIPE_BASE_URL_PROD;
  OPENPIPE_API_KEY = process.env.OPENPIPE_API_KEY_PROD;
} else {
  if (!process.env.OPENPIPE_BASE_URL_LOCAL || !process.env.OPENPIPE_API_KEY_LOCAL) {
    throw new Error("Local environment variables are not set");
  }
  OPENPIPE_BASE_URL = process.env.OPENPIPE_BASE_URL_LOCAL;
  OPENPIPE_API_KEY = process.env.OPENPIPE_API_KEY_LOCAL;
}

const TEST_LAST_LOGGED = !testProduction;

// Set the environment variables
process.env.OPENPIPE_BASE_URL = OPENPIPE_BASE_URL;
process.env.OPENPIPE_API_KEY = OPENPIPE_API_KEY;

export { OPENPIPE_BASE_URL, OPENPIPE_API_KEY, OPENAI_API_KEY, TEST_LAST_LOGGED };
