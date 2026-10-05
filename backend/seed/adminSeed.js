import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import AdminUser, { ADMIN_ROLES } from '../models/AdminUser.js';
import { logAuditEvent } from '../utils/auditLogger.js';

dotenv.config();

export const seedSuperAdmin = async () => {
  const email = (process.env.SUPERADMIN_EMAIL || 'kalavatri01@gmail.com').toLowerCase();
  const rawPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || 'Kalavatri#Admin2026!';

  try {
    let superAdmin = await AdminUser.findOne({ email });

    if (!superAdmin) {
      console.log(`⚡ Creating initial Super Admin (${email})...`);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      superAdmin = new AdminUser({
        name: 'Kalavatri Owner',
        email,
        passwordHash,
        role: ADMIN_ROLES.SUPER_ADMIN,
        isActive: true,
        twoFactorEnabled: false, // Will require setup on first login
      });

      await superAdmin.save();
      console.log(`✅ Super Admin created successfully: ${email}`);

      await logAuditEvent({
        action: 'SUPER_ADMIN_INITIALIZED',
        resource: 'SYSTEM',
        details: { email },
        actorEmail: email,
      });
    } else {
      // Ensure super_admin role and active status
      let changed = false;
      if (superAdmin.role !== ADMIN_ROLES.SUPER_ADMIN) {
        superAdmin.role = ADMIN_ROLES.SUPER_ADMIN;
        changed = true;
      }
      if (!superAdmin.isActive) {
        superAdmin.isActive = true;
        changed = true;
      }
      if (changed) {
        await superAdmin.save();
        console.log(`🔄 Super Admin account updated: ${email}`);
      } else {
        console.log(`ℹ️ Super Admin account already exists: ${email}`);
      }
    }

    return superAdmin;
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error.message);
    throw error;
  }
};

// If run directly: node seed/adminSeed.js
if (process.argv[1]?.endsWith('adminSeed.js')) {
  mongoose
    .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      await seedSuperAdmin();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    });
}
