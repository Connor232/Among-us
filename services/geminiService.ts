
import { GoogleGenAI, Type } from "@google/genai";
import { Player, Message, DeadBody } from "../types";

// Always use process.env.API_KEY directly when initializing GoogleGenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getMeetingDiscussion = async (
  players: Player[],
  deadBodies: DeadBody[],
  reporterId: string
): Promise<Message[]> => {
  const alivePlayers = players.filter(p => p.isAlive);
  const reporter = players.find(p => p.id === reporterId);

  const prompt = `
    This is an "Among Us" style game meeting.
    Alive Players: ${alivePlayers.map(p => `${p.name} (${p.color})`).join(', ')}
    Dead Players: ${players.filter(p => !p.isAlive).map(p => p.name).join(', ')}
    Reporter: ${reporter?.name}

    Please generate a short dialogue (5-7 messages) of the crewmates discussing who is suspicious.
    The impostor(s) should try to blend in or deflect.
    The reporter should explain where they found the body.
    
    Format the output as a JSON array of objects with senderId, senderName, and content.
    Example: [{"senderId": "1", "senderName": "Red", "content": "I found the body in Medbay!"}]
  `;

  try {
    // Configured with responseSchema for guaranteed structured output according to @google/genai standards.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              senderId: {
                type: Type.STRING,
                description: "The unique ID of the player speaking.",
              },
              senderName: {
                type: Type.STRING,
                description: "The name of the player speaking.",
              },
              content: {
                type: Type.STRING,
                description: "The message spoken by the player.",
              },
            },
            required: ["senderId", "senderName", "content"],
          },
        },
      }
    });

    // Directly access the .text property from GenerateContentResponse
    const text = response.text || '[]';
    const parsed: Message[] = JSON.parse(text);
    return parsed.map((m, i) => ({ ...m, id: `msg-ai-${Date.now()}-${i}` }));
  } catch (error) {
    console.error("Gemini Error:", error);
    return [
      { id: 'err-1', senderId: reporterId, senderName: reporter?.name || 'Player', content: "Body found in Medbay!" },
      { id: 'err-2', senderId: 'ai-1', senderName: 'Blue', content: "Where was everyone?" },
      { id: 'err-3', senderId: 'ai-2', senderName: 'Green', content: "I was in Electrical." }
    ];
  }
};
