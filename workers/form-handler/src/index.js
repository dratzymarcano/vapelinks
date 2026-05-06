/**
 * Mr. Nice Vape — Brevo form handler (Cloudflare Worker)
 * ------------------------------------------------------
 *
 * Handles POST /api/form for the contact and order forms.
 *
 *   Required env vars (set with: wrangler secret put BREVO_API_KEY):
 *     BREVO_API_KEY     -- your Brevo (Sendinblue) v3 API key
 *
 *   Optional vars (set in wrangler.jsonc → "vars"):
 *     FROM_EMAIL        -- default "info@mrnicevape.com"
 *     FROM_NAME         -- default "Mr. Nice Vape"
 *     TO_EMAIL          -- default "rannydonatello@gmail.com"
 *     TO_NAME           -- default "Mr. Nice Vape Team"
 *
 * Deploy:
 *     cd workers/form-handler
 *     wrangler secret put BREVO_API_KEY
 *     wrangler deploy
 *
 * Then add a route in the dashboard (or wrangler.jsonc) so the worker
 * serves https://mrnicevape.com/api/form.
 */

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname !== "/api/form") {
      return json({ error: "not_found" }, 404);
    }
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    // ---- Honeypot: real users never fill this field ------------------------
    if (body.website && String(body.website).trim() !== "") {
      // Pretend success so bots don't retry.
      return json({ success: true });
    }

    const type = body.type === "order" ? "order" : "contact";
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const product = String(body.product || "").trim();
    const quantity = String(body.quantity || "").trim();
    const address = String(body.address || "").trim();

    // ---- Validation --------------------------------------------------------
    if (!name) return json({ error: "name_required" }, 400);
    if (!isEmail(email)) return json({ error: "invalid_email" }, 400);
    if (!message || message.length < 5)
      return json({ error: "message_too_short" }, 400);

    if (!env.BREVO_API_KEY) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const FROM_EMAIL = env.FROM_EMAIL || "info@mrnicevape.com";
    const FROM_NAME = env.FROM_NAME || "Mr. Nice Vape";
    const TO_EMAIL = env.TO_EMAIL || "rannydonatello@gmail.com";
    const TO_NAME = env.TO_NAME || "Mr. Nice Vape Team";

    // ---- Build admin email -------------------------------------------------
    const subject =
      type === "order"
        ? `🛒 New Order from ${name}`
        : `📩 New Contact from ${name}`;

    const rows = [
      ["Type", type],
      ["Name", name],
      ["Email", email],
      type === "order" ? ["Product", product] : null,
      type === "order" ? ["Quantity", quantity] : null,
      type === "order" ? ["Address", address] : null,
      ["Message", message],
    ].filter(Boolean);

    const htmlContent = `
      <h2>${escapeHtml(subject)}</h2>
      <table style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) => `
          <tr>
            <td style="padding:6px 12px;border:1px solid #ddd;font-weight:600">${escapeHtml(k)}</td>
            <td style="padding:6px 12px;border:1px solid #ddd;white-space:pre-wrap">${escapeHtml(v)}</td>
          </tr>`
          )
          .join("")}
      </table>
    `;

    const textContent = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

    // ---- Send to admin -----------------------------------------------------
    const adminPayload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: TO_EMAIL, name: TO_NAME }],
      replyTo: { email, name },
      subject,
      htmlContent,
      textContent,
    };

    const adminRes = await sendBrevo(env.BREVO_API_KEY, adminPayload);
    if (!adminRes.ok) {
      return json({ error: "email_send_failed", detail: adminRes.detail }, 502);
    }

    // ---- Auto-reply to user ------------------------------------------------
    const replyPayload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email, name }],
      subject: "We received your request",
      htmlContent: `<p>Thanks ${escapeHtml(name)}, we’ll get back to you shortly.</p>`,
      textContent: `Thanks ${name}, we’ll get back to you shortly.`,
    };
    // Don't fail the whole request if the auto-reply bounces.
    await sendBrevo(env.BREVO_API_KEY, replyPayload).catch(() => {});

    return json({ success: true });
  },
};

async function sendBrevo(apiKey, payload) {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, detail };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err && err.message };
  }
}
