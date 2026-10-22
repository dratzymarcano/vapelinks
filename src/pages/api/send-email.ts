export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

/* ─────────────────────────────────────────────────────────
   Environment & Configuration
   ───────────────────────────────────────────────────────── */
function getEnv(locals: any, key: string): string | undefined {
  return (
    locals?.runtime?.env?.[key] ||
    (import.meta as any).env?.[key] ||
    (typeof process !== 'undefined' ? process.env?.[key] : undefined)
  );
}

const DEFAULT_FROM = 'Mr. Nice Vape <info@mrnicevape.com>';
const DEFAULT_ADMIN = 'info@mrnicevape.com';
const FALLBACK_FROM = 'Mr. Nice Vape <orders@useful-chemicals.com>';

function getResendClient(locals: any) {
  const apiKey = getEnv(locals, 'RESEND_API_KEY') || '';
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }
  return new Resend(apiKey);
}

/* ─────────────────────────────────────────────────────────
   Resend Dispatch with Automatic Domain Fallback
   If custom domain DNS is pending verification in Resend,
   it gracefully routes through the verified sender while
   retaining reply-to: info@mrnicevape.com.
   ───────────────────────────────────────────────────────── */
interface EmailSendOptions {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  fallbackFrom?: string;
}

async function sendEmailWithFallback(resend: Resend, opts: EmailSendOptions) {
  const fallbackFrom = opts.fallbackFrom || FALLBACK_FROM;

  try {
    const res = await resend.emails.send({
      from: opts.from,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (res.error) {
      const msg = String(res.error.message || '');
      const statusCode = (res.error as any).statusCode;
      if (statusCode === 403 || msg.includes('not verified') || msg.includes('domain')) {
        console.warn(`[send-email] Primary sender "${opts.from}" not verified. Retrying via "${fallbackFrom}"...`);
        return await resend.emails.send({
          from: fallbackFrom,
          to: opts.to,
          replyTo: opts.replyTo || DEFAULT_ADMIN,
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        });
      }
    }

    return res;
  } catch (err: any) {
    const msg = String(err.message || '');
    if (msg.includes('not verified') || msg.includes('domain')) {
      console.warn(`[send-email] Caught domain error. Retrying via fallback sender "${fallbackFrom}"...`);
      return await resend.emails.send({
        from: fallbackFrom,
        to: opts.to,
        replyTo: opts.replyTo || DEFAULT_ADMIN,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
    }
    throw err;
  }
}

/* ─────────────────────────────────────────────────────────
   Utilities & Formatters
   ───────────────────────────────────────────────────────── */
function esc(s: any): string {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c
  );
}

function fmtEuro(n: any): string {
  const v = typeof n === 'number' ? n : parseFloat(String(n || '0').replace(',', '.'));
  if (!isFinite(v)) return esc(String(n));
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '&nbsp;€';
}

/* ─────────────────────────────────────────────────────────
   UI/UX: Minimalist, Flat, Modern & Beautiful Email Layout
   Warm bone background (#f6f6f4), crisp white cards (#ffffff),
   subtle borders (#e7e7e2), pure high-contrast typography,
   no heavy gradients, no drop-shadows.
   ───────────────────────────────────────────────────────── */
function emailLayout(content: string, preheader: string = ''): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light only"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>Mr. Nice Vape Deutschland</title>
  <style>
    body, table, td, p, a, h1, h2, h3 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; }
    table { border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .px-responsive { padding-left: 20px !important; padding-right: 20px !important; }
      .py-responsive { padding-top: 24px !important; padding-bottom: 24px !important; }
      .stack-mobile { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F5F6F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0B0F0D;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#F5F6F2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F6F2;">
    <tr>
      <td align="center" style="padding:36px 12px 48px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#71786D;margin-bottom:8px;">
                Versandlager K&ouml;ln (NRW) &middot; Originalware 18+
              </div>
              <a href="https://mrnicevape.com" target="_blank" style="text-decoration:none;display:inline-block;">
                <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#0B0F0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  Mr. Nice Vape
                </span>
                <span style="display:inline-block;margin-left:6px;padding:2px 8px;background:#E8EAE2;color:#4B5547;font-size:11px;font-weight:700;letter-spacing:0.8px;border-radius:4px;vertical-align:middle;text-transform:uppercase;">
                  Deutschland
                </span>
              </a>
            </td>
          </tr>

          <!-- Main White Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E4DC;">
                ${content}
              </table>
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="font-size:13px;color:#555E50;line-height:1.6;margin:0 0 10px;">
                <a href="https://mrnicevape.com" target="_blank" style="color:#15803D;font-weight:600;text-decoration:none;">mrnicevape.com</a>
                <span style="color:#C6C9BE;padding:0 8px;">&middot;</span>
                <a href="mailto:info@mrnicevape.com" style="color:#15803D;font-weight:600;text-decoration:none;">info@mrnicevape.com</a>
                <span style="color:#C6C9BE;padding:0 8px;">&middot;</span>
                <a href="https://mrnicevape.com/contact" target="_blank" style="color:#15803D;font-weight:600;text-decoration:none;">Kundenservice</a>
              </p>
              <p style="font-size:11px;color:#8A9284;line-height:1.6;margin:0;">
                Mr. Nice Vape Deutschland &middot; Fachversand f&uuml;r E-Zigaretten, Liquids &amp; Zubeh&ouml;r.<br/>
                Abgabe ausschlie&szlig;lich an Personen ab 18 Jahren gem&auml;&szlig; &sect; 10 Jugendschutzgesetz (JuSchG).<br/>
                <span style="color:#A6ADA0;">&copy; ${currentYear} Mr. Nice Vape Deutschland. Alle Rechte vorbehalten.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────
   UI Components (Minimalist & Flat)
   ───────────────────────────────────────────────────────── */
function statusBadge(text: string, type: 'success' | 'pending' | 'neutral' = 'success'): string {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    success: { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    pending: { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    neutral: { bg: '#F1F3EE', color: '#4B5547', border: '#DCE0D4' },
  };
  const s = styles[type] || styles.neutral;
  return `<span style="display:inline-block;padding:4px 10px;background:${s.bg};color:${s.color};font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;border-radius:4px;border:1px solid ${s.border};">${esc(text)}</span>`;
}

function emailHero(title: string, subtitle: string, badgeHtml?: string): string {
  return `
    <tr>
      <td class="px-responsive py-responsive" style="padding:32px 36px 24px;border-bottom:1px solid #ECEEE6;text-align:left;">
        ${badgeHtml ? `<div style="margin-bottom:12px;">${badgeHtml}</div>` : ''}
        <h1 style="font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-0.4px;color:#0B0F0D;margin:0 0 8px;">${title}</h1>
        <p style="font-size:14px;line-height:1.55;color:#555E50;margin:0;">${subtitle}</p>
      </td>
    </tr>`;
}

function sectionTitle(text: string): string {
  return `<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#71786D;margin:0 0 12px;">${text}</div>`;
}

function flatCard(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAF7;border:1px solid #ECEEE6;border-radius:8px;">
    <tr><td style="padding:16px 18px;">${inner}</td></tr>
  </table>`;
}

function orderMetricStrip(orderNumber: string, orderDate: string, total: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAF7;border:1px solid #ECEEE6;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 18px;border-right:1px solid #ECEEE6;width:33.3%;">
          <div style="font-size:11px;color:#71786D;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Bestellnummer</div>
          <div style="font-size:14px;font-weight:800;color:#0B0F0D;font-family:monospace;">${esc(orderNumber)}</div>
        </td>
        <td style="padding:16px 18px;border-right:1px solid #ECEEE6;width:33.3%;">
          <div style="font-size:11px;color:#71786D;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Datum</div>
          <div style="font-size:13px;font-weight:600;color:#0B0F0D;">${esc(orderDate)}</div>
        </td>
        <td style="padding:16px 18px;width:33.3%;">
          <div style="font-size:11px;color:#71786D;text-transform:uppercase;font-weight:600;margin-bottom:4px;">Gesamtbetrag</div>
          <div style="font-size:15px;font-weight:800;color:#15803D;">${fmtEuro(total)}</div>
        </td>
      </tr>
    </table>`;
}

function itemsTable(items: any[]): string {
  if (!items || !items.length) {
    return `<p style="font-size:13px;color:#71786D;margin:0;">Keine Artikeldetails hinterlegt.</p>`;
  }

  const rows = items.map((item: any, i: number) => {
    const qty = Number(item.qty) || 1;
    const unit = parseFloat(String(item.price || '0').replace(',', '.')) || 0;
    const lineTotal = unit * qty;
    const isLast = i === items.length - 1;
    const border = isLast ? 'none' : '1px solid #ECEEE6';

    return `
      <tr>
        <td style="padding:12px 0;border-bottom:${border};vertical-align:top;">
          <div style="font-size:14px;font-weight:600;color:#0B0F0D;line-height:1.4;">${esc(item.title)}</div>
          <div style="font-size:12px;color:#71786D;margin-top:2px;">Einzelpreis: ${fmtEuro(unit)}</div>
        </td>
        <td style="padding:12px 12px;border-bottom:${border};text-align:center;vertical-align:top;width:60px;">
          <span style="display:inline-block;background:#EAECE4;color:#2D332A;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;">&times;${qty}</span>
        </td>
        <td style="padding:12px 0;border-bottom:${border};text-align:right;vertical-align:top;width:90px;white-space:nowrap;">
          <div style="font-size:14px;font-weight:700;color:#0B0F0D;">${fmtEuro(lineTotal)}</div>
        </td>
      </tr>`;
  }).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalBlock(subtotal: string, shippingMethod: string, shippingCost: any, total: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAF7;border:1px solid #ECEEE6;border-radius:8px;margin-top:16px;">
      <tr>
        <td style="padding:12px 18px 4px;font-size:13px;color:#555E50;">Zwischensumme</td>
        <td style="padding:12px 18px 4px;font-size:13px;color:#0B0F0D;text-align:right;font-weight:600;">${fmtEuro(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 18px 12px;font-size:13px;color:#555E50;">
          Versand (${esc(shippingMethod || 'Standardversand')})
        </td>
        <td style="padding:4px 18px 12px;font-size:13px;color:#0B0F0D;text-align:right;font-weight:600;">${fmtEuro(shippingCost || 0)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 18px;"><div style="height:1px;background:#E2E4DC;"></div></td>
      </tr>
      <tr>
        <td style="padding:14px 18px;font-size:15px;font-weight:800;color:#0B0F0D;">Gesamtbetrag (inkl. MwSt.)</td>
        <td style="padding:14px 18px;font-size:17px;font-weight:800;color:#15803D;text-align:right;">${fmtEuro(total)}</td>
      </tr>
    </table>`;
}

function getExplorerUrl(network: string, txId: string): string {
  const n = (network || '').toLowerCase();
  const id = encodeURIComponent(String(txId || '').trim());
  if (n.includes('tron') || n.includes('trc')) return `https://tronscan.org/#/transaction/${id}`;
  if (n.includes('eth') || n.includes('erc')) return `https://etherscan.io/tx/${id}`;
  if (n.includes('sol')) return `https://solscan.io/tx/${id}`;
  if (n.includes('xmr') || n.includes('monero')) return `https://xmrchain.net/search?value=${id}`;
  return `https://mempool.space/tx/${id}`;
}

function paymentInstructions(dataOrMethod: any, orderNumber?: string, btcAmount?: string, txId?: string): string {
  const isObject = typeof dataOrMethod === 'object' && dataOrMethod !== null;
  const paymentMethod = isObject ? (dataOrMethod.paymentMethod || '') : (dataOrMethod || '');
  const orderNum = isObject ? (dataOrMethod.orderNumber || '') : (orderNumber || '');
  const tx = isObject ? (dataOrMethod.txId || '') : (txId || '');
  const cryptoCoin = isObject ? (dataOrMethod.cryptoCoin || '') : '';
  const cryptoSymbol = isObject ? (dataOrMethod.cryptoSymbol || '') : '';
  const cryptoNetwork = isObject ? (dataOrMethod.cryptoNetwork || '') : '';
  const cryptoAddress = isObject ? (dataOrMethod.cryptoAddress || '') : '';

  const isCrypto = /krypto|crypto|bitcoin|btc|eth|usdt|usdc|sol|xmr/i.test(paymentMethod) || !!tx;
  const isSepa = /sepa|bank|überweisung/i.test(paymentMethod);

  if (isSepa) {
    return `
      <div style="margin-top:20px;background:#F9FAF7;border:1px solid #ECEEE6;border-left:4px solid #15803D;border-radius:8px;padding:18px 20px;">
        <div style="font-size:13px;font-weight:800;color:#15803D;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
          Zahlungsanweisung: SEPA-Bank&uuml;berweisung
        </div>
        <p style="font-size:13px;color:#333A2F;line-height:1.6;margin:0 0 12px;">
          Bitte &uuml;berweisen Sie den Rechnungsbetrag auf unser deutsches Gesch&auml;ftskonto. Geben Sie als Verwendungszweck ausschlie&szlig;lich Ihre Bestellnummer an:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#71786D;width:130px;">Empf&auml;nger:</td>
            <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">Mr. Nice Vape Deutschland GmbH</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#71786D;">Bankinstitut:</td>
            <td style="padding:4px 0;color:#0B0F0D;font-weight:600;">Deutsche Bank</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#71786D;">IBAN:</td>
            <td style="padding:4px 0;color:#0B0F0D;font-weight:700;font-family:monospace;letter-spacing:1px;">DE89 3704 0044 0532 0130 00</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#71786D;">BIC:</td>
            <td style="padding:4px 0;color:#0B0F0D;font-weight:600;font-family:monospace;">COBADEFFXXX</td>
          </tr>
          <tr>
            <td style="padding:8px 0 4px;color:#71786D;vertical-align:top;">Verwendungszweck:</td>
            <td style="padding:8px 0 4px;">
              <span style="display:inline-block;background:#FEF3C7;color:#92400E;padding:3px 10px;border-radius:4px;font-weight:800;font-family:monospace;border:1px solid #FDE68A;">
                ${esc(orderNum)}
              </span>
            </td>
          </tr>
        </table>
        <p style="font-size:12px;color:#71786D;line-height:1.5;margin:12px 0 0;">
          Sobald die Zahlung auf unserem Konto verbucht ist, wird Ihre Sendung umgehend aus unserem Lager in K&ouml;ln verpackt und versendet.
        </p>
      </div>`;
  }

  if (isCrypto) {
    const explorerUrl = tx ? getExplorerUrl(cryptoNetwork, tx) : '';
    return `
      <div style="margin-top:20px;background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #16A34A;border-radius:8px;padding:18px 20px;">
        <div style="font-size:13px;font-weight:800;color:#15803D;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
          Zahlungsstatus: Kryptow&auml;hrung erhalten &middot; Prüfung aktiv
        </div>
        <p style="font-size:13px;color:#1F2937;line-height:1.6;margin:0 0 10px;">
          Vielen Dank! Ihre Kryptozahlung wurde mit nachfolgenden Daten übermittelt:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          ${cryptoCoin ? `
            <tr>
              <td style="padding:4px 0;color:#71786D;width:130px;">W&auml;hrung:</td>
              <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(cryptoCoin)} ${cryptoSymbol ? `(${esc(cryptoSymbol)})` : ''}</td>
            </tr>` : ''}
          ${cryptoNetwork ? `
            <tr>
              <td style="padding:4px 0;color:#71786D;">Netzwerk:</td>
              <td style="padding:4px 0;color:#0B0F0D;font-weight:600;">${esc(cryptoNetwork)}</td>
            </tr>` : ''}
          ${cryptoAddress ? `
            <tr>
              <td style="padding:4px 0;color:#71786D;vertical-align:top;">Ziel-Wallet:</td>
              <td style="padding:4px 0;font-family:monospace;font-size:11px;color:#0B0F0D;word-break:break-all;">${esc(cryptoAddress)}</td>
            </tr>` : ''}
          ${tx ? `
            <tr>
              <td style="padding:8px 0 4px;color:#71786D;vertical-align:top;">Transaktions-ID:</td>
              <td style="padding:8px 0 4px;">
                <div style="background:#FFFFFF;border:1px solid #A7F3D0;border-radius:6px;padding:8px 10px;font-family:monospace;font-size:11px;word-break:break-all;">
                  <a href="${explorerUrl}" target="_blank" style="color:#15803D;font-weight:700;text-decoration:none;">
                    ${esc(tx)} &nearr;
                  </a>
                </div>
                <div style="font-size:11px;color:#047857;margin-top:4px;">
                  &check; Transaktions-Hash im Blockchain-Explorer einsehbar
                </div>
              </td>
            </tr>` : ''}
        </table>
        <p style="font-size:12px;color:#4B5547;line-height:1.5;margin:10px 0 0;">
          Unser K&ouml;lner Logistik-Team gleicht die Transaktions-ID im Netzwerk ab. Sobald die Best&auml;tigung registriert ist, wird Ihre Sendung neutral und versichert kommissioniert.
        </p>
      </div>`;
  }

  return '';
}

function fulfillmentSteps(): string {
  return `
    <div style="margin-top:24px;border-top:1px solid #ECEEE6;padding-top:20px;">
      ${sectionTitle('Versandablauf')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:28px;vertical-align:top;padding-top:2px;">
            <div style="width:22px;height:22px;line-height:22px;text-align:center;background:#15803D;color:#FFFFFF;border-radius:50%;font-size:11px;font-weight:800;">1</div>
          </td>
          <td style="padding:0 0 14px 10px;vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#0B0F0D;">Eingang &amp; Vorbereitung</div>
            <div style="font-size:12px;color:#71786D;line-height:1.45;margin-top:2px;">Ihre Bestellung wurde im System erfasst und wird nach Zahlungseingang freigegeben.</div>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top;padding-top:2px;">
            <div style="width:22px;height:22px;line-height:22px;text-align:center;background:#EAECE4;color:#4B5547;border-radius:50%;font-size:11px;font-weight:800;">2</div>
          </td>
          <td style="padding:0 0 14px 10px;vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#0B0F0D;">Kommissionierung im Lager K&ouml;ln</div>
            <div style="font-size:12px;color:#71786D;line-height:1.45;margin-top:2px;">Sorgf&auml;ltige Qualit&auml;tspr&uuml;fung und bruchsichere Verpackung Ihrer Artikel.</div>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top;padding-top:2px;">
            <div style="width:22px;height:22px;line-height:22px;text-align:center;background:#EAECE4;color:#4B5547;border-radius:50%;font-size:11px;font-weight:800;">3</div>
          </td>
          <td style="padding:0 0 0 10px;vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#0B0F0D;">Versand mit Sendungsverfolgung (18+)</div>
            <div style="font-size:12px;color:#71786D;line-height:1.45;margin-top:2px;">Sie erhalten Ihre Tracking-Nummer per E-Mail. Zustellung mit Alterssichtpr&uuml;fung.</div>
          </td>
        </tr>
      </table>
    </div>`;
}

function flatButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
      <tr>
        <td style="background-color:#0B0F0D;border-radius:6px;text-align:center;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:0.3px;text-decoration:none;">
            ${esc(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/* ─────────────────────────────────────────────────────────
   GET Handler: Diagnostics & Smoke Test
   ───────────────────────────────────────────────────────── */
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const isTest = url.searchParams.get('test') === '1' || url.searchParams.get('test') === 'true';

  const resendKey = getEnv(locals, 'RESEND_API_KEY') || DEFAULT_RESEND_KEY;
  const adminEmail = getEnv(locals, 'RESEND_ADMIN_EMAIL') || DEFAULT_ADMIN;
  const fromEmail = getEnv(locals, 'RESEND_FROM_EMAIL') || DEFAULT_FROM;
  const fallbackFrom = getEnv(locals, 'RESEND_FALLBACK_FROM') || FALLBACK_FROM;

  if (isTest) {
    try {
      const resend = getResendClient(locals);
      const testDate = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
      const testContent = `
        ${emailHero('Resend API Test &middot; Verbindung aktiv', `Erfolgreich getestet am ${esc(testDate)}`, statusBadge('System Online', 'success'))}
        <tr>
          <td class="px-responsive py-responsive" style="padding:28px 36px 32px;">
            ${sectionTitle('Systemstatus')}
            ${flatCard(`
              <p style="font-size:14px;color:#0B0F0D;font-weight:700;margin:0 0 6px;">E-Mail-Routing f&uuml;r Mr. Nice Vape Deutschland funktioniert einwandfrei.</p>
              <p style="font-size:13px;color:#555E50;line-height:1.6;margin:0 0 10px;">
                Bestellbenachrichtigungen und Kundenanfragen werden zuverl&auml;ssig an <strong>${esc(adminEmail)}</strong> zugestellt.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;color:#555E50;">
                <tr><td style="padding:3px 0;width:140px;">Admin-Ziel:</td><td style="color:#0B0F0D;font-weight:600;">${esc(adminEmail)}</td></tr>
                <tr><td style="padding:3px 0;">Haupt-Absender:</td><td style="color:#0B0F0D;font-weight:600;">${esc(fromEmail)}</td></tr>
                <tr><td style="padding:3px 0;">Fallback-Absender:</td><td style="color:#0B0F0D;font-weight:600;">${esc(fallbackFrom)}</td></tr>
              </table>
            `)}
            ${flatButton('https://mrnicevape.com', 'Zur Website')}
          </td>
        </tr>`;

      const result = await sendEmailWithFallback(resend, {
        from: fromEmail,
        to: [adminEmail],
        replyTo: adminEmail,
        subject: `[Test] Resend Mailer aktiv – Mr. Nice Vape Deutschland`,
        html: emailLayout(testContent, 'Verbindungstest der Resend API f&uuml;r Mr. Nice Vape Deutschland erfolgreich.'),
        fallbackFrom,
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Test email dispatched to ${adminEmail}`,
        id: result?.data?.id || null,
        error: result?.error || null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message || err,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({
    status: 'online',
    service: 'Mr. Nice Vape Resend Mailer',
    adminEmail,
    fromEmail,
    fallbackFrom,
    keyConfigured: Boolean(resendKey),
    hint: 'Add ?test=1 to trigger a live smoke-test email to ' + adminEmail,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/* ─────────────────────────────────────────────────────────
   POST Handler: Production Mailer
   ───────────────────────────────────────────────────────── */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const resend = getResendClient(locals);
    const FROM_EMAIL = getEnv(locals, 'RESEND_FROM_EMAIL') || DEFAULT_FROM;
    const ADMIN_EMAIL = getEnv(locals, 'RESEND_ADMIN_EMAIL') || DEFAULT_ADMIN;
    const FALLBACK_SENDER = getEnv(locals, 'RESEND_FALLBACK_FROM') || FALLBACK_FROM;

    const body = await request.json().catch(() => ({}));
    const { type, data } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing email type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (type) {
      /* ──────────────────────────────────────────────────
         1. TEST EMAIL
         ────────────────────────────────────────────────── */
      case 'test': {
        const testDate = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const targetEmail = data?.email || ADMIN_EMAIL;

        const content = `
          ${emailHero('Resend API Test &middot; Mr. Nice Vape', `Versendet am ${esc(testDate)}`, statusBadge('Test Erfolgreich', 'success'))}
          <tr>
            <td class="px-responsive py-responsive" style="padding:28px 36px 32px;">
              ${sectionTitle('Systemstatus')}
              ${flatCard(`
                <p style="font-size:14px;color:#0B0F0D;font-weight:700;margin:0 0 6px;">Die Resend E-Mail-API ist vollst&auml;ndig konfiguriert.</p>
                <p style="font-size:13px;color:#555E50;line-height:1.6;margin:0;">
                  Bestellungen und Kundenanfragen werden zuverl&auml;ssig &uuml;ber <strong>${esc(ADMIN_EMAIL)}</strong> empfangen.
                </p>
              `)}
              ${flatButton('https://mrnicevape.com', 'Zur Website')}
            </td>
          </tr>`;

        result = await sendEmailWithFallback(resend, {
          from: FROM_EMAIL,
          to: [targetEmail],
          replyTo: ADMIN_EMAIL,
          subject: `Test-E-Mail: Resend API aktiv – Mr. Nice Vape Deutschland`,
          html: emailLayout(content, 'Test-E-Mail von Mr. Nice Vape Deutschland.'),
          fallbackFrom: FALLBACK_SENDER,
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         2. ADMIN: Benachrichtigung über neue Bestellung
         Wird SOFORT bei jeder Bestellung an info@mrnicevape.com gesendet
         ────────────────────────────────────────────────── */
      case 'admin-order': {
        const orderDate = new Date(data.date || Date.now()).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const isPaid = /bestätigt|paid|confirmed/i.test(String(data.status || ''));
        const badgeType = isPaid ? 'success' : 'pending';
        const badgeLabel = isPaid ? 'Zahlung bestätigt' : (data.status || 'Zahlung ausstehend');

        const addressLines = [data.address, data.address2].filter(Boolean).join(', ');
        const cityLine = `${esc(data.postcode || '')} ${esc(data.city || '')}${data.state ? ', ' + esc(data.state) : ''}`;

        const content = `
          ${emailHero(
            `Neue Bestellung #${esc(data.orderNumber)}`,
            `Eingegangen am ${esc(orderDate)} &middot; Rechnungsbetrag: ${fmtEuro(data.total)}`,
            statusBadge(badgeLabel, badgeType)
          )}

          <tr>
            <td class="px-responsive py-responsive" style="padding:28px 36px 8px;">
              ${orderMetricStrip(data.orderNumber, orderDate, data.total)}

              ${sectionTitle('Kundendaten &amp; Lieferadresse')}
              ${flatCard(`
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#71786D;width:120px;">Kunde:</td>
                    <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(data.firstName)} ${esc(data.lastName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">E-Mail:</td>
                    <td style="padding:4px 0;">
                      <a href="mailto:${esc(data.email)}" style="color:#15803D;font-weight:600;text-decoration:none;">${esc(data.email)}</a>
                    </td>
                  </tr>
                  ${data.phone ? `
                    <tr>
                      <td style="padding:4px 0;color:#71786D;">Telefon:</td>
                      <td style="padding:4px 0;color:#0B0F0D;font-weight:600;">${esc(data.phone)}</td>
                    </tr>` : ''}
                  <tr>
                    <td style="padding:6px 0 2px;color:#71786D;vertical-align:top;">Lieferadresse:</td>
                    <td style="padding:6px 0 2px;color:#0B0F0D;line-height:1.5;">
                      ${esc(addressLines)}<br/>
                      ${cityLine}<br/>
                      Deutschland
                    </td>
                  </tr>
                  ${data.notes ? `
                    <tr>
                      <td style="padding:8px 0 2px;color:#71786D;vertical-align:top;">Hinweis:</td>
                      <td style="padding:8px 0 2px;color:#B45309;font-weight:600;">${esc(data.notes)}</td>
                    </tr>` : ''}
                </table>
              `)}
            </td>
          </tr>

          <tr>
            <td class="px-responsive" style="padding:20px 36px 8px;">
              ${sectionTitle('Bestellte Positionen')}
              ${itemsTable(data.items || [])}
              ${totalBlock(data.subtotal || data.total, data.shippingMethod, data.shippingCost, data.total)}
            </td>
          </tr>

          <tr>
            <td class="px-responsive py-responsive" style="padding:20px 36px 32px;">
              ${sectionTitle('Zahlungsinformationen &amp; Pr&uuml;fung')}
              ${flatCard(`
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#71786D;width:140px;">Zahlungsart:</td>
                    <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(data.paymentMethod || 'SEPA-Überweisung')}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">Status:</td>
                    <td style="padding:4px 0;">${statusBadge(badgeLabel, badgeType)}</td>
                  </tr>
                  ${data.cryptoCoin ? `
                    <tr>
                      <td style="padding:4px 0;color:#71786D;">Kryptow&auml;hrung:</td>
                      <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(data.cryptoCoin)} ${data.cryptoSymbol ? `(${esc(data.cryptoSymbol)})` : ''}</td>
                    </tr>` : ''}
                  ${data.cryptoNetwork ? `
                    <tr>
                      <td style="padding:4px 0;color:#71786D;">Netzwerk:</td>
                      <td style="padding:4px 0;color:#0B0F0D;font-weight:600;">${esc(data.cryptoNetwork)}</td>
                    </tr>` : ''}
                  ${data.cryptoAddress ? `
                    <tr>
                      <td style="padding:4px 0;color:#71786D;vertical-align:top;">Ziel-Wallet:</td>
                      <td style="padding:4px 0;font-family:monospace;font-size:11px;color:#0B0F0D;word-break:break-all;">${esc(data.cryptoAddress)}</td>
                    </tr>` : ''}
                  ${data.txId ? `
                    <tr>
                      <td style="padding:8px 0 4px;color:#71786D;vertical-align:top;">Transaktions-ID:</td>
                      <td style="padding:8px 0 4px;">
                        <a href="${getExplorerUrl(data.cryptoNetwork, data.txId)}" target="_blank" style="color:#15803D;font-family:monospace;font-size:12px;font-weight:700;word-break:break-all;text-decoration:none;">
                          ${esc(data.txId)} &nearr;
                        </a>
                        <div style="font-size:11px;color:#047857;margin-top:2px;">(Klicken, um die Transaktion direkt im Explorer zu verifizieren)</div>
                      </td>
                    </tr>` : ''}
                </table>
              `)}
              
              <div style="margin-top:20px;text-align:center;">
                <a href="mailto:${esc(data.email)}?subject=${encodeURIComponent('Ihre Bestellung ' + data.orderNumber + ' bei Mr. Nice Vape')}" style="display:inline-block;padding:10px 22px;background:#EAECE4;color:#2D332A;font-size:13px;font-weight:700;border-radius:6px;text-decoration:none;">
                  Kunden per E-Mail kontaktieren
                </a>
              </div>
            </td>
          </tr>`;

        const adminSubject = data.txId
          ? `⚡ [KRYPTO-BESTELLUNG] #${data.orderNumber} – ${fmtEuro(data.total)} [TXID vorhanden]`
          : `[BESTELLUNG] #${data.orderNumber} – ${fmtEuro(data.total)} (${data.paymentMethod || 'SEPA'})`;

        result = await sendEmailWithFallback(resend, {
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || DEFAULT_ADMIN,
          subject: adminSubject,
          html: emailLayout(content, `Neue Bestellung #${esc(data.orderNumber)} von ${esc(data.firstName)} ${esc(data.lastName)} über ${fmtEuro(data.total)} erhalten.`),
          fallbackFrom: FALLBACK_SENDER,
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         3. KUNDE: Bestellbestätigung
         Wird sofort nach Absenden an den Kunden versendet
         ────────────────────────────────────────────────── */
      case 'customer-confirmation': {
        const orderDate = new Date(data.date || Date.now()).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const addressLines = [data.address, data.address2].filter(Boolean).join(', ');
        const cityLine = `${esc(data.postcode || '')} ${esc(data.city || '')}${data.state ? ', ' + esc(data.state) : ''}`;

        const content = `
          ${emailHero(
            `Vielen Dank f&uuml;r Ihre Bestellung, ${esc(data.firstName)}!`,
            `Wir haben Ihre Bestellung #${esc(data.orderNumber)} erhalten und bereiten den Versand in K&ouml;ln vor.`,
            statusBadge('Bestellung eingegangen', 'success')
          )}

          <tr>
            <td class="px-responsive py-responsive" style="padding:28px 36px 8px;">
              ${orderMetricStrip(data.orderNumber, orderDate, data.total)}

              ${paymentInstructions(data)}

              <div style="margin-top:24px;">
                ${sectionTitle('Bestell&uuml;bersicht')}
                ${itemsTable(data.items || [])}
                ${totalBlock(data.subtotal || data.total, data.shippingMethod, data.shippingCost, data.total)}
              </div>
            </td>
          </tr>

          <tr>
            <td class="px-responsive" style="padding:16px 36px 8px;">
              ${sectionTitle('Lieferadresse')}
              ${flatCard(`
                <div style="font-size:14px;font-weight:700;color:#0B0F0D;margin-bottom:4px;">${esc(data.firstName)} ${esc(data.lastName)}</div>
                <div style="font-size:13px;color:#555E50;line-height:1.6;">
                  ${esc(addressLines)}<br/>
                  ${cityLine}<br/>
                  Deutschland
                </div>
              `)}

              ${fulfillmentSteps()}
            </td>
          </tr>

          <tr>
            <td class="px-responsive py-responsive" style="padding:24px 36px 32px;text-align:center;">
              ${flatButton('https://mrnicevape.com/collections/shop', 'Zum Online-Shop')}
              
              <p style="font-size:12px;color:#71786D;line-height:1.6;margin:20px 0 0;">
                Haben Sie Fragen zu Ihrer Lieferung? Antworten Sie direkt auf diese E-Mail oder kontaktieren Sie uns unter
                <a href="mailto:info@mrnicevape.com" style="color:#15803D;font-weight:600;text-decoration:none;">info@mrnicevape.com</a>.
              </p>
            </td>
          </tr>`;

        result = await sendEmailWithFallback(resend, {
          from: FROM_EMAIL,
          to: [data.email],
          replyTo: ADMIN_EMAIL,
          subject: `Bestellbestätigung #${data.orderNumber} – Mr. Nice Vape Deutschland`,
          html: emailLayout(content, `Vielen Dank für Ihre Bestellung #${esc(data.orderNumber)} über ${fmtEuro(data.total)}.`),
          fallbackFrom: FALLBACK_SENDER,
        });
        break;
      }

      /* ──────────────────────────────────────────────────
         4. KONTAKTFORMULAR: Admin-Benachrichtigung + Auto-Reply
         Inquiry geht direkt an info@mrnicevape.com
         ────────────────────────────────────────────────── */
      case 'contact': {
        const contactDate = new Date().toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
        const safeMessage = esc(data.message || '').replace(/\n/g, '<br/>');

        // Admin Notification
        const adminContent = `
          ${emailHero('Neue Kundenanfrage', `Eingegangen am ${esc(contactDate)}`, statusBadge('Kontaktanfrage', 'neutral'))}

          <tr>
            <td class="px-responsive py-responsive" style="padding:28px 36px 8px;">
              ${sectionTitle('Absenderangaben')}
              ${flatCard(`
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#71786D;width:100px;">Name:</td>
                    <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(data.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">E-Mail:</td>
                    <td style="padding:4px 0;">
                      <a href="mailto:${esc(data.email)}" style="color:#15803D;font-weight:600;text-decoration:none;">${esc(data.email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">Betreff:</td>
                    <td style="padding:4px 0;color:#0B0F0D;font-weight:600;">${esc(data.subject || 'Allgemeine Anfrage')}</td>
                  </tr>
                </table>
              `)}
            </td>
          </tr>

          <tr>
            <td class="px-responsive py-responsive" style="padding:16px 36px 32px;">
              ${sectionTitle('Nachrichtentext')}
              <div style="background:#F9FAF7;border:1px solid #ECEEE6;border-left:4px solid #15803D;border-radius:8px;padding:18px 20px;">
                <p style="font-size:14px;color:#0B0F0D;line-height:1.7;margin:0;">${safeMessage}</p>
              </div>

              <div style="margin-top:24px;text-align:center;">
                <a href="mailto:${esc(data.email)}?subject=${encodeURIComponent('Re: ' + (data.subject || 'Ihre Anfrage bei Mr. Nice Vape'))}" style="display:inline-block;padding:12px 26px;background:#0B0F0D;color:#FFFFFF;font-size:13px;font-weight:700;border-radius:6px;text-decoration:none;">
                  Direkt an ${esc(data.name)} antworten
                </a>
              </div>
            </td>
          </tr>`;

        result = await sendEmailWithFallback(resend, {
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email,
          subject: `Kontaktanfrage: ${data.subject || 'Allgemeine Anfrage'} – ${data.name}`,
          html: emailLayout(adminContent, `Neue Nachricht von ${esc(data.name)}: ${esc((data.message || '').substring(0, 80))}`),
          fallbackFrom: FALLBACK_SENDER,
        });

        // Customer Auto-Acknowledgment
        if (data.email) {
          const customerContent = `
            ${emailHero(
              `Vielen Dank f&uuml;r Ihre Nachricht, ${esc(data.name)}!`,
              'Wir haben Ihre Kontaktanfrage erhalten und melden uns werktags innerhalb von 24 Stunden.',
              statusBadge('Eingangsbestätigung', 'success')
            )}

            <tr>
              <td class="px-responsive py-responsive" style="padding:28px 36px 32px;">
                <p style="font-size:14px;color:#333A2F;line-height:1.65;margin:0 0 20px;">
                  Unser Kundenservice-Team im K&ouml;lner B&uuml;ro pr&uuml;ft Ihr Anliegen sorgf&auml;ltig. Bezieht sich Ihre Nachricht auf eine bestehende Bestellung, k&ouml;nnen Sie einfach direkt auf diese E-Mail antworten.
                </p>

                ${sectionTitle('Ihre gesendete Nachricht')}
                ${flatCard(`
                  <div style="font-size:12px;color:#71786D;margin-bottom:6px;font-weight:600;">Betreff: ${esc(data.subject || 'Allgemeine Anfrage')}</div>
                  <div style="font-size:13px;color:#0B0F0D;line-height:1.65;">${safeMessage}</div>
                `)}

                ${flatButton('https://mrnicevape.com', 'Zurück zur Startseite')}
              </td>
            </tr>`;

          await sendEmailWithFallback(resend, {
            from: FROM_EMAIL,
            to: [data.email],
            replyTo: ADMIN_EMAIL,
            subject: 'Eingangsbestätigung Ihrer Anfrage – Mr. Nice Vape Deutschland',
            html: emailLayout(customerContent, 'Wir haben Ihre Nachricht erhalten und antworten innerhalb von 24 Stunden.'),
            fallbackFrom: FALLBACK_SENDER,
          }).catch((e) => console.error('[send-email] Auto-reply failed:', e));
        }
        break;
      }

      /* ──────────────────────────────────────────────────
         5. BTC: Zahlung bestätigt
         ────────────────────────────────────────────────── */
      case 'btc-confirmed': {
        const content = `
          ${emailHero(
            `Bitcoin-Zahlung bestätigt &middot; #${esc(data.orderNumber)}`,
            `Transaktion erfolgreich auf der Blockchain verifiziert (${esc(data.confirmations || '2+')} Bestätigungen).`,
            statusBadge('Versandbereit', 'success')
          )}

          <tr>
            <td class="px-responsive py-responsive" style="padding:28px 36px 8px;">
              ${sectionTitle('Transaktionsdetails')}
              ${flatCard(`
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                  <tr>
                    <td style="padding:4px 0;color:#71786D;width:140px;">Kunde:</td>
                    <td style="padding:4px 0;color:#0B0F0D;font-weight:700;">${esc(data.firstName)} ${esc(data.lastName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">E-Mail:</td>
                    <td style="padding:4px 0;">
                      <a href="mailto:${esc(data.email)}" style="color:#15803D;font-weight:600;text-decoration:none;">${esc(data.email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">Betrag (EUR):</td>
                    <td style="padding:4px 0;color:#15803D;font-weight:800;">${fmtEuro(data.total)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#71786D;">Betrag (BTC):</td>
                    <td style="padding:4px 0;color:#B45309;font-weight:700;font-family:monospace;">${esc(data.btcAmount || 'k.A.')} BTC</td>
                  </tr>
                  ${data.txId ? `
                    <tr>
                      <td style="padding:4px 0;color:#71786D;">Transaktions-ID:</td>
                      <td style="padding:4px 0;">
                        <a href="https://mempool.space/tx/${esc(data.txId)}" target="_blank" style="color:#15803D;font-family:monospace;font-size:11px;">
                          ${esc(data.txId)}
                        </a>
                      </td>
                    </tr>` : ''}
                </table>
              `)}
            </td>
          </tr>

          <tr>
            <td class="px-responsive py-responsive" style="padding:16px 36px 32px;">
              <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:18px 20px;text-align:center;">
                <div style="font-size:14px;font-weight:800;color:#047857;margin-bottom:4px;">Freigabe f&uuml;r den Versand</div>
                <div style="font-size:13px;color:#065F46;line-height:1.5;">Die Zahlung ist verifiziert. Diese Bestellung kann jetzt im K&ouml;lner Lager kommissioniert und verpackt werden.</div>
              </div>
            </td>
          </tr>`;

        result = await sendEmailWithFallback(resend, {
          from: FROM_EMAIL,
          to: [ADMIN_EMAIL],
          replyTo: data.email || DEFAULT_ADMIN,
          subject: `BTC bestätigt – Bestellung #${data.orderNumber} (${fmtEuro(data.total)})`,
          html: emailLayout(content, `Bitcoin-Zahlung für Bestellung #${esc(data.orderNumber)} über ${fmtEuro(data.total)} bestätigt.`),
          fallbackFrom: FALLBACK_SENDER,
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
      console.error('[send-email] Resend API error:', JSON.stringify(result.error));
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-email] Sent "${type}" email via Resend (id: ${result?.data?.id})`);
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
