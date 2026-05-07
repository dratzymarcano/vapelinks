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
   Shared email layout wrapper — premium light theme
   Brand: Mr. Nice Vape Deutschland
   Palette: ink #0b0f0d, paper #ffffff, surface #f7f8f5,
            line #e6e7e2, mute #6b7165, accent #1f7a3d
   ───────────────────────────────────────────────────────── */
function emailLayout(content: string, preheader: string = '') {
  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light only"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>Mr. Nice Vape Deutschland</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    body,table,td,p,a,h1,h2,h3 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-spacing:0; border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
    a { text-decoration:none; }
    .wordmark { font-family: Georgia, 'Times New Roman', serif; }
    @media only screen and (max-width: 620px) {
      .container { width:100% !important; }
      .px-pad { padding-left:20px !important; padding-right:20px !important; }
      .hero-pad { padding:32px 20px 24px !important; }
      .hide-sm { display:none !important; }
    }
    @media (prefers-color-scheme: dark) {
      .force-light { background:#ffffff !important; color:#0b0f0d !important; }
    }
  </style>
</head>
<body class="force-light" style="margin:0;padding:0;background-color:#f4f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0b0f0d;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f5f1;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f1;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

        <!-- Wordmark header -->
        <tr><td style="padding:8px 0 24px;text-align:center;">
          <a href="https://mrnicevape.com" style="text-decoration:none;color:#0b0f0d;">
            <span class="wordmark" style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:-0.4px;color:#0b0f0d;">Mr. Nice Vape</span>
          </a>
          <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
          <span style="font-size:10px;font-weight:600;letter-spacing:2.5px;color:#6b7165;text-transform:uppercase;">Deutschland &middot; K&ouml;ln</span>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e7e2;box-shadow:0 1px 2px rgba(11,15,13,0.04);">
            ${content}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 8px 0;text-align:center;">
          <p style="font-size:12px;color:#6b7165;line-height:1.6;margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            <a href="https://mrnicevape.com" style="color:#1f7a3d;text-decoration:none;font-weight:600;">mrnicevape.com</a>
            <span style="color:#cfd2c9;padding:0 8px;">&middot;</span>
            <a href="mailto:info@mrnicevape.com" style="color:#1f7a3d;text-decoration:none;font-weight:600;">info@mrnicevape.com</a>
          </p>
          <p style="font-size:11px;color:#9aa093;line-height:1.6;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            Mr. Nice Vape Deutschland &middot; Premium-Vape-Produkte aus K&ouml;ln<br/>
            Nur f&uuml;r Erwachsene ab 18 Jahren. Nikotinhaltige Produkte k&ouml;nnen abh&auml;ngig machen.<br/>
            <span style="color:#bcc0b3;">&copy; ${new Date().getFullYear()} Mr. Nice Vape &middot; Alle Rechte vorbehalten.</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────
   Reusable components — light theme
   ───────────────────────────────────────────────────────── */
function fmtEuro(n: any) {
  const v = typeof n === 'number' ? n : parseFloat(String(n || '0').replace(',', '.'));
  if (!isFinite(v)) return String(n);
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0\u20ac';
}

function esc(s: any) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}

function heroSection(eyebrow: string, title: string, subtitle: string, accentColor: string = '#1f7a3d') {
  return `
    <tr><td class="hero-pad" style="padding:40px 36px 28px;border-bottom:1px solid #eef0ea;text-align:center;">
      <div style="display:inline-block;padding:5px 12px;border:1px solid ${accentColor}33;background:${accentColor}0f;border-radius:999px;margin-bottom:18px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accentColor};">${eyebrow}</span>
      </div>
      <h1 class="wordmark" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#0b0f0d;margin:0 0 10px;letter-spacing:-0.4px;">${title}</h1>
      <p style="font-size:14px;line-height:1.55;color:#6b7165;margin:0;">${subtitle}</p>
    </td></tr>`;
}

function sectionLabel(text: string) {
  return `<p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9aa093;margin:0 0 14px;">${text}</p>`;
}

function detailRow(label: string, value: string, isLast: boolean = false) {
  const border = isLast ? 'none' : '1px solid #eef0ea';
  return `<tr>
    <td style="padding:12px 0;color:#6b7165;font-size:13px;font-weight:500;border-bottom:${border};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;color:#0b0f0d;font-size:13px;font-weight:500;border-bottom:${border};vertical-align:top;">${value}</td>
  </tr>`;
}

function divider() {
  return `<tr><td style="padding:0 36px;" class="px-pad"><div style="height:1px;background:#eef0ea;"></div></td></tr>`;
}

function infoCard(inner: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;border:1px solid #eef0ea;border-radius:10px;"><tr><td style="padding:18px 20px;">${inner}</td></tr></table>`;
}

function itemsTable(items: any[]) {
  if (!items || !items.length) return '';
  const rows = items.map((item: any, i: number) => {
    const qty = item.qty || 1;
    const unit = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
    const lineTotal = unit * qty;
    const border = i === items.length - 1 ? 'none' : '1px solid #eef0ea';
    return `<tr>
      <td style="padding:14px 0;color:#0b0f0d;font-size:14px;font-weight:500;border-bottom:${border};line-height:1.4;">
        ${esc(item.title)}
        <div style="font-size:12px;color:#9aa093;margin-top:2px;">${fmtEuro(unit)} pro St&uuml;ck</div>
      </td>
      <td style="padding:14px 0;color:#6b7165;font-size:13px;text-align:center;border-bottom:${border};width:48px;vertical-align:top;">&times;${qty}</td>
      <td style="padding:14px 0;color:#0b0f0d;font-size:14px;font-weight:600;text-align:right;border-bottom:${border};width:96px;vertical-align:top;white-space:nowrap;">${fmtEuro(lineTotal)}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalBlock(subtotal: string, shippingMethod: string, shippingCost: any, total: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;border:1px solid #eef0ea;border-radius:10px;">
      <tr>
        <td style="padding:14px 20px 6px;color:#6b7165;font-size:13px;">Zwischensumme</td>
        <td style="padding:14px 20px 6px;color:#0b0f0d;font-size:13px;text-align:right;font-weight:500;">${fmtEuro(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:6px 20px 14px;color:#6b7165;font-size:13px;">Versand &mdash; ${esc(shippingMethod || 'Standard')}</td>
        <td style="padding:6px 20px 14px;color:#0b0f0d;font-size:13px;text-align:right;font-weight:500;">${fmtEuro(shippingCost || 0)}</td>
      </tr>
      <tr><td colspan="2" style="padding:0 20px;"><div style="height:1px;background:#e6e7e2;"></div></td></tr>
      <tr>
        <td style="padding:14px 20px;color:#0b0f0d;font-size:16px;font-weight:700;">Gesamtbetrag</td>
        <td style="padding:14px 20px;color:#0b0f0d;font-size:18px;font-weight:700;text-align:right;" class="wordmark">${fmtEuro(total)}</td>
      </tr>
    </table>`;
}

function badge(text: string, color: string) {
  return `<span style="display:inline-block;padding:4px 10px;background:${color}14;color:${color};font-size:11px;font-weight:700;border-radius:999px;letter-spacing:0.4px;border:1px solid ${color}40;">${esc(text)}</span>`;
}

function button(href: string, label: string, accent: string = '#1f7a3d') {
  return `<a href="${href}" style="display:inline-block;background:${accent};color:#ffffff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">${esc(label)}</a>`;
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
        const isPaid = /bestätigt|paid|confirmed/i.test(String(data.status || ''));
        const statusColor = isPaid ? '#1f7a3d' : '#b45309';
        const addressLines = [data.address, data.address2].filter(Boolean).join(', ');
        const cityLine = `${esc(data.postcode || '')} ${esc(data.city || '')}${data.state ? ', ' + esc(data.state) : ''}`;

        const content = `
          ${heroSection('Neue Bestellung', `Bestellung ${esc(data.orderNumber)}`, `Eingegangen am ${esc(orderDate)}`)}

          <!-- Kundendaten -->
          <tr><td class="px-pad" style="padding:28px 36px 8px;">
            ${sectionLabel('Kunde')}
            ${infoCard(`
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#0b0f0d;">${esc(data.firstName)} ${esc(data.lastName)}</p>
              <p style="margin:0 0 10px;font-size:13px;color:#6b7165;">
                <a href="mailto:${esc(data.email)}" style="color:#1f7a3d;text-decoration:none;">${esc(data.email)}</a>
                ${data.phone ? `<span style="color:#cfd2c9;padding:0 6px;">&middot;</span>${esc(data.phone)}` : ''}
              </p>
              <p style="margin:0;font-size:13px;color:#0b0f0d;line-height:1.6;">
                ${esc(addressLines)}<br/>
                ${cityLine}<br/>
                Deutschland
              </p>
            `)}
          </td></tr>

          <!-- Artikel -->
          <tr><td class="px-pad" style="padding:24px 36px 8px;">
            ${sectionLabel('Bestellte Artikel')}
            ${itemsTable(data.items || [])}
            <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
            ${totalBlock(data.subtotal, data.shippingMethod, data.shippingCost, data.total)}
          </td></tr>

          ${divider()}

          <!-- Zahlung -->
          <tr><td class="px-pad" style="padding:24px 36px 28px;">
            ${sectionLabel('Zahlung')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;border:1px solid #eef0ea;border-radius:10px;">
              <tr><td style="padding:6px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailRow('Methode', `<strong>${esc(data.paymentMethod)}</strong>`)}
                  ${detailRow('Status', badge(data.status || 'Ausstehend', statusColor))}
                  ${data.btcAmount ? detailRow('BTC-Betrag', `<code style="background:#fff5dc;padding:3px 8px;border-radius:6px;font-size:12px;color:#92580a;border:1px solid #f3d98a;">${esc(data.btcAmount)}</code>`) : ''}
                  ${data.txId ? detailRow('Transaktion', `<a href="https://mempool.space/tx/${esc(data.txId)}" style="color:#1f7a3d;font-size:12px;word-break:break-all;text-decoration:underline;">${esc(data.txId)}</a>`, !data.notes) : ''}
                  ${!data.btcAmount && !data.txId ? detailRow('Referenz', `<code style="background:#fff;padding:3px 8px;border-radius:6px;font-size:12px;color:#0b0f0d;border:1px solid #e6e7e2;">${esc(data.orderNumber)}</code>`, !data.notes) : ''}
                  ${data.notes ? detailRow('Hinweise des Kunden', esc(data.notes), true) : ''}
                </table>
              </td></tr>
            </table>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || undefined,
          subject: `Neue Bestellung ${data.orderNumber} \u2014 ${fmtEuro(data.total)} (${data.paymentMethod})`,
          html: emailLayout(content, `Neue Bestellung ${data.orderNumber} von ${data.firstName} ${data.lastName} \u2014 ${fmtEuro(data.total)}`),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         CUSTOMER: Bestellung Confirmation
         ────────────────────────────────────────────────── */
      case 'customer-confirmation': {
        const isBitcoin = /bitcoin|btc/i.test(String(data.paymentMethod || ''));
        const isSepa = /sepa|bank/i.test(String(data.paymentMethod || ''));

        const paymentInfo = (() => {
          if (isBitcoin) {
            return `
              <div style="margin-top:18px;background:#fffaf0;border:1px solid #f3d98a;border-left:3px solid #b45309;border-radius:10px;padding:18px 20px;">
                <p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#92580a;margin:0 0 8px;">Bitcoin-Zahlung</p>
                <p style="font-size:13px;color:#0b0f0d;line-height:1.6;margin:0 0 6px;">Ihre Bestellung wird bearbeitet, sobald die Bitcoin-Zahlung im Netzwerk best&auml;tigt ist (in der Regel 10\u201330 Minuten).</p>
                ${data.btcAmount ? `<p style="font-size:13px;color:#0b0f0d;margin:6px 0 0;">Erwarteter Betrag: <strong>${esc(data.btcAmount)} BTC</strong></p>` : ''}
                ${data.txId ? `<p style="font-size:12px;color:#6b7165;margin:6px 0 0;word-break:break-all;">Transaktion: <a href="https://mempool.space/tx/${esc(data.txId)}" style="color:#1f7a3d;">${esc(String(data.txId).substring(0, 24))}\u2026</a></p>` : ''}
              </div>`;
          }
          if (isSepa) {
            return `
              <div style="margin-top:18px;background:#f7f8f5;border:1px solid #eef0ea;border-left:3px solid #1f7a3d;border-radius:10px;padding:18px 20px;">
                <p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1f7a3d;margin:0 0 8px;">SEPA-&Uuml;berweisung</p>
                <p style="font-size:13px;color:#0b0f0d;line-height:1.65;margin:0;">Bitte verwenden Sie <strong>${esc(data.orderNumber)}</strong> als Verwendungszweck. Wir versenden Ihre Bestellung, sobald der Zahlungseingang bei uns best&auml;tigt ist.</p>
              </div>`;
          }
          return '';
        })();

        const content = `
          ${heroSection('Bestellbest&auml;tigung', `Vielen Dank, ${esc(data.firstName)}.`, 'Wir haben Ihre Bestellung erhalten und bearbeiten sie umgehend.')}

          <!-- Bestellnummer -->
          <tr><td class="px-pad" style="padding:28px 36px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;border:1px solid #eef0ea;border-radius:10px;">
              <tr>
                <td style="padding:16px 22px;">
                  <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9aa093;">Bestellnummer</p>
                  <p class="wordmark" style="font-family:Georgia,'Times New Roman',serif;margin:0;font-size:20px;font-weight:700;color:#0b0f0d;letter-spacing:-0.2px;">${esc(data.orderNumber)}</p>
                </td>
                <td align="right" style="padding:16px 22px;">
                  <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9aa093;">Gesamt</p>
                  <p class="wordmark" style="font-family:Georgia,'Times New Roman',serif;margin:0;font-size:20px;font-weight:700;color:#0b0f0d;">${fmtEuro(data.total)}</p>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Artikel -->
          <tr><td class="px-pad" style="padding:28px 36px 8px;">
            ${sectionLabel('Ihre Bestellung')}
            ${itemsTable(data.items || [])}
            <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
            ${totalBlock(data.subtotal || data.total, data.shippingMethod, data.shippingCost, data.total)}
            ${paymentInfo}
          </td></tr>

          ${divider()}

          <!-- Versand -->
          <tr><td class="px-pad" style="padding:24px 36px 8px;">
            ${sectionLabel('Lieferadresse')}
            ${infoCard(`
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0b0f0d;">${esc(data.firstName)} ${esc(data.lastName)}</p>
              <p style="margin:0;font-size:13px;color:#6b7165;line-height:1.7;">
                ${esc([data.address, data.address2].filter(Boolean).join(', '))}<br/>
                ${esc(data.postcode || '')} ${esc(data.city || '')}${data.state ? ', ' + esc(data.state) : ''}<br/>
                Deutschland
              </p>
            `)}
          </td></tr>

          ${divider()}

          <!-- Zeitleiste -->
          <tr><td class="px-pad" style="padding:24px 36px 8px;">
            ${sectionLabel('So geht es weiter')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:34px;vertical-align:top;padding-top:2px;">
                  <div style="width:26px;height:26px;line-height:26px;text-align:center;background:#1f7a3d;border-radius:50%;font-size:12px;color:#ffffff;font-weight:700;">1</div>
                </td>
                <td style="padding:0 0 18px 14px;">
                  <p style="font-size:14px;color:#0b0f0d;font-weight:600;margin:0;">Bestellung wird bearbeitet</p>
                  <p style="font-size:13px;color:#6b7165;margin:3px 0 0;line-height:1.55;">Wir kommissionieren Ihre Artikel und bereiten den Versand vor.</p>
                </td>
              </tr>
              <tr>
                <td style="width:34px;vertical-align:top;padding-top:2px;">
                  <div style="width:26px;height:26px;line-height:26px;text-align:center;background:#ffffff;border:1px solid #e6e7e2;border-radius:50%;font-size:12px;color:#6b7165;font-weight:700;">2</div>
                </td>
                <td style="padding:0 0 18px 14px;">
                  <p style="font-size:14px;color:#0b0f0d;font-weight:600;margin:0;">Versand &amp; Sendungsverfolgung</p>
                  <p style="font-size:13px;color:#6b7165;margin:3px 0 0;line-height:1.55;">Sie erhalten Tracking-Daten per E-Mail, sobald das Paket unterwegs ist.</p>
                </td>
              </tr>
              <tr>
                <td style="width:34px;vertical-align:top;padding-top:2px;">
                  <div style="width:26px;height:26px;line-height:26px;text-align:center;background:#ffffff;border:1px solid #e6e7e2;border-radius:50%;font-size:12px;color:#6b7165;font-weight:700;">3</div>
                </td>
                <td style="padding:0 0 0 14px;">
                  <p style="font-size:14px;color:#0b0f0d;font-weight:600;margin:0;">Zugestellt</p>
                  <p style="font-size:13px;color:#6b7165;margin:3px 0 0;line-height:1.55;">Standardversand 2&ndash;4 Werktage, Express 1&ndash;2 Werktage innerhalb Deutschlands.</p>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- CTA -->
          <tr><td class="px-pad" style="padding:28px 36px 12px;text-align:center;">
            ${button('https://mrnicevape.com', 'Weiter im Shop st&ouml;bern')}
          </td></tr>

          <!-- Support -->
          <tr><td class="px-pad" style="padding:0 36px 32px;text-align:center;">
            <p style="font-size:12px;color:#6b7165;line-height:1.6;margin:0;">
              Fragen zu Ihrer Bestellung? Antworten Sie einfach auf diese E-Mail oder schreiben Sie an<br/>
              <a href="mailto:info@mrnicevape.com" style="color:#1f7a3d;font-weight:600;text-decoration:none;">info@mrnicevape.com</a>
            </p>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.email],
          subject: `Bestellbest\u00e4tigung ${data.orderNumber} \u2014 Mr. Nice Vape Deutschland`,
          html: emailLayout(content, `Vielen Dank f\u00fcr Ihre Bestellung ${data.orderNumber}. Gesamt ${fmtEuro(data.total)}.`),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         CONTACT FORM: Admin Notification
         ────────────────────────────────────────────────── */
      case 'contact': {
        const contactDate = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const safeMessage = esc(data.message).replace(/\n/g, '<br/>');

        const adminContent = `
          ${heroSection('Kontaktanfrage', 'Neue Nachricht aus dem Kontaktformular', `Eingegangen am ${esc(contactDate)}`)}

          <tr><td class="px-pad" style="padding:28px 36px 8px;">
            ${sectionLabel('Absender')}
            ${infoCard(`
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow('Name', `<strong>${esc(data.name)}</strong>`)}
                ${detailRow('E-Mail', `<a href="mailto:${esc(data.email)}" style="color:#1f7a3d;text-decoration:none;">${esc(data.email)}</a>`)}
                ${detailRow('Betreff', esc(data.subject || 'Allgemeine Anfrage'), true)}
              </table>
            `)}
          </td></tr>

          ${divider()}

          <tr><td class="px-pad" style="padding:24px 36px 28px;">
            ${sectionLabel('Nachricht')}
            <div style="background:#f7f8f5;border:1px solid #eef0ea;border-left:3px solid #1f7a3d;border-radius:10px;padding:20px 22px;">
              <p style="font-size:14px;color:#0b0f0d;line-height:1.75;margin:0;">${safeMessage}</p>
            </div>
            <div style="margin-top:22px;text-align:center;">
              ${button(`mailto:${esc(data.email)}?subject=${encodeURIComponent('Re: ' + (data.subject || 'Ihre Anfrage bei Mr. Nice Vape'))}`, `An ${esc(data.name)} antworten`)}
            </div>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email,
          subject: `Kontaktanfrage: ${data.subject || 'Allgemeine Anfrage'} \u2014 ${data.name}`,
          html: emailLayout(adminContent, `Neue Kontaktanfrage von ${data.name}: ${(data.message || '').substring(0, 80)}`),
        });

        // Customer auto-reply
        const customerContent = `
          ${heroSection('Eingangsbest&auml;tigung', `Vielen Dank, ${esc(data.name)}.`, 'Wir haben Ihre Nachricht erhalten und melden uns in K\u00fcrze.')}

          <tr><td class="px-pad" style="padding:28px 36px 8px;">
            <p style="font-size:15px;color:#0b0f0d;line-height:1.7;margin:0 0 20px;">
              Unser Team beantwortet Ihre Anfrage in der Regel innerhalb von <strong>24 Stunden</strong> an Werktagen. Bei dringenden Bestellfragen geben Sie bitte Ihre Bestellnummer an, sobald Sie antworten.
            </p>
            ${sectionLabel('Ihre Nachricht')}
            ${infoCard(`<p style="font-size:13px;color:#6b7165;line-height:1.75;margin:0;">${safeMessage}</p>`)}
          </td></tr>

          <tr><td class="px-pad" style="padding:28px 36px 12px;text-align:center;">
            ${button('https://mrnicevape.com', 'Zur&uuml;ck zum Shop')}
          </td></tr>

          <tr><td class="px-pad" style="padding:0 36px 32px;text-align:center;">
            <p style="font-size:12px;color:#6b7165;margin:0;">Direkter Kontakt: <a href="mailto:info@mrnicevape.com" style="color:#1f7a3d;font-weight:600;text-decoration:none;">info@mrnicevape.com</a></p>
          </td></tr>`;

        await resend.emails.send({
          from: FROM_EMAIL,
          to: [data.email],
          subject: 'Wir haben Ihre Nachricht erhalten \u2014 Mr. Nice Vape Deutschland',
          html: emailLayout(customerContent, 'Wir haben Ihre Nachricht erhalten und antworten innerhalb von 24 Stunden.'),
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         BTC: Zahlung Confirmed (Admin)
         ────────────────────────────────────────────────── */
      case 'btc-confirmed': {
        const content = `
          ${heroSection('Zahlung best&auml;tigt', 'Bitcoin-Zahlung eingegangen', `Bestellung ${esc(data.orderNumber)} &middot; ${esc(data.confirmations || '2+')} Best&auml;tigungen`, '#1f7a3d')}

          <tr><td class="px-pad" style="padding:28px 36px 8px;">
            ${sectionLabel('Transaktionsdetails')}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;border:1px solid #eef0ea;border-radius:10px;">
              <tr><td style="padding:6px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailRow('Kunde', `<strong>${esc(data.firstName)} ${esc(data.lastName)}</strong>`)}
                  ${detailRow('E-Mail', `<a href="mailto:${esc(data.email)}" style="color:#1f7a3d;text-decoration:none;">${esc(data.email)}</a>`)}
                  ${detailRow('Betrag (EUR)', `<strong style="font-size:15px;">${fmtEuro(data.total)}</strong>`)}
                  ${detailRow('Betrag (BTC)', `<code style="background:#fff5dc;padding:3px 10px;border-radius:6px;font-size:13px;color:#92580a;font-weight:600;border:1px solid #f3d98a;">${esc(data.btcAmount || 'k.A.')}</code>`)}
                  ${detailRow('Transaktion', data.txId ? `<a href="https://mempool.space/tx/${esc(data.txId)}" style="color:#1f7a3d;font-size:12px;word-break:break-all;text-decoration:underline;">${esc(data.txId)}</a>` : '<span style="color:#9aa093;">k.A.</span>')}
                  ${detailRow('Best&auml;tigungen', badge(data.confirmations || '2+', '#1f7a3d'), true)}
                </table>
              </td></tr>
            </table>
          </td></tr>

          <tr><td class="px-pad" style="padding:24px 36px 32px;">
            <div style="background:#f0f7f1;border:1px solid #cfe5d4;border-radius:10px;padding:20px;text-align:center;">
              <p style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1f7a3d;margin:0 0 4px;">Versandbereit</p>
              <p style="font-size:13px;color:#0b0f0d;margin:0;line-height:1.55;">Die Zahlung ist verifiziert. Diese Bestellung kann jetzt kommissioniert und versendet werden.</p>
            </div>
          </td></tr>`;

        result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || undefined,
          subject: `BTC best\u00e4tigt \u2014 Bestellung ${data.orderNumber} (${fmtEuro(data.total)})`,
          html: emailLayout(content, `Bitcoin-Zahlung f\u00fcr Bestellung ${data.orderNumber} \u00fcber ${fmtEuro(data.total)} best\u00e4tigt.`),
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
