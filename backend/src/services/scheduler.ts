import * as cron from 'node-cron';
import { query } from '../db';
import { generatePDF, generateExcel, generateCSV } from './exportService';
import { sendReportEmail, isEmailConfigured } from './emailService';
import logger from './logger';
import { format, subDays } from 'date-fns';

interface Schedule {
  id: string;
  report_type: string;
  format: string;
  frequency: string;
  cron_expression: string;
  recipients: string;
  params: any;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

const activeJobs: Map<string, cron.ScheduledTask> = new Map();

// Ensure the schedule table exists
async function ensureTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS report_schedule (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_type VARCHAR(50) NOT NULL,
      format VARCHAR(10) NOT NULL DEFAULT 'pdf',
      frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
      cron_expression VARCHAR(100) NOT NULL DEFAULT '0 6 * * *',
      recipients TEXT NOT NULL,
      params JSONB DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Generate report data for a given type and date range
async function generateReportData(reportType: string, startDate: string, endDate: string): Promise<any[]> {
  let rows: any[] = [];

  if (reportType === 'purchases') {
    const result = await query(`
      SELECT t.transaction_date, wp.first_name || ' ' || wp.last_name AS waste_picker_name,
             mc.name AS material_name, t.weight_kg, t.unit_price, t.total_cost,
             t.payment_status, l.name AS location_name
      FROM transaction t
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      LEFT JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN location l ON t.location_id = l.id
      WHERE t.transaction_date::date >= $1::date AND t.transaction_date::date <= $2::date
      ORDER BY t.transaction_date DESC
      LIMIT 5000
    `, [startDate, endDate]);
    rows = result.rows;
  } else if (reportType === 'sales') {
    const result = await query(`
      SELECT s.sale_date, c.name AS client_name, mc.name AS material_name,
             s.weight_kg, s.unit_price, s.total_amount, s.payment_status,
             s.delivery_status, l.name AS location_name
      FROM sale s
      LEFT JOIN client c ON s.client_id = c.id
      LEFT JOIN material_category mc ON s.material_category_id = mc.id
      LEFT JOIN location l ON s.location_id = l.id
      WHERE s.sale_date::date >= $1::date AND s.sale_date::date <= $2::date
      ORDER BY s.sale_date DESC
      LIMIT 5000
    `, [startDate, endDate]);
    rows = result.rows;
  } else if (reportType === 'inventory') {
    const result = await query(`
      SELECT l.name AS location_name, mc.name AS material_name,
             i.quantity_kg, i.last_updated
      FROM inventory i
      JOIN location l ON i.location_id = l.id
      JOIN material_category mc ON i.material_category_id = mc.id
      WHERE i.quantity_kg > 0
      ORDER BY l.name, mc.name
    `);
    rows = result.rows;
  } else if (reportType === 'traceability') {
    const result = await query(`
      SELECT t.transaction_date, t.transaction_number,
             COALESCE(ac.name, wp.first_name || ' ' || wp.last_name) AS source_name,
             t.source_type, mc.name AS material_name, t.weight_kg, t.quality_grade
      FROM transaction t
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      LEFT JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      WHERE t.transaction_date::date >= $1::date AND t.transaction_date::date <= $2::date
      ORDER BY t.transaction_date DESC
      LIMIT 5000
    `, [startDate, endDate]);
    rows = result.rows;
  }

  return rows;
}

// Execute a scheduled report
async function executeSchedule(schedule: Schedule): Promise<void> {
  logger.info(`Executing scheduled report: ${schedule.report_type} (${schedule.id})`);

  try {
    const configured = await isEmailConfigured();
    if (!configured) {
      logger.warn(`Scheduled report ${schedule.id} skipped - email not configured`);
      return;
    }

    // Determine date range based on frequency
    const endDate = format(new Date(), 'yyyy-MM-dd');
    let startDate: string;
    switch (schedule.frequency) {
      case 'weekly':
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        break;
      case 'monthly':
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        break;
      default: // daily
        startDate = endDate;
        break;
    }

    const data = await generateReportData(schedule.report_type, startDate, endDate);

    if (data.length === 0) {
      logger.info(`Scheduled report ${schedule.id}: no data for period ${startDate} to ${endDate}`);
    }

    // Build ReportData
    const colKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const title = `${schedule.report_type.charAt(0).toUpperCase() + schedule.report_type.slice(1)} Report (${startDate} to ${endDate})`;
    const reportData = {
      title,
      columns: colKeys.map(k => ({ key: k, header: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })),
      rows: data,
    };
    let attachment: { content: Buffer | string; filename: string; contentType: string };

    if (schedule.format === 'pdf') {
      const pdfBuffer = await generatePDF(reportData);
      attachment = { content: pdfBuffer, filename: `report_${startDate}.pdf`, contentType: 'application/pdf' };
    } else if (schedule.format === 'excel') {
      const xlBuffer = await generateExcel(reportData);
      attachment = { content: xlBuffer, filename: `report_${startDate}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    } else {
      const csvContent = generateCSV(reportData);
      attachment = { content: csvContent, filename: `report_${startDate}.csv`, contentType: 'text/csv' };
    }

    // Send to all recipients
    const recipients = schedule.recipients.split(',').map(r => r.trim()).filter(Boolean);
    for (const to of recipients) {
      await sendReportEmail({
        to,
        subject: `CIVICycle - ${title}`,
        body: `<p>Please find attached the scheduled ${schedule.report_type} report for ${startDate} to ${endDate}.</p>
               <p>This report was automatically generated by CIVICycle.</p>`,
        attachments: [attachment],
      });
    }

    // Update last_run
    await query(
      'UPDATE report_schedule SET last_run = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [schedule.id]
    );

    logger.info(`Scheduled report ${schedule.id} completed: sent to ${recipients.length} recipient(s)`);
  } catch (error: any) {
    logger.error(`Scheduled report ${schedule.id} failed: ${error.message}`);
  }
}

// Schedule a single job
function scheduleJob(schedule: Schedule): void {
  // Remove existing job if any
  const existing = activeJobs.get(schedule.id);
  if (existing) {
    existing.stop();
    activeJobs.delete(schedule.id);
  }

  if (!schedule.enabled) return;

  if (!cron.validate(schedule.cron_expression)) {
    logger.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expression}`);
    return;
  }

  const task = cron.schedule(schedule.cron_expression, () => {
    executeSchedule(schedule).catch(err =>
      logger.error(`Schedule execution error: ${err.message}`)
    );
  });

  activeJobs.set(schedule.id, task);
  logger.debug(`Scheduled job ${schedule.id}: ${schedule.cron_expression} (${schedule.report_type}/${schedule.format})`);
}

// Load and start all enabled schedules
export async function startScheduler(): Promise<void> {
  try {
    await ensureTable();
    const result = await query('SELECT * FROM report_schedule WHERE enabled = true');
    for (const schedule of result.rows) {
      scheduleJob(schedule);
    }
    logger.info(`Scheduler started: ${result.rows.length} active schedule(s)`);
  } catch (error: any) {
    logger.error(`Scheduler failed to start: ${error.message}`);
  }
}

// Reload a single schedule (after create/update/delete)
export async function reloadSchedule(scheduleId: string): Promise<void> {
  const result = await query('SELECT * FROM report_schedule WHERE id = $1', [scheduleId]);
  if (result.rows.length > 0) {
    scheduleJob(result.rows[0]);
  } else {
    // Schedule was deleted
    const existing = activeJobs.get(scheduleId);
    if (existing) {
      existing.stop();
      activeJobs.delete(scheduleId);
    }
  }
}

// Stop all jobs
export function stopScheduler(): void {
  for (const [id, task] of activeJobs) {
    task.stop();
    activeJobs.delete(id);
  }
  logger.info('Scheduler stopped');
}
