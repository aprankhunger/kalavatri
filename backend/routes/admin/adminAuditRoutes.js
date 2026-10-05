import express from 'express';
import AuditLog from '../../models/AuditLog.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requireRole } from '../../middleware/rbac.js';
import { ADMIN_ROLES } from '../../models/AdminUser.js';

const router = express.Router();

// GET /api/admin/audit-logs — Super Admin only
router.get('/', requireAdminAuth, requireRole([ADMIN_ROLES.SUPER_ADMIN]), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { action, resource, email, search, from, to } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (email) filter.adminEmail = new RegExp(email, 'i');

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { action: new RegExp(search, 'i') },
        { resource: new RegExp(search, 'i') },
        { adminEmail: new RegExp(search, 'i') },
        { ipAddress: new RegExp(search, 'i') },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
