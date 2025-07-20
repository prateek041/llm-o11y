import { AzureOpenAI } from "openai";
const ApiKey = process.env.AZURE_OPENAI_API_KEY;
const Endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiVersion = process.env.API_VERSION;

export const models = [
  "gpt-4.1",
  "gpt-4o"
]

const openAIClient = new AzureOpenAI({
  endpoint: Endpoint,
  apiKey: ApiKey,
  apiVersion,
  deployment: "gpt-4.1"
});

export default function getOpenAIClient() {
  return openAIClient;
};
