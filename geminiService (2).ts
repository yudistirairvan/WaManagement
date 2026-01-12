
import { GoogleGenAI } from "@google/genai";
import { SMEConfig } from "./types";

export const getAIResponse = async (
  userInput: string, 
  config: SMEConfig, 
  customApiKey?: string | null
): Promise<string | null> => {
  // Prioritas: 1. Custom API Key (dari UI), 2. Environment Variable
  const apiKey = customApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini Service: API_KEY is missing");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const knowledgeContext = config.knowledgeBase
      .map(item => `- [${item.category}]: ${item.content}`)
      .join('\n');

    const systemInstruction = `
      Anda adalah asisten cerdas untuk "${config.businessName}".
      Profil Bisnis: ${config.description}
      
      BASIS DATA PENGETAHUAN:
      ${knowledgeContext || "Tidak ada data spesifik."}

      INSTRUKSI:
      1. Jawab HANYA berdasarkan DATA PENGETAHUAN di atas secara singkat dan padat.
      2. Jika pertanyaan tidak ada di data, jawab: "Maaf, saya tidak memiliki informasi tersebut. Mohon tunggu admin kami membantu Anda secara manual."
      3. Gaya bahasa: ${config.autoReplyPrompt}.
      4. Gunakan Bahasa Indonesia yang ramah.
      5. JANGAN menyertakan label teknis seperti "Error" atau "System" dalam jawaban Anda.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Suhu rendah untuk konsistensi
      },
    });

    const resultText = response.text?.trim();
    
    // Pastikan tidak mengirim pesan kosong atau pesan sistem yang tidak diinginkan
    if (!resultText || resultText.length < 2) {
      return null;
    }

    return resultText;
  } catch (error: any) {
    // Log di konsol browser saja, jangan kirim string error ke UI/Pelanggan
    console.error("Gemini API Error:", error?.message);
    return null; 
  }
};
