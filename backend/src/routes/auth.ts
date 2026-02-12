import { Router } from 'express';
import { query } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { config } from '../config';
import { authenticate } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req, res, next): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, location_id, is_active FROM "user" WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        locationId: user.location_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as StringValue }
    );

    // Update last login
    await query('UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        locationId: user.location_id,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: any, res, next): Promise<any> => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, location_id, is_active, last_login, created_at FROM "user" WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      locationId: user.location_id,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// Update own profile
router.put('/profile', authenticate, async (req: any, res, next): Promise<any> => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Check email uniqueness (excluding self)
    const emailCheck = await query(
      'SELECT id FROM "user" WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already in use' });
    }

    await query(
      'UPDATE "user" SET first_name = $1, last_name = $2, email = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [firstName, lastName, email, req.user.id]
    );

    const result = await query(
      'SELECT id, email, first_name, last_name, role, location_id, is_active, last_login, created_at FROM "user" WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      locationId: user.location_id,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    });
  } catch (error) {
    next(error);
  }
});

// Change own password
router.put('/change-password', authenticate, async (req: any, res, next): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await query(
      'SELECT password_hash FROM "user" WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE "user" SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;