import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK with an API key
// We expect GEMINI_API_KEY to be set in the environment (.env.local)
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface FarmerMessageIntent {
  intent: 'ESTIMATE' | 'GENERAL' | 'UNCLEAR';
  weight_kg: number | null;
  suggested_reply: string;
}

export async function parseFarmerMessage(message: string): Promise<FarmerMessageIntent> {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Falling back to simple keyword matching.');
    return fallbackParser(message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Anda adalah asisten AI untuk "Khum Khum", sebuah pabrik pengolahan jamur tiram.
      Seorang petani (mitra) mengirimkan pesan WhatsApp berikut:
      "${message}"
      
      Tugas Anda adalah mengekstrak niat (intent) dari pesan tersebut ke dalam format JSON.
      
      Aturan:
      1. Jika pesan mengandung niat untuk mengirimkan jamur (estimasi kedatangan/panen), set "intent": "ESTIMATE".
         - Cari angka beratnya. Petani sering typo, misalnya "3 k", "3kilo", "3 keping", "tiga kg". Konversikan ke angka desimal (kg).
         - Jika mereka hanya mengirim foto tanpa teks berat, atau bilang "mau kirim" tanpa angka, set "intent": "ESTIMATE" dan "weight_kg": null.
      2. Jika pesan sekadar bertanya, menyapa, atau ngobrol umum, set "intent": "GENERAL" dan "weight_kg": null.
      3. Jika pesan sama sekali tidak jelas, set "intent": "UNCLEAR" dan "weight_kg": null.
      4. Buatkan "suggested_reply" yang ramah, sopan, luwes (tidak kaku seperti bot), dalam bahasa Indonesia.
         - Jika ESTIMATE dengan berat: "Siap Pak/Bu, kami catat estimasi kirimnya sekitar {weight_kg} kg ya hari ini. Hati-hati di jalan!"
         - Jika ESTIMATE tanpa berat (misal ngirim foto doang): "Siap Pak/Bu, ditunggu kedatangannya di gudang ya!"
         - Jika GENERAL: jawab sewajarnya sebagai admin gudang Khum Khum.
         
      PENTING: Output HARUS berupa JSON murni tanpa markdown blocks (\`\`\`json).
      Format yang diharapkan:
      {
        "intent": "ESTIMATE" | "GENERAL" | "UNCLEAR",
        "weight_kg": number | null,
        "suggested_reply": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting from the response
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(cleanJson) as FarmerMessageIntent;
    return parsed;
  } catch (error) {
    console.error('Error parsing message with Gemini:', error);
    return fallbackParser(message);
  }
}

// Fallback logic if AI fails or no API key
function fallbackParser(message: string): FarmerMessageIntent {
  const msgLower = message.toLowerCase();
  
  // Very basic regex for catching things like "3 k", "3kg", "3 kilo"
  const weightMatch = msgLower.match(/(\d+(?:\.\d+)?)\s*(k|kg|kilo)/);
  
  const isEstimate = msgLower.includes('kirim') || msgLower.includes('bawa') || msgLower.includes('panen');
  
  if (isEstimate || weightMatch) {
    const weight = weightMatch ? parseFloat(weightMatch[1]) : null;
    return {
      intent: 'ESTIMATE',
      weight_kg: weight,
      suggested_reply: weight 
        ? `Siap Pak/Bu, kami catat estimasi kirimnya sekitar ${weight} kg ya. Ditunggu di gudang!`
        : 'Siap Pak/Bu, ditunggu kedatangannya di gudang ya!'
    };
  }

  return {
    intent: 'GENERAL',
    weight_kg: null,
    suggested_reply: 'Halo Pak/Bu, ada yang bisa dibantu dari gudang Khum Khum?'
  };
}
