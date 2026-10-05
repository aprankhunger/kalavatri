import AuditLog from '../models/AuditLog.js';

export const logAuditEvent = async ({
  req,
  action,
  resource,
  resourceId = null,
  details = {},
  adminUser = null,
  actorEmail = null,
}) => {
  try {
    const ipAddress =
      req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      'unknown';
    const userAgent = req?.headers['user-agent'] || 'unknown';

    const userId = adminUser?._id || adminUser?.id || req?.adminUser?._id || null;
    const email =
      adminUser?.email ||
      req?.adminUser?.email ||
      actorEmail ||
      'system';
    const role =
      adminUser?.role ||
      req?.adminUser?.role ||
      'system';

    // Mask sensitive details (e.g. passwords, card numbers, secrets)
    const sanitizedDetails = { ...details };
    if (sanitizedDetails.password) sanitizedDetails.password = '[REDACTED]';
    if (sanitizedDetails.token) sanitizedDetails.token = '[REDACTED]';
    if (sanitizedDetails.secret) sanitizedDetails.secret = '[REDACTED]';

    const entry = new AuditLog({
      adminUserId: userId,
      adminEmail: email,
      role,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      details: sanitizedDetails,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    await entry.save();
  } catch (err) {
    console.error('⚠️ Failed to write audit log entry:', err.message);
  }
};
