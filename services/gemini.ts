import { GeminiSuggestion } from "../types";

// AI features have been disabled to remove API key dependency.
export const generateLinkMetadata = async (url: string): Promise<GeminiSuggestion> => {
  return Promise.resolve({
    description: "New Link",
    tags: ["link"]
  });
};