import bcrypt from 'bcryptjs';
import supabase from './supabase.js';

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  ORDER_STAFF: 'order_staff',
  INVENTORY_STAFF: 'inventory_staff',
  CONTENT_EDITOR: 'content_editor',
  ACCOUNTANT: 'accountant',
};

export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: ['*'], // All permissions
  [ADMIN_ROLES.MANAGER]: [
    'products:read', 'products:write',
    'orders:read', 'orders:write',
    'customers:read', 'customers:write',
    'coupons:read', 'coupons:write',
    'content:read', 'content:write',
    'reports:read', 'reports:export',
  ],
  [ADMIN_ROLES.ORDER_STAFF]: [
    'orders:read', 'orders:write', 'orders:refund_request',
    'customers:read', 'customers:messages',
  ],
  [ADMIN_ROLES.INVENTORY_STAFF]: [
    'products:read', 'products:stock_update', 'inventory:read',
  ],
  [ADMIN_ROLES.CONTENT_EDITOR]: [
    'content:read', 'content:write', 'banners:read', 'banners:write',
  ],
  [ADMIN_ROLES.ACCOUNTANT]: [
    'orders:read', 'payments:read', 'reports:read', 'reports:export',
  ],
};

export const wrapAdminUser = (row) => {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorSecret: row.two_factor_secret,
    twoFactorBackupCodes: row.two_factor_backup_codes || [],
    failedLoginAttempts: row.failed_login_attempts || 0,
    lockUntil: row.lock_until ? new Date(row.lock_until) : null,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
    lastLoginIp: row.last_login_ip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.passwordHash);
    },

    isLocked() {
      return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
    },

    async recordFailedLogin() {
      const newAttempts = this.failedLoginAttempts + 1;
      let newLock = null;
      if (newAttempts >= 5) {
        newLock = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      this.failedLoginAttempts = newAttempts;
      this.lockUntil = newLock ? new Date(newLock) : null;

      if (supabase) {
        await supabase
          .from('admin_users')
          .update({
            failed_login_attempts: newAttempts,
            lock_until: newLock,
          })
          .eq('id', this.id);
      }
    },

    async recordSuccessfulLogin(ip) {
      this.failedLoginAttempts = 0;
      this.lockUntil = null;
      this.lastLoginAt = new Date();
      if (ip) this.lastLoginIp = ip;

      if (supabase) {
        await supabase
          .from('admin_users')
          .update({
            failed_login_attempts: 0,
            lock_until: null,
            last_login_at: new Date().toISOString(),
            last_login_ip: ip || null,
          })
          .eq('id', this.id);
      }
    },

    hasPermission(permission) {
      if (this.role === ADMIN_ROLES.SUPER_ADMIN) return true;
      const permissions = ROLE_PERMISSIONS[this.role] || [];
      return permissions.includes('*') || permissions.includes(permission);
    },

    toSafeObject() {
      return {
        id: this.id,
        name: this.name,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
        twoFactorEnabled: this.twoFactorEnabled,
        lastLoginAt: this.lastLoginAt,
        createdAt: this.createdAt,
      };
    },
  };
};

export const findAdminUserByEmail = async (email) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_deleted', false)
    .single();

  if (error || !data) return null;
  return wrapAdminUser(data);
};

export const findAdminUserById = async (id) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return wrapAdminUser(data);
};

export const updateAdminUser = async (id, fields) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('admin_users')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return wrapAdminUser(data);
};
