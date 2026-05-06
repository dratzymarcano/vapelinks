export const prerender = false;

import type { APIRoute } from 'astro';

function getEnv(locals: any, key: string) {
  return locals?.runtime?.env?.[key] || import.meta.env[key];
}

/* ─────────────────────────────────────────────────────────
   Brevo transport — drop-in replacement for resend.emails.send()
   Accepts { from, to[], subject, html, replyTo? } and returns
   { data: { id }, error?: { message } } so the rest of the file
   is unchanged.
   ───────────────────────────────────────────────────────── */
function parseAddress(input: string | { email: string; name?: string }) {
  if (typeof input !== 'string') return { email: input.email, name: input.name };
  const m = input.match(/^\s*"?([^"<]+?)"?\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { email: input.trim() };
}

function getBrevoClient(locals: any) {
  const apiKey = getEnv(locals, 'BREVO_API_KEY');
  if (!apiKey) throw new Error('Missing BREVO_API_KEY');

  return {
    emails: {
      async send(opts: { from: string; to: string[]; subject: string; html: string; replyTo?: string }) {
        const sender = parseAddress(opts.from);
        const payload: Record<string, any> = {
          sender,
          to: opts.to.map((addr) => parseAddress(addr)),
          subject: opts.subject,
          htmlContent: opts.html,
        };
        if (opts.replyTo) payload.replyTo = parseAddress(opts.replyTo);

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          return { data: null, error: { message: `Brevo ${res.status}: ${detail}` } };
        }
        const data = await res.json().catch(() => ({}));
        return { data: { id: data.messageId || null }, error: null };
      },
    },
  };
}

/* ─────────────────────────────────────────────────────────
   Shared email layout wrapper — premium dark theme
   ───────────────────────────────────────────────────────── */
