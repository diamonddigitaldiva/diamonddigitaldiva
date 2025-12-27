// Webhook URL - can be configured via environment or hardcoded
// For Zapier: Create a Zap with "Webhooks by Zapier" trigger (Catch Hook)
// For Make: Create a scenario with "Webhooks" module (Custom webhook)
const WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/bUUmh6cX31sAbXMXMnU9/webhook-trigger/TyS7OiDTq34zNu9CILJn";

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

  console.log("Sending quiz results to webhook:", webhookUrl);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    // Try with cors first, fallback to no-cors
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Webhook response status:", response.status);
    console.log("Webhook request sent successfully");
    return true;
  } catch (corsError) {
    console.log("CORS error, retrying with no-cors mode...");
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(payload),
      });
      console.log("Webhook request sent (no-cors mode)");
      return true;
    } catch (error) {
      console.error("Error sending to webhook:", error);
      return false;
    }
  }
}
