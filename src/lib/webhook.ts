// Webhook URL - can be configured via environment or hardcoded
// For Zapier: Create a Zap with "Webhooks by Zapier" trigger (Catch Hook)
// For Make: Create a scenario with "Webhooks" module (Custom webhook)
const WEBHOOK_URL = "";

export interface QuizResultPayload {
  firstName: string;
  email: string;
  primaryStage: string;
  secondaryStage: string | null;
  timestamp: string;
  source: string;
}

export async function sendQuizResultsToWebhook(
  payload: QuizResultPayload,
  customWebhookUrl?: string
): Promise<boolean> {
  const webhookUrl = customWebhookUrl || WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log("No webhook URL configured, skipping webhook call");
    return false;
  }

  console.log("Sending quiz results to webhook:", webhookUrl, payload);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "no-cors", // Handle CORS for external services
      body: JSON.stringify(payload),
    });

    console.log("Webhook request sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending to webhook:", error);
    return false;
  }
}
