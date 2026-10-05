import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

const adminUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ADMIN_ROLES),
      default: ADMIN_ROLES.ORDER_STAFF,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    twoFactorBackupCodes: [
      {
        codeHash: { type: String },
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
      },
    ],
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshTokens: [
      {
        tokenHash: { type: String },
        deviceInfo: { type: String },
        ip: { type: String },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
      },
    ],
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Method to verify password
adminUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to check if account is currently locked
adminUserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment failed attempts and lock if >= 5 attempts
adminUserSchema.methods.recordFailedLogin = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
  }
  return this.save();
};

// Reset failed logins on successful authentication
adminUserSchema.methods.recordSuccessfulLogin = async function (ip) {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  if (ip) this.lastLoginIp = ip;
  return this.save();
};

// Check if user has permission
adminUserSchema.methods.hasPermission = function (permission) {
  if (this.role === ADMIN_ROLES.SUPER_ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[this.role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

// Return safe user object (excluding secret credentials)
adminUserSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    twoFactorEnabled: this.twoFactorEnabled,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

const AdminUser = mongoose.model('AdminUser', adminUserSchema);
export default AdminUser;
