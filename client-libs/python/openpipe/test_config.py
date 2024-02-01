import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize variables
OPENPIPE_BASE_URL = ""
OPENPIPE_API_KEY = ""

# Check if the environment is production
testProduction = os.environ.get("ENVIRONMENT") == "production"

if testProduction:
    if not os.environ.get("OPENPIPE_BASE_URL_PROD") or not os.environ.get(
        "OPENPIPE_API_KEY_PROD"
    ):
        raise Exception("Production environment variables are not set")
    OPENPIPE_BASE_URL = os.environ.get("OPENPIPE_BASE_URL_PROD")
    OPENPIPE_API_KEY = os.environ.get("OPENPIPE_API_KEY_PROD")
else:
    if not os.environ.get("OPENPIPE_BASE_URL_LOCAL") or not os.environ.get(
        "OPENPIPE_API_KEY_LOCAL"
    ):
        raise Exception("Local environment variables are not set")
    OPENPIPE_BASE_URL = os.environ.get("OPENPIPE_BASE_URL_LOCAL")
    OPENPIPE_API_KEY = os.environ.get("OPENPIPE_API_KEY_LOCAL")

# Set the environment variables
os.environ["OPENPIPE_BASE_URL"] = OPENPIPE_BASE_URL
os.environ["OPENPIPE_API_KEY"] = OPENPIPE_API_KEY

TEST_LAST_LOGGED = not testProduction
