import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { logAuditEvent } from '../../utils/auditLogger.js';
import { ADMIN_ROLES } from '../../db/adminUserDb.js';

const router = express.Router();
const superAdminOnly = [requireAdminAuth, requireRole([ADMIN_ROLES.SUPER_ADMIN])];
const roles = Object.values(ADMIN_ROLES);

const strongPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a symbol');

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  role: z.enum(roles),
  password: strongPassword,
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(roles).optional(),
  isActive: z.boolean().optional(),
  password: strongPassword.optional(),
});

const formatStaff = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  isActive: row.is_active !== false,
  twoFactorEnabled: !!row.two_factor_enabled,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
});

router.get('/', ...superAdminOnly, async (req, res) => {
  if (!supabase) return res.json({ staff: [], roles });
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, email, role, is_active, two_factor_enabled, last_login_at, created_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ message: error.message });
  return res.json({ staff: data.map(formatStaff), roles });
});

router.post('/', ...superAdminOnly, validate(createSchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const { name, email, role, password } = req.body;
  const { data, error } = await supabase
    .from('admin_users')
    .insert({ name, email, role, password_hash: await bcrypt.hash(password, 12), is_active: true })
    .select()
    .single();
  if (error) {
    return res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'A staff member with this email already exists.' : error.message });
  }
  await logAuditEvent({ req, action: 'STAFF_CREATED', resource: 'STAFF', resourceId: data.id, details: { email, role }, adminUser: req.adminUser });
  return res.status(201).json({ staff: formatStaff(data) });
});

router.patch('/:id', ...superAdminOnly, validate(updateSchema), async (req, res) => {
  if (!supabase) return res.status(503).json({ message: 'Database is not configured.' });
  const isSelf = String(req.params.id) === String(req.adminUser.id);
  if (isSelf && (req.body.isActive === false || (req.body.role && req.body.role !== ADMIN_ROLES.SUPER_ADMIN))) {
    return res.status(400).json({ message: 'You cannot deactivate or demote your own account.' });
  }

  const fields = { updated_at: new Date().toISOString() };
  if (req.body.name) fields.name = req.body.name;
  if (req.body.role) fields.role = req.body.role;
  if (req.body.isActive !== undefined) fields.is_active = req.body.isActive;
  if (req.body.password) {
    fields.password_hash = await bcrypt.hash(req.body.password, 12);
    fields.failed_login_attempts = 0;
    fields.lock_until = null;
  }

  const { data, error } = await supabase.from('admin_users').update(fields).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ message: 'Staff member not found' });

  const { password, ...auditDetails } = req.body;
  await logAuditEvent({
    req,
    action: 'STAFF_UPDATED',
    resource: 'STAFF',
    resourceId: data.id,
    details: { ...auditDetails, passwordReset: !!password },
    adminUser: req.adminUser,
  });
  return res.json({ staff: formatStaff(data) });
});

export default router;
