import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import supabase from '../db/supabase.js';
import { seedProducts, seedReviews } from './seedData.js';

dotenv.config();

export const seedSupabase = async () => {
  if (!supabase) {
    console.error('Cannot seed Supabase: Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }

  console.log('--- Starting Supabase Database Seeding ---');

  // 1. Seed Super Admin — credentials MUST come from the environment.
  // (Never ship a hardcoded/default password: anyone reading the repo would
  // own the admin account on any deploy that forgot to override it.)
  const adminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const rawPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || '';

  if (!adminEmail || !rawPassword) {
    console.warn(
      '[Seed] SUPERADMIN_EMAIL / SUPERADMIN_INITIAL_PASSWORD not set — skipping super-admin creation. ' +
        'Set both in the environment to seed the initial admin.'
    );
  } else if (rawPassword.length < 12) {
    console.error('[Seed] SUPERADMIN_INITIAL_PASSWORD must be at least 12 characters — skipping super-admin creation.');
  } else {
    const { data: existingAdmin, error: checkAdminErr } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', adminEmail)
      .single();

    if (checkAdminErr && checkAdminErr.code !== 'PGRST116') {
      console.error('Error checking existing admin:', checkAdminErr.message);
    }

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const { error: insertAdminErr } = await supabase.from('admin_users').insert({
        name: 'Super Admin',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'super_admin',
        is_active: true,
        two_factor_enabled: false,
      });

      if (insertAdminErr) {
        console.error('Failed to create super admin in Supabase:', insertAdminErr.message);
      } else {
        console.log(`[Seed] Super Admin created: ${adminEmail}`);
      }
    } else {
      console.log(`[Seed] Super Admin already exists: ${adminEmail}`);
    }
  }

  // 2. Seed Products
  for (const p of seedProducts) {
    const { data: existingProd } = await supabase
      .from('products')
      .select('id, slug')
      .eq('slug', p.slug)
      .single();

    if (!existingProd) {
      const { error: insertProdErr } = await supabase.from('products').insert({
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        price: p.price,
        original_price: p.originalPrice || null,
        discount: p.discount || 0,
        cost_price: p.costPrice || null,
        image: p.image,
        images: p.images || [p.image],
        category: p.category,
        badge: p.badge || '',
        status: p.status || 'published',
        rating: p.rating || 5.0,
        review_count: p.reviewCount || 0,
        sizes: p.sizes || [],
        colors: p.colors || [],
        stock_quantity: p.stockQuantity || 30,
        low_stock_threshold: p.lowStockThreshold || 5,
        in_stock: p.inStock !== false,
        featured: p.featured || false,
        variants: p.variants || [],
        meta_title: p.metaTitle || null,
        meta_description: p.metaDescription || null,
      });

      if (insertProdErr) {
        console.error(`Failed to insert product ${p.name}:`, insertProdErr.message);
      } else {
        console.log(`[Seed] Inserted product: ${p.name}`);
      }
    }
  }

  // 3. Seed Reviews
  const { data: firstProduct } = await supabase.from('products').select('id').limit(1).single();

  if (firstProduct) {
    for (const r of seedReviews) {
      const { data: existingRev } = await supabase
        .from('reviews')
        .select('id')
        .eq('name', r.name)
        .eq('comment', r.comment)
        .limit(1)
        .single();

      if (!existingRev) {
        await supabase.from('reviews').insert({
          product_id: firstProduct.id,
          name: r.name,
          rating: r.rating,
          comment: r.comment,
          verified: r.verified !== false,
        });
      }
    }
    console.log('[Seed] Reviews checked/seeded.');
  }

  console.log('--- Supabase Seeding Complete ---');
};

// Allow standalone execution: node seed/supabaseSeed.js
if (process.argv[1]?.endsWith('supabaseSeed.js')) {
  seedSupabase().then(() => process.exit(0)).catch((err) => {
    console.error('Seed fatal error:', err);
    process.exit(1);
  });
}
