import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser.js';

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

    // Verify user exists and is active
    const user = await AdminUser.findById(decoded.id);
    if (!user || user.isDeleted || !user.isActive) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin account not found or deactivated.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Verify 2FA has been completed for this session
    if (decoded.requires2FA) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Two-factor authentication verification is required.',
        code: '2FA_REQUIRED',
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
