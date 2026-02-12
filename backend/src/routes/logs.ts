import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getLogFiles, getLogEntries, readLogFile } from '../services/logger';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// List available log files
router.get('/files', (_req, res) => {
  const files = getLogFiles();
  res.json({ files });
});

// Get log entries with filtering
router.get('/entries', (req, res) => {
  const { level, date, search, limit, offset } = req.query;
  const result = getLogEntries({
    level: (level as string) || 'info',
    date: date as string,
    search: search as string,
    limit: parseInt(limit as string) || 200,
    offset: parseInt(offset as string) || 0,
  });
  res.json(result);
});

// Download a raw log file
router.get('/download/:filename', (req, res): any => {
  const filename = req.params.filename;
  // Sanitize: only allow expected patterns
  if (!/^(info|error|debug)-\d{4}-\d{2}-\d{2}\.log$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const content = readLogFile(filename);
  if (!content) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

export default router;
