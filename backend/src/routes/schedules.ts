import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { reloadSchedule } from '../services/scheduler';
import logger from '../services/logger';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'manager'));

// List all schedules
router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM report_schedule ORDER BY created_at DESC');
    res.json({ schedules: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create schedule
router.post('/', async (req: any, res, next): Promise<any> => {
  try {
    const { reportType, format, frequency, cronExpression, recipients, params, enabled } = req.body;

    if (!reportType || !recipients) {
      return res.status(400).json({ error: 'reportType and recipients are required' });
    }

    // Map frequency to default cron expressions if not provided
    const cronMap: Record<string, string> = {
      daily: '0 6 * * *',
      weekly: '0 6 * * 1',
      monthly: '0 6 1 * *',
    };
    const cronExpr = cronExpression || cronMap[frequency || 'daily'] || '0 6 * * *';

    const result = await query(
      `INSERT INTO report_schedule (report_type, format, frequency, cron_expression, recipients, params, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        reportType,
        format || 'pdf',
        frequency || 'daily',
        cronExpr,
        recipients,
        JSON.stringify(params || {}),
        enabled !== false,
        req.user.id,
      ]
    );

    const schedule = result.rows[0];
    await reloadSchedule(schedule.id);
    logger.info(`Report schedule created: ${schedule.id} (${reportType}/${frequency})`, { userId: req.user.id });

    return res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

// Update schedule
router.put('/:id', async (req: any, res, next): Promise<any> => {
  try {
    const { reportType, format, frequency, cronExpression, recipients, params, enabled } = req.body;

    const cronMap: Record<string, string> = {
      daily: '0 6 * * *',
      weekly: '0 6 * * 1',
      monthly: '0 6 1 * *',
    };
    const cronExpr = cronExpression || (frequency ? cronMap[frequency] : undefined);

    const result = await query(
      `UPDATE report_schedule SET
        report_type = COALESCE($1, report_type),
        format = COALESCE($2, format),
        frequency = COALESCE($3, frequency),
        cron_expression = COALESCE($4, cron_expression),
        recipients = COALESCE($5, recipients),
        params = COALESCE($6, params),
        enabled = COALESCE($7, enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [
        reportType, format, frequency, cronExpr,
        recipients, params ? JSON.stringify(params) : null,
        enabled, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await reloadSchedule(req.params.id);
    logger.info(`Report schedule updated: ${req.params.id}`, { userId: req.user.id });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete schedule
router.delete('/:id', async (req: any, res, next): Promise<any> => {
  try {
    const result = await query('DELETE FROM report_schedule WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    await reloadSchedule(req.params.id);
    logger.info(`Report schedule deleted: ${req.params.id}`, { userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Toggle enabled/disabled
router.patch('/:id/toggle', async (req: any, res, next): Promise<any> => {
  try {
    const result = await query(
      'UPDATE report_schedule SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    await reloadSchedule(req.params.id);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
