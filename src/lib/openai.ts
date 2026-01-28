import axios from "axios";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const SYSTEM_PROMPT = `Sen "Enerwise AI" adlı akıllı bir toplantı asistanısın. 
Kullanıcılar toplantı bittikten sonra seninle sesli sohbet ederek toplantı hakkında sorular sorar.
Sen toplantı transkriptini kullanarak yanıt verirsin.

Kuralların:
1. Türkçe yanıt ver.
2. Kısa ve öz ol - sesli yanıt vereceğin için 2-3 cümleyi geçme.
3. Toplantı bağlamı dışında kalan sorulara nazikçe toplantıya odaklanmalarını hatırlat.
4. Toplantıda bahsedilmeyen konular hakkında "Bu konu toplantıda ele alınmadı" de.
5. Kullanıcıya yardımcı ve profesyonel ol.
6. Emoji kullanma çünkü sesli okuyacaksın.

Şu anki toplantı transkripti aşağıda sana verilecek. Bu bilgiyi kullanarak kullanıcının sorularını yanıtla.`;

export async function sendChatMessage(
  userMessage: string,
  transcriptContext: string,
  conversationHistory: ChatMessage[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return "OpenAI API anahtarı yapılandırılmamış. Lütfen .env dosyasına VITE_OPENAI_API_KEY ekleyin.";
  }

  const contextMessage = transcriptContext
    ? `\n\n--- TOPLANTI TRANSKRİPTİ ---\n${transcriptContext}\n--- TRANSKRİPT SONU ---`
    : "\n\n(Henüz toplantı transkripti bulunmuyor)";

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT + contextMessage },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  try {
    const response = await axios.post<OpenAIResponse>(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.choices[0]?.message?.content || "Yanıt alınamadı.";
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return "API anahtarı geçersiz. Lütfen kontrol edin.";
      }
      if (error.response?.status === 429) {
        return "Çok fazla istek gönderildi. Lütfen biraz bekleyin.";
      }
      return `API hatası: ${error.response?.data?.error?.message || error.message}`;
    }
    return "Bir hata oluştu. Lütfen tekrar deneyin.";
  }
}

// Text-to-Speech using OpenAI API with Nova voice
export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    console.error("OpenAI API key not configured");
    return null;
  }

  try {
    const response = await axios.post(
      OPENAI_TTS_URL,
      {
        model: "tts-1",
        input: text,
        voice: "nova",
        response_format: "mp3",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      },
    );

    return response.data;
  } catch (error) {
    console.error("TTS error:", error);
    return null;
  }
}

// Play audio from ArrayBuffer
export async function playAudio(audioData: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([audioData], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };

    audio.play().catch(reject);
  });
}

// Combined function: Get AI response and speak it
export async function getAIResponseAndSpeak(
  userMessage: string,
  transcriptContext: string,
  conversationHistory: ChatMessage[],
): Promise<{ text: string; success: boolean }> {
  const textResponse = await sendChatMessage(
    userMessage,
    transcriptContext,
    conversationHistory,
  );

  // Try to speak the response
  const audioData = await textToSpeech(textResponse);
  if (audioData) {
    try {
      await playAudio(audioData);
      return { text: textResponse, success: true };
    } catch (error) {
      console.error("Failed to play audio:", error);
      return { text: textResponse, success: false };
    }
  }

  return { text: textResponse, success: false };
}
