import express from 'express';
import supabase from '../../db/supabase.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requireRole } from '../../middleware/rbac.js';
import { ADMIN_ROLES } from '../../db/adminUserDb.js';

const router = express.Router();

// GET /api/admin/audit-logs — Super Admin only
router.get('/', requireAdminAuth, requireRole([ADMIN_ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ logs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { action, resource, email, search, from, to } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action) query = query.eq('action', action);
    if (resource) query = query.eq('resource', resource);
    if (email) query = query.ilike('actor_email', `%${email}%`);

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    if (search) {
      query = query.or(`action.ilike.%${search}%,resource.ilike.%${search}%,actor_email.ilike.%${search}%,ip_address.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    const total = count || 0;

    const formattedLogs = (data || []).map((row) => ({
      _id: row.id,
      id: row.id,
      adminUserId: row.admin_user_id,
      adminEmail: row.actor_email,
      role: 'staff',
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    }));

    return res.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
