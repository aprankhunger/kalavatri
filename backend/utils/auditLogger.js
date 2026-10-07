import supabase from '../db/supabase.js';

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
    if (!supabase) return;

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

    // Mask sensitive details (e.g. passwords, card numbers, secrets)
    const sanitizedDetails = { ...details };
    if (sanitizedDetails.password) sanitizedDetails.password = '[REDACTED]';
    if (sanitizedDetails.token) sanitizedDetails.token = '[REDACTED]';
    if (sanitizedDetails.secret) sanitizedDetails.secret = '[REDACTED]';

    await supabase.from('audit_logs').insert({
      admin_user_id: userId,
      actor_email: email,
      action,
      resource,
      resource_id: resourceId ? String(resourceId) : null,
      details: sanitizedDetails,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error('⚠️ Failed to write audit log entry to Supabase:', err.message);
  }
};
