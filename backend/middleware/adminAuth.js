import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';

export const ACCESS_COOKIE_NAME = 'kv_admin_access';
export const REFRESH_COOKIE_NAME = 'kv_admin_refresh';

export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };
};

export const requireAdminAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.[ACCESS_COOKIE_NAME];

    // Fallback: Authorization header (Bearer token)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please log in.',
        code: 'AUTH_REQUIRED',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid session token.',
        code: 'TOKEN_INVALID',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Database connection is not configured.',
      });
    }

    // Verify user exists and is active in Supabase
    const { data: userRow, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !userRow || userRow.is_deleted || !userRow.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin account not found or deactivated.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Wrap row in helper object
    const user = {
      _id: userRow.id,
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      isActive: userRow.is_active,
      isDeleted: userRow.is_deleted,
      twoFactorEnabled: userRow.two_factor_enabled,
      twoFactorSecret: userRow.two_factor_secret,
      twoFactorBackupCodes: userRow.two_factor_backup_codes || [],
      failedLoginAttempts: userRow.failed_login_attempts,
      lockUntil: userRow.lock_until ? new Date(userRow.lock_until) : null,
      toSafeObject() {
        return {
          id: userRow.id,
          name: userRow.name,
          email: userRow.email,
          role: userRow.role,
          twoFactorEnabled: userRow.two_factor_enabled,
        };
      },
    };

    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