function emailLayout(content: string, preheader: string = '') {
  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Mr. Nice Vape Deutschland</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #0f172a; -webkit-font-smoothing: antialiased; }
    table { border-spacing: 0; border-collapse: collapse; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 0 12px !important; }
      .content-cell { padding: 24px 16px !important; }
      .hero-cell { padding: 32px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;">
    <tr><td align="center" style="padding:32px 16px;">
      <!-- Container -->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

        <!-- Logo Header -->
        <tr><td style="padding:0 0 24px;text-align:center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center;padding:0 0 16px;">
              <span style="font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#22c55e;">VAPELINK</span>
              <span style="font-size:12px;font-weight:500;letter-spacing:2px;color:#64748b;display:block;margin-top:2px;">DEUTSCHLAND</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Main Card -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
            ${content}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 24px 0;text-align:center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #1e293b;padding-top:24px;text-align:center;">
              <p style="font-size:12px;color:#475569;line-height:1.6;margin:0 0 8px;">
                <a href="https://mrnicevape.com" style="color:#22c55e;text-decoration:none;font-weight:500;">mrnicevape.com</a>
              </p>
              <p style="font-size:11px;color:#334155;line-height:1.5;margin:0;">
                Mr. Nice Vape Deutschland &middot; Premium-Vape-Produkte<br/>
                &copy; ${new Date().getFullYear()} Alle Rechte vorbehalten.
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────
   Reusable components
   ───────────────────────────────────────────────────────── */
function heroSection(icon: string, title: string, subtitle: string, accentColor: string = '#22c55e') {
  return `
    <tr><td class="hero-cell" style="background:linear-gradient(135deg,${accentColor}15,${accentColor}08);padding:40px 32px 32px;border-bottom:1px solid #334155;">
      <div style="text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;line-height:56px;font-size:28px;background:${accentColor}18;border:2px solid ${accentColor}30;border-radius:14px;text-align:center;margin-bottom:16px;">${icon}</div>
        <h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 8px;letter-spacing:-0.3px;">${title}</h1>
        <p style="font-size:14px;color:#94a3b8;margin:0;font-weight:400;">${subtitle}</p>
      </div>
    </td></tr>`;
}

function sectionLabel(text: string) {
  return `<p style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin:0 0 12px;">${text}</p>`;
}

function detailRow(label: string, value: string, isLast: boolean = false) {
  return `<tr>
    <td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:500;border-bottom:${isLast ? 'none' : '1px solid #1e293b44'};width:130px;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;color:#e2e8f0;font-size:13px;font-weight:500;border-bottom:${isLast ? 'none' : '1px solid #1e293b44'};">${value}</td>
  </tr>`;
}

function divider() {
  return `<tr><td style="padding:0;"><div style="height:1px;background:linear-gradient(90deg,transparent,#334155,transparent);margin:0;"></div></td></tr>`;
}

function itemsTable(items: any[]) {
  const rows = items.map((item: any, i: number) => {
    const total = (parseFloat(item.price || '0') * (item.qty || 1)).toFixed(2);
    const isLast = i === items.length - 1;
    return `<tr>
      <td style="padding:12px 0;color:#e2e8f0;font-size:13px;font-weight:500;border-bottom:${isLast ? 'none' : '1px solid #334155'};">${item.title}</td>
      <td style="padding:12px 0;color:#94a3b8;font-size:13px;text-align:center;border-bottom:${isLast ? 'none' : '1px solid #334155'};width:50px;">&times;${item.qty || 1}</td>
      <td style="padding:12px 0;color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;border-bottom:${isLast ? 'none' : '1px solid #334155'};width:80px;">€${total}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalBlock(subtotal: string, shippingMethod: string, shippingCost: any, total: string) {
  const shippingDisplay = '€' + (shippingCost || '0.00');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:16px;border:1px solid #334155;">
      <tr>
        <td style="padding:8px 16px;color:#94a3b8;font-size:13px;">Zwischensumme</td>
        <td style="padding:8px 16px;color:#cbd5e1;font-size:13px;text-align:right;">€${subtotal}</td>
      </tr>
      <tr>
        <td style="padding:8px 16px;color:#94a3b8;font-size:13px;">Versand (${shippingMethod || 'Standard'})</td>
        <td style="padding:8px 16px;color:#cbd5e1;font-size:13px;text-align:right;">${shippingDisplay}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 16px 0;"><div style="height:1px;background:#334155;"></div></td>
      </tr>
      <tr>
        <td style="padding:12px 16px 8px;color:#f1f5f9;font-size:18px;font-weight:700;">Gesamt</td>
        <td style="padding:12px 16px 8px;color:#22c55e;font-size:18px;font-weight:700;text-align:right;">€${total}</td>
      </tr>
    </table>`;
}

function badge(text: string, color: string) {
  return `<span style="display:inline-block;padding:4px 12px;background:${color}18;color:${color};font-size:11px;font-weight:600;border-radius:20px;letter-spacing:0.5px;border:1px solid ${color}30;">${text}</span>`;
}

/* ─────────────────────────────────────────────────────────
   API Route
   ───────────────────────────────────────────────────────── */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const resend = getBrevoClient(locals);
    const FROM_EMAIL = getEnv(locals, 'BREVO_FROM_EMAIL') || getEnv(locals, 'RESEND_FROM_EMAIL') || 'Mr. Nice Vape Deutschland <info@mrnicevape.com>';
    const ADMIN_EMAIL = getEnv(locals, 'BREVO_ADMIN_EMAIL') || getEnv(locals, 'RESEND_ADMIN_EMAIL') || 'info@mrnicevape.com';
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: 'Missing type or data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (type) {

      /* ──────────────────────────────────────────────────
         ADMIN: Neue Bestellung Notification
         ────────────────────────────────────────────────── */
      case 'admin-order': {
        const orderDate = new Date(data.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const statusColor = data.status === 'Paid' ? '#22c55e' : '#f59e0b';

        const content = `
          ${heroSection('📦', 'Neue Bestellung eingegangen', `${data.orderNumber} &middot; ${orderDate}`)}

          <!-- Kunde Info -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Kundendaten')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:4px 16px;border:1px solid #334155;">
              ${detailRow('Name', `<strong style="color:#f1f5f9;">${data.firstName} ${data.lastName}</strong>`)}
              ${detailRow('E-Mail', `<a href="mailto:${data.email}" style="color:#22c55e;text-decoration:none;">${data.email}</a>`)}
              ${detailRow('Telefon', data.phone || '<span style="color:#475569;">Nicht angegeben</span>')}
              ${detailRow('Adresse', [data.address, data.address2, data.city, data.state, data.postcode, 'Deutschland'].filter(Boolean).join(', '), true)}
            </table>
          </td></tr>

          ${divider()}

          <!-- Bestellte Artikel -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Bestellte Artikel')}
            ${itemsTable(data.items || [])}
            <div style="margin-top:20px;">
              ${totalBlock(data.subtotal, data.shippingMethod, data.shippingCost, data.total)}
            </div>
          </td></tr>

          ${divider()}

          <!-- Zahlung -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Zahlungsinformationen')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:4px 16px;border:1px solid #334155;">
              ${detailRow('Methode', `<strong>${data.paymentMethod}</strong>`)}
              ${detailRow('Status', badge(data.status || 'Ausstehend', statusColor))}
              ${data.btcAmount ? detailRow('BTC Amount', `<code style="background:#334155;padding:3px 8px;border-radius:6px;font-size:12px;color:#fbbf24;">${data.btcAmount}</code>`) : ''}
              ${data.txId ? detailRow('TX ID', `<a href="https://mempool.space/tx/${data.txId}" style="color:#22c55e;font-size:11px;word-break:break-all;text-decoration:none;">${data.txId}</a>`, true) : ''}
              ${!data.btcAmount && !data.txId ? detailRow('Referenz', data.orderNumber, true) : ''}
              ${data.notes ? detailRow('Hinweise', data.notes, true) : ''}
            </table>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || undefined,
          subject: `Neue Bestellung ${data.orderNumber} — €${data.total} (${data.paymentMethod})`,
          html: emailLayout(content, `New order ${data.orderNumber} from ${data.firstName} — €${data.total}`),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         CUSTOMER: Bestellung Confirmation
         ────────────────────────────────────────────────── */
      case 'customer-confirmation': {
        const paymentInfo = (() => {
          if ((data.paymentMethod || '').startsWith('Bitcoin (BTC)')) {
            return `
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;margin-top:16px;">
                <p style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#fbbf24;margin:0 0 8px;">&#x20bf; Bitcoin-Zahlung</p>
                ${data.btcAmount ? `<p style="font-size:13px;color:#e2e8f0;margin:0 0 4px;">Betrag: <strong style="color:#fbbf24;">${data.btcAmount} BTC</strong></p>` : ''}
                ${data.txId ? `<p style="font-size:12px;color:#94a3b8;margin:0;word-break:break-all;">TX: <a href="https://mempool.space/tx/${data.txId}" style="color:#22c55e;text-decoration:none;">${data.txId.substring(0, 16)}...</a></p>` : ''}
              </div>`;
          }
          if (['Bank Transfer', 'Banküberweisung', 'SEPA', 'SEPA-Überweisung'].includes(data.paymentMethod)) {
            return `
              <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;margin-top:16px;">
                <p style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;margin:0 0 8px;">Zahlung Details</p>
                <p style="font-size:13px;color:#e2e8f0;line-height:1.7;margin:0;">Bitte verwende <strong style="color:#22c55e;">${data.orderNumber}</strong> als Zahlungsreferenz. Wir bestätigen deine Bestellung, sobald die Zahlung eingegangen ist.</p>
              </div>`;
          }
          return '';
        })();

        const content = `
          ${heroSection('✓', `Danke, ${data.firstName}!`, 'Ihre Bestellung wurde bestätigt')}

          <!-- Bestellnummer Banner -->
          <tr><td style="padding:0 32px;">
            <div style="background:#22c55e12;border:1px dashed #22c55e40;border-radius:10px;padding:14px 20px;text-align:center;margin-top:24px;">
              <span style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Bestellnummer</span>
              <p style="font-size:20px;font-weight:700;color:#22c55e;margin:4px 0 0;letter-spacing:0.5px;">${data.orderNumber}</p>
            </div>
          </td></tr>

          <!-- Items -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Ihre Bestellung')}
            ${itemsTable(data.items || [])}
            <div style="margin-top:20px;">
              ${totalBlock(data.subtotal || data.total, data.shippingMethod, data.shippingCost, data.total)}
            </div>
            ${paymentInfo}
          </td></tr>

          ${divider()}

          <!-- Versand -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Versand an')}
            <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
              <p style="font-size:14px;color:#f1f5f9;font-weight:600;margin:0 0 4px;">${data.firstName} ${data.lastName}</p>
              <p style="font-size:13px;color:#94a3b8;line-height:1.7;margin:0;">${[data.address, data.address2].filter(Boolean).join(', ')}<br/>${data.city}, ${data.state} ${data.postcode}<br/>Deutschland</p>
            </div>
          </td></tr>

          ${divider()}

          <!-- Next Steps -->
          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Wie es weitergeht')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#22c55e18;border:1px solid #22c55e30;border-radius:8px;font-size:12px;color:#22c55e;font-weight:700;">1</div>
                </td>
                <td style="padding:0 0 16px 12px;">
                  <p style="font-size:13px;color:#f1f5f9;font-weight:600;margin:0;">Bestellung wird bearbeitet</p>
                  <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">Wir bereiten Ihre Bestellung für den Versand vor.</p>
                </td>
              </tr>
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#22c55e18;border:1px solid #22c55e30;border-radius:8px;font-size:12px;color:#22c55e;font-weight:700;">2</div>
                </td>
                <td style="padding:0 0 16px 12px;">
                  <p style="font-size:13px;color:#f1f5f9;font-weight:600;margin:0;">Versendet</p>
                  <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">Sie erhalten die Sendungsdaten per E-Mail.</p>
                </td>
              </tr>
              <tr>
                <td style="width:36px;vertical-align:top;padding-top:2px;">
                  <div style="width:28px;height:28px;line-height:28px;text-align:center;background:#22c55e18;border:1px solid #22c55e30;border-radius:8px;font-size:12px;color:#22c55e;font-weight:700;">3</div>
                </td>
                <td style="padding:0 0 0 12px;">
                  <p style="font-size:13px;color:#f1f5f9;font-weight:600;margin:0;">Zugestellt</p>
                  <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">Viel Freude mit Ihrer Bestellung!</p>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- CTA -->
          <tr><td style="padding:0 32px 32px;text-align:center;">
            <a href="https://mrnicevape.com" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">Weiter einkaufen</a>
          </td></tr>

          <!-- Support -->
          <tr><td style="padding:0 32px 28px;text-align:center;">
            <p style="font-size:12px;color:#64748b;margin:0;">Fragen? Antwort an this email or contact <a href="mailto:info@mrnicevape.com" style="color:#22c55e;text-decoration:none;">info@mrnicevape.com</a></p>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.email],
          subject: `Bestellung bestätigt — ${data.orderNumber} | Mr. Nice Vape Deutschland`,
          html: emailLayout(content, `Your order ${data.orderNumber} is confirmed! We'll start processing it right away.`),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         CONTACT FORM: Admin Notification
         ────────────────────────────────────────────────── */
      case 'contact': {
        const contactDate = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

        const adminContent = `
          ${heroSection('💬', 'Neue Kontaktanfrage', contactDate)}

          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Sender')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:4px 16px;border:1px solid #334155;">
              ${detailRow('Name', `<strong style="color:#f1f5f9;">${data.name}</strong>`)}
              ${detailRow('E-Mail', `<a href="mailto:${data.email}" style="color:#22c55e;text-decoration:none;">${data.email}</a>`)}
              ${detailRow('Betreff', data.subject || 'Allgemeine Anfrage', true)}
            </table>
          </td></tr>

          ${divider()}

          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Nachricht')}
            <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;border-left:3px solid #22c55e;">
              <p style="font-size:14px;color:#e2e8f0;line-height:1.8;margin:0;white-space:pre-wrap;">${data.message}</p>
            </div>
            <div style="margin-top:20px;text-align:center;">
              <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject || 'Your message to Mr. Nice Vape')}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:13px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Antwort an ${data.name}</a>
            </div>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email,
          subject: `Kontakt: ${data.subject || 'New Nachricht'} — ${data.name}`,
          html: emailLayout(adminContent, `New contact form message from ${data.name}: ${(data.message || '').substring(0, 80)}`),
        });

        // Kunde auto-reply
        const customerContent = `
          ${heroSection('✉️', `Hi ${data.name}!`, "Wir haben Ihre Nachricht erhalten")}

          <tr><td class="content-cell" style="padding:28px 32px;">
            <p style="font-size:14px;color:#cbd5e1;line-height:1.8;margin:0 0 20px;">
              Vielen Dank für Ihre Nachricht an Mr. Nice Vape Deutschland. Unser Team hat Ihre Anfrage erhalten und antwortet an Werktagen in der Regel innerhalb von <strong style="color:#f1f5f9;">24 Stunden</strong>.
            </p>
            ${sectionLabel('Your Nachricht')}
            <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
              <p style="font-size:13px;color:#94a3b8;line-height:1.7;margin:0;white-space:pre-wrap;">${data.message}</p>
            </div>
          </td></tr>

          <tr><td style="padding:0 32px 32px;text-align:center;">
            <a href="https://mrnicevape.com" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Zum Shop</a>
          </td></tr>`;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.email],
          subject: 'Nachricht Received — Mr. Nice Vape Deutschland',
          html: emailLayout(customerContent, "Wir haben Ihre Nachricht erhalten und antworten innerhalb von 24 Stunden."),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         BTC: Zahlung Confirmed (Admin)
         ────────────────────────────────────────────────── */
      case 'btc-confirmed': {
        const content = `
          ${heroSection('₿', 'Bitcoin-Zahlung bestätigt', `${data.orderNumber} &middot; ${data.confirmations || '2+'} confirmations`, '#f59e0b')}

          <tr><td class="content-cell" style="padding:28px 32px;">
            ${sectionLabel('Transaktionsdetails')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;padding:4px 16px;border:1px solid #334155;">
              ${detailRow('Kunde', `<strong style="color:#f1f5f9;">${data.firstName} ${data.lastName}</strong>`)}
              ${detailRow('E-Mail', `<a href="mailto:${data.email}" style="color:#22c55e;text-decoration:none;">${data.email}</a>`)}
              ${detailRow('EUR Gesamt', `<span style="color:#22c55e;font-weight:700;font-size:16px;">€${data.total}</span>`)}
              ${detailRow('BTC Amount', `<code style="background:#334155;padding:3px 10px;border-radius:6px;font-size:13px;color:#fbbf24;font-weight:600;">${data.btcAmount || 'N/A'}</code>`)}
              ${detailRow('TX ID', data.txId ? `<a href="https://mempool.space/tx/${data.txId}" style="color:#22c55e;font-size:11px;word-break:break-all;text-decoration:none;">${data.txId}</a>` : 'N/A')}
              ${detailRow('Bestätigungen', badge(data.confirmations || '2+', '#22c55e'), true)}
            </table>
          </td></tr>

          <!-- Ready to Ship -->
          <tr><td style="padding:0 32px 32px;">
            <div style="background:linear-gradient(135deg,#22c55e15,#22c55e08);border:1px solid #22c55e30;border-radius:12px;padding:20px;text-align:center;">
              <p style="font-size:24px;margin:0 0 8px;">🚀</p>
              <p style="font-size:15px;font-weight:700;color:#22c55e;margin:0;">Ready to Ship</p>
              <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">Zahlung verified — this order is good to go.</p>
            </div>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || undefined,
          subject: `BTC Confirmed — ${data.orderNumber} (€${data.total})`,
          html: emailLayout(content, `Bitcoin payment confirmed for order ${data.orderNumber} — €${data.total}. Ready to ship!`),
        });
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    if (result?.error) {
      console.error('[send-email] Brevo API error:', JSON.stringify(result.error));
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-email] Sent ${type} email successfully (id: ${result?.data?.id})`);
    return new Response(JSON.stringify({ success: true, id: result?.data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[send-email] Exception:', err.message || err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
