import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      default: 'unknown',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // Append-only collection
    timestamps: false,
    versionKey: false,
  }
);

// Prevent updates and deletions on audit logs (enforce append-only)
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], function (next) {
  next(new Error('Audit logs are append-only and cannot be modified.'));
});

auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('Audit logs are append-only and cannot be deleted.'));
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
