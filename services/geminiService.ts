import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client
// Note: In a real environment, never expose API keys on the client side.
// This is for demonstration purposes within the constraints of this environment.
// Using a placeholder check since we can't actually prompt for a key here without UI.
const apiKey = process.env.API_KEY || 'dummy-key'; 
const ai = new GoogleGenAI({ apiKey });

export const generateWelcomeEmail = async (username: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return `Welcome ${username}! We are glad to have you on board. (AI features unavailable without API Key)`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, professional, yet exciting welcome email subject line and body for a new user named "${username}" joining "Nexus API", a high-performance API rental platform. Keep it under 50 words.`,
    });
    return response.text || "Welcome to Nexus API!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Welcome ${username}! We're excited to help you scale your applications.`;
  }
};

export const generateApiDescription = async (apiName: string): Promise<string> => {
    if (!process.env.API_KEY) {
        return `High performance ${apiName} API for enterprise needs.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a compelling 1-sentence description for an API product named "${apiName}". Emphasize speed and reliability.`,
        });
        return response.text || `Premium API access for ${apiName}.`;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return `Premium API access for ${apiName}.`;
    }
}
