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
}

async function getConfirmationSettings(): Promise<ConfirmationSettings> {
  const defaults: ConfirmationSettings = {
    purchaseEmailEnabled: false,
    saleEmailEnabled: false,
    purchaseRecipientField: 'vendor',
    saleRecipientField: 'client',
    customPurchaseEmail: '',
    customSaleEmail: '',
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
    }
  } catch {
    // Table may not exist yet
  }

  return defaults;
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

    const body = `
      <h2>Purchase Confirmation</h2>
      <p>A purchase transaction has been recorded:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Transaction #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.transaction_number}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(tx.transaction_date).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Vendor</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.vendor_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Material</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.material_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Location</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.location_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Weight</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${parseFloat(tx.weight_kg).toFixed(2)} kg</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Unit Price</td><td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(tx.unit_price).toFixed(2)}/kg</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total</td><td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(tx.total_cost).toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Payment Method</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.payment_method || '-'}</td></tr>
        ${tx.notes ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Notes</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${tx.notes}</td></tr>` : ''}
      </table>
    `;

    await sendReportEmail({
      to: recipient,
      subject: `CIVICycle - Purchase Confirmation ${tx.transaction_number}`,
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

    const body = `
      <h2>Sale Confirmation</h2>
      <p>A sale transaction has been recorded:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Sale #</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${sale.sale_number}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(sale.sale_date || sale.created_at).toLocaleDateString()}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Client</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${sale.client_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Material</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${sale.material_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Location</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${sale.location_name || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Weight</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${parseFloat(sale.weight_kg).toFixed(2)} kg</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Unit Price</td><td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(sale.unit_price).toFixed(2)}/kg</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total</td><td style="padding: 8px; border: 1px solid #e5e7eb;">$${parseFloat(sale.total_amount).toFixed(2)}</td></tr>
        ${sale.notes ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Notes</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${sale.notes}</td></tr>` : ''}
      </table>
    `;

    await sendReportEmail({
      to: recipient,
      subject: `CIVICycle - Sale Confirmation ${sale.sale_number}`,
      body,
    });

    logger.info(`Sale confirmation sent: ${sale.sale_number} -> ${recipient}`);
  } catch (error: any) {
    logger.error(`Sale confirmation failed: ${error.message}`);
  }
}
