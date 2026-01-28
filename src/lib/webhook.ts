import axios from "axios";

const WEBHOOK_URL =
  "https://yucelgumus61.app.n8n.cloud/webhook-test/ses-analiz";

export interface WebhookPayload {
  transcript: string;
  timestamp: string;
}

export async function sendTranscriptToWebhook(
  transcript: string,
): Promise<{ success: boolean; error?: string }> {
  const payload: WebhookPayload = {
    transcript: transcript.trim(),
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Webhook error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
    return { success: false, error: "Bilinmeyen bir hata oluştu" };
  }
}
