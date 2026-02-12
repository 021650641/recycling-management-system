import { query } from '../db';
import { sendReportEmail, isEmailConfigured } from './emailService';
import logger from './logger';

interface ConfirmationSettings {
  purchaseEmailEnabled: boolean;
  saleEmailEnabled: boolean;
  purchaseRecipientField: string; // 'vendor' or 'custom'
  saleRecipientField: string; // 'client' or 'custom'
  customPurchaseEmail: string;
  customSaleEmail: string;
  purchaseSubjectTemplate: string;
  purchaseBodyTemplate: string;
  saleSubjectTemplate: string;
  saleBodyTemplate: string;
}

const DEFAULT_PURCHASE_BODY_TEMPLATE = `
<h2>Purchase Confirmation</h2>
<p>A purchase transaction has been recorded:</p>
<table style="border-collapse: collapse; width: 100%;">
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Transaction #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{transaction_number}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{date}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Vendor</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{vendor_name}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Material</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{material}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Location</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{location}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Weight</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{weight_kg}} kg</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Unit Price</td><td style="padding: 8px; border: 1px solid #e5e7eb;">\${{unit_price}}/kg</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total</td><td style="padding: 8px; border: 1px solid #e5e7eb;">\${{total_cost}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Payment Method</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{payment_method}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Notes</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{notes}}</td></tr>
</table>
`;

const DEFAULT_SALE_BODY_TEMPLATE = `
<h2>Sale Confirmation</h2>
<p>A sale transaction has been recorded:</p>
<table style="border-collapse: collapse; width: 100%;">
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Sale #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{sale_number}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{date}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Client</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{client_name}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Material</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{material}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Location</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{location}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Weight</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{weight_kg}} kg</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Unit Price</td><td style="padding: 8px; border: 1px solid #e5e7eb;">\${{unit_price}}/kg</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total</td><td style="padding: 8px; border: 1px solid #e5e7eb;">\${{total_amount}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Notes</td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{notes}}</td></tr>
</table>
`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function getConfirmationSettings(): Promise<ConfirmationSettings> {
  const defaults: ConfirmationSettings = {
    purchaseEmailEnabled: false,
    saleEmailEnabled: false,
    purchaseRecipientField: 'vendor',
    saleRecipientField: 'client',
    customPurchaseEmail: '',
    customSaleEmail: '',
    purchaseSubjectTemplate: 'Purchase Confirmation {{transaction_number}}',
    purchaseBodyTemplate: '',
    saleSubjectTemplate: 'Sale Confirmation {{sale_number}}',
    saleBodyTemplate: '',
  };

  try {
    const result = await query(
      "SELECT key, value FROM app_settings WHERE category = 'confirmations'"
    );
    for (const row of result.rows) {
      if (row.key === 'purchaseEmailEnabled') defaults.purchaseEmailEnabled = row.value === 'true';
      if (row.key === 'saleEmailEnabled') defaults.saleEmailEnabled = row.value === 'true';
      if (row.key === 'purchaseRecipientField') defaults.purchaseRecipientField = row.value;
      if (row.key === 'saleRecipientField') defaults.saleRecipientField = row.value;
      if (row.key === 'customPurchaseEmail') defaults.customPurchaseEmail = row.value;
      if (row.key === 'customSaleEmail') defaults.customSaleEmail = row.value;
      if (row.key === 'purchaseSubjectTemplate') defaults.purchaseSubjectTemplate = row.value;
      if (row.key === 'purchaseBodyTemplate') defaults.purchaseBodyTemplate = row.value;
      if (row.key === 'saleSubjectTemplate') defaults.saleSubjectTemplate = row.value;
      if (row.key === 'saleBodyTemplate') defaults.saleBodyTemplate = row.value;
    }
  } catch {
    // Table may not exist yet
  }

  return defaults;
}

/**
 * Replace {{key}} placeholders in a template string with values from params.
 */
function renderTemplate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Wrap rendered body HTML in a basic email structure if it does not already
 * contain <html> or <table> tags (indicating it is already structured).
 */
