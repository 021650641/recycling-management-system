import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { clearSmtpCache } from '../services/emailService';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// Get all settings (grouped by category)
router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT key, value, category FROM app_settings ORDER BY category, key'
    );

    const settings: Record<string, Record<string, string>> = {};
    for (const row of result.rows) {
      if (!settings[row.category]) settings[row.category] = {};
      settings[row.category][row.key] = row.value;
    }

    return res.json(settings);
  } catch (error: any) {
    if (error.code === '42P01') {
      return res.json({});
    }
    return next(error);
  }
});

// Get settings by category
router.get('/:category', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT key, value FROM app_settings WHERE category = $1 ORDER BY key',
      [req.params.category]
    );

    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    return res.json(settings);
  } catch (error: any) {
    if (error.code === '42P01') {
      return res.json({});
    }
    return next(error);
  }
});

// Save settings for a category
router.put('/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const settings = req.body;

    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (category, key)
      )
    `);

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO app_settings (key, value, category, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (category, key)
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value), category]
      );
    }

    // Clear SMTP cache if email settings changed
    if (category === 'smtp') {
      clearSmtpCache();
    }

    res.json({ message: 'Settings saved' });
  } catch (error) {
    next(error);
  }
});

export default router;
