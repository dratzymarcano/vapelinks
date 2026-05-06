// Cloudflare Email Worker for mrnicevape.com
// Forwards inbound email to Gmail and POSTs metadata to the site webhook.

export default {
  /**
   * @param {ForwardableEmailMessage} message
   * @param {{ FORWARD_TO: string, WEBHOOK_URL?: string, WEBHOOK_SECRET?: string }} env
   * @param {ExecutionContext} ctx
   */
  async email(message, env, ctx) {
    const forwardTo = env.FORWARD_TO;
    const webhookUrl = env.WEBHOOK_URL;

    // 1) Always forward to Gmail first so nothing is lost if the webhook fails.
    try {
      await message.forward(forwardTo);
    } catch (err) {
      console.error("forward failed:", err && err.message);
    }

    // 2) Fire-and-forget webhook with email metadata.
    if (webhookUrl) {
      const payload = {
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject") || "",
        messageId: message.headers.get("message-id") || "",
        date: message.headers.get("date") || new Date().toISOString(),
        size: message.rawSize,
      };

      ctx.waitUntil(
        fetch(webhookUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "mrnicevape-email-worker",
            ...(env.WEBHOOK_SECRET ? { "x-webhook-secret": env.WEBHOOK_SECRET } : {}),
          },
          body: JSON.stringify(payload),
        }).catch((err) => console.error("webhook failed:", err && err.message))
      );
    }
  },
};
