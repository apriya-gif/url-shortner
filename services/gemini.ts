import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLinkMetadata = async (url: string): Promise<GeminiSuggestion> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this URL: ${url}. 
      I need a brief description (max 12 words) and 2-3 short tags.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A very brief summary of the link" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "2-3 categorization tags"
            }
          },
          required: ["description", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeminiSuggestion;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback if AI fails
    return {
      description: "Link saved via MacShorty",
      tags: ["link"]
    };
  }
};