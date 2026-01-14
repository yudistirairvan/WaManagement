
import { GoogleGenAI } from "@google/genai";
import { SMEConfig, KnowledgeItem } from "./types";

export const getAIResponse = async (
  userInput: string, 
  config: SMEConfig, 
  customApiKey?: string | null
): Promise<{ text: string, media?: { url: string, type: 'image' | 'video' }, buttons?: string[] } | null> => {
  // Use the API key from environment variable as per guidelines
  const apiKey = customApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini Service: API_KEY is missing");
    return null;
  }

  try {
    // Correct initialization using named parameter
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const knowledgeContext = config.knowledgeBase
      .map(item => {
        let text = `[ID: ${item.id}][Category: ${item.category}]: ${item.content}`;
        if (item.mediaUrl) text += ` (Media Available: ${item.mediaType})`;
        if (item.buttons?.length) text += ` (Buttons Available: ${item.buttons.join(', ')})`;
        return text;
      })
      .join('\n');

    const systemInstruction = `Anda adalah asisten WhatsApp resmi untuk "${config.businessName}". 
Profil Bisnis: ${config.description}.
Gaya Bicara: ${config.autoReplyPrompt}.

DATA RESMI TOKO (KNOWLEDGE BASE):
${knowledgeContext || "Tidak ada data khusus yang tersimpan."}

TUGAS ANDA:
1. Jawab pertanyaan user dengan ramah.
2. Jika jawaban ada di DATA RESMI TOKO, gunakan informasi tersebut.
3. FORMAT OUTPUT: Anda WAJIB memberikan jawaban dalam format JSON mentah (bukan markdown) agar sistem dashboard bisa memprosesnya.
Contoh Format JSON:
{
  "text": "Jawaban Anda di sini...",
  "knowledgeId": "ID item dari data resmi jika ada, jika tidak kosongkan",
  "disclaimer": true/false (true jika menggunakan pengetahuan umum di luar data resmi)
}

Jika disclaimer true, tambahkan catatan di akhir field 'text'.`;

    // Using ai.models.generateContent with model and prompt as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: userInput }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    // Access .text property directly (not as a method)
    const resultText = response.text?.trim();
    if (!resultText) return null;

    try {
      const parsed = JSON.parse(resultText);
      const foundItem = config.knowledgeBase.find(k => k.id === parsed.knowledgeId);
      
      let finalResponse = {
        text: parsed.text,
        media: foundItem?.mediaUrl ? { url: foundItem.mediaUrl, type: foundItem.mediaType as any } : undefined,
        buttons: foundItem?.buttons || undefined
      };

      if (parsed.disclaimer) {
        finalResponse.text += "\n\n---\n(Catatan: Jawaban ini dihasilkan oleh AI asisten. Mohon hubungi admin jika memerlukan info resmi.)";
      }

      return finalResponse;
    } catch (e) {
      // Fallback if not valid JSON
      return { text: resultText };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { text: "Maaf, sistem AI sedang sibuk. Mohon coba lagi nanti." };
  }
};
