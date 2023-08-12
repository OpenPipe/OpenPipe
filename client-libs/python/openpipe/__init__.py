from .openai import OpenAIWrapper
from .shared import configured_client

openai = OpenAIWrapper()

def configure_openpipe(base_url=None, api_key=None):
  if base_url is not None:
    configured_client._base_url = base_url
  if api_key is not None:
    configured_client.token = api_key