import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a short, witty, or helpful "Vibe Check" about the destination.
 * This adds a unique personality to the app.
 */
export const getDestinationVibe = async (destination: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a very short (max 15 words), fun, positive, and witty "vibe check" for someone taking a taxi to: "${destination}". Do not use hashtags.`,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Enjoy your ride to the destination!";
  }
};
