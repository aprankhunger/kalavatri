import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../models/AdminUser.js';

// Require one of the allowed roles
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = req.adminUser.role;

    // Super Admin has universal access
    if (userRole === ADMIN_ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Your role (${userRole}) does not have permission to perform this action.`,
        code: 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
};

// Require a specific granular permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!req.adminUser.hasPermission(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission denied: '${permission}' is required.`,
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
};
