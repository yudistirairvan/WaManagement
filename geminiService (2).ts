
import { GoogleGenAI } from "@google/genai";
import { SMEConfig } from "./types";

export const getAIResponse = async (
  userInput: string, 
  config: SMEConfig, 
  customApiKey?: string | null
): Promise<string | null> => {
  const apiKey = customApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini Service: API_KEY is missing");
    return null;
  }

  try {
    // Initialize with named parameter as per guidelines
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Format knowledge base untuk konteks
    const knowledgeContext = config.knowledgeBase
      .map(item => `[${item.category}]: ${item.content}`)
      .join('\n');

    const systemInstruction = `Anda adalah asisten WhatsApp resmi untuk "${config.businessName}". 
Profil Bisnis: ${config.description}.
Gaya Bicara: ${config.autoReplyPrompt}.

DATA RESMI TOKO (KNOWLEDGE BASE):
${knowledgeContext || "Tidak ada data khusus yang tersimpan."}

ATURAN JAWABAN:
1. PERIKSA DATA RESMI: Jika pertanyaan pelanggan dapat dijawab menggunakan DATA RESMI TOKO di atas, berikan jawaban langsung tanpa catatan tambahan.
2. JAWABAN UMUM: Jika informasi TIDAK DITEMUKAN di DATA RESMI TOKO, Anda boleh menjawab menggunakan pengetahuan umum Anda yang relevan dengan bisnis ini. Namun, Anda WAJIB menambahkan catatan disclaimer di baris paling bawah.
3. FORMAT DISCLAIMER: Gunakan garis pemisah dan teks berikut tepat di bagian akhir jawaban umum:
---
(Catatan: Jawaban ini dihasilkan oleh AI asisten. Mohon hubungi admin langsung jika memerlukan informasi resmi lebih lanjut.)

4. BATASAN: Jika pertanyaan tidak sopan atau sangat jauh dari konteks bisnis, jawab: "Maaf, saya tidak memiliki informasi mengenai hal tersebut."
5. Gunakan Bahasa Indonesia yang natural dan ramah.`;

    // Use ai.models.generateContent directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
        topP: 0.9,
      },
    });

    // Access .text property directly (not a method)
    const resultText = response.text?.trim();
    
    if (!resultText) {
      console.warn("Gemini Service: Empty response text received");
      return null;
    }

    return resultText;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", {
      message: error?.message,
      status: error?.status,
    });
    
    // Memberikan feedback jika terjadi error server
    if (error?.message?.includes('500') || error?.message?.includes('503')) {
      return "Sistem AI kami sedang mengalami gangguan teknis (Server Busy). Mohon tunggu beberapa saat lagi atau hubungi admin secara manual.";
    }
    
    return null; 
  }
};