function wrapInEmailHtml(body: string): string {
  const lower = body.toLowerCase();
  if (lower.includes('<html') || lower.includes('<table')) {
    return body;
  }
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
${body}
</body>
</html>`;
}

/**
 * Build the common date-related template params from a Date object.
 */
function getDateParams(d: Date): Record<string, string> {
  return {
    day: String(d.getDate()),
    month: MONTH_NAMES[d.getMonth()],
    month_number: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
    date: d.toLocaleDateString(),
  };
}

export async function sendPurchaseConfirmation(transactionId: string): Promise<void> {
  try {
    const settings = await getConfirmationSettings();
    if (!settings.purchaseEmailEnabled) return;

    const configured = await isEmailConfigured();
    if (!configured) return;

    // Fetch transaction details
    const txResult = await query(
      `SELECT t.*, mc.name AS material_name, l.name AS location_name,
              wp.first_name || ' ' || wp.last_name AS vendor_name,
              wp.email AS vendor_email
       FROM transaction t
       LEFT JOIN material_category mc ON t.material_category_id = mc.id
       LEFT JOIN location l ON t.location_id = l.id
       LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
       WHERE t.id = $1`,
      [transactionId]
    );
    if (txResult.rows.length === 0) return;

    const tx = txResult.rows[0];

    // Determine recipient
    let recipient = '';
    if (settings.purchaseRecipientField === 'vendor' && tx.vendor_email) {
      recipient = tx.vendor_email;
    } else if (settings.customPurchaseEmail) {
      recipient = settings.customPurchaseEmail;
    }
    if (!recipient) return;

    const txDate = new Date(tx.transaction_date);
    const params: Record<string, string> = {
      ...getDateParams(txDate),
      transaction_number: tx.transaction_number || '',
      vendor_name: tx.vendor_name || '-',
      vendor_email: tx.vendor_email || '',
      material: tx.material_name || '-',
      location: tx.location_name || '-',
      weight_kg: parseFloat(tx.weight_kg).toFixed(2),
      unit_price: parseFloat(tx.unit_price).toFixed(2),
      total_cost: parseFloat(tx.total_cost).toFixed(2),
      payment_method: tx.payment_method || '-',
      notes: tx.notes || '-',
    };

    // Render subject
    const subject = renderTemplate(
      settings.purchaseSubjectTemplate || 'Purchase Confirmation {{transaction_number}}',
      params
    );

    // Render body - use custom template if set, otherwise the default
    const bodyTemplate = settings.purchaseBodyTemplate || DEFAULT_PURCHASE_BODY_TEMPLATE;
    const renderedBody = renderTemplate(bodyTemplate, params);
    const body = wrapInEmailHtml(renderedBody);

    await sendReportEmail({
      to: recipient,
      subject: `CIVICycle - ${subject}`,
      body,
    });

    logger.info(`Purchase confirmation sent: ${tx.transaction_number} -> ${recipient}`);
  } catch (error: any) {
    logger.error(`Purchase confirmation failed: ${error.message}`);
  }
}

export async function sendSaleConfirmation(saleId: string): Promise<void> {
  try {
    const settings = await getConfirmationSettings();
    if (!settings.saleEmailEnabled) return;

    const configured = await isEmailConfigured();
    if (!configured) return;

    const saleResult = await query(
      `SELECT s.*, mc.name AS material_name, l.name AS location_name,
              c.name AS client_name, c.contact_email AS client_email
       FROM sale s
       LEFT JOIN material_category mc ON s.material_category_id = mc.id
       LEFT JOIN location l ON s.location_id = l.id
       LEFT JOIN client c ON s.client_id = c.id
       WHERE s.id = $1`,
      [saleId]
    );
    if (saleResult.rows.length === 0) return;

    const sale = saleResult.rows[0];

    let recipient = '';
    if (settings.saleRecipientField === 'client' && sale.client_email) {
      recipient = sale.client_email;
    } else if (settings.customSaleEmail) {
      recipient = settings.customSaleEmail;
    }
    if (!recipient) return;

    const saleDate = new Date(sale.sale_date || sale.created_at);
    const params: Record<string, string> = {
      ...getDateParams(saleDate),
      sale_number: sale.sale_number || '',
      client_name: sale.client_name || '-',
      client_email: sale.client_email || '',
      material: sale.material_name || '-',
      location: sale.location_name || '-',
      weight_kg: parseFloat(sale.weight_kg).toFixed(2),
      unit_price: parseFloat(sale.unit_price).toFixed(2),
      total_amount: parseFloat(sale.total_amount).toFixed(2),
      payment_method: sale.payment_method || '-',
      notes: sale.notes || '-',
    };

    // Render subject
    const subject = renderTemplate(
      settings.saleSubjectTemplate || 'Sale Confirmation {{sale_number}}',
      params
    );

    // Render body - use custom template if set, otherwise the default
    const bodyTemplate = settings.saleBodyTemplate || DEFAULT_SALE_BODY_TEMPLATE;
    const renderedBody = renderTemplate(bodyTemplate, params);
    const body = wrapInEmailHtml(renderedBody);

    await sendReportEmail({
      to: recipient,
      subject: `CIVICycle - ${subject}`,
      body,
    });

    logger.info(`Sale confirmation sent: ${sale.sale_number} -> ${recipient}`);
  } catch (error: any) {
    logger.error(`Sale confirmation failed: ${error.message}`);
  }
}
