/**
 * migrate-stock.js
 * 
 * Migrates all 19 product folders from "E:\KALAVATRI\Kalavatri stock\"
 * into Supabase: converts PNGs → WebP, uploads to Storage, inserts into products table.
 * Also synchronizes backend/seed/seedData.js.
 * 
 * Usage:  node scripts/migrate-stock.js
 */

import { createRequire } from 'module';
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Resolve packages from backend/node_modules
const require = createRequire(path.resolve('backend', 'package.json'));
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://kpjjfxxijgvwqpjofwec.supabase.co';
const SUPABASE_SERVICE_KEY =
  'sb_secret_0lDYFC7qoRWnp5XVf92YoQ_uEZnS1yT';

const STOCK_DIR = String.raw`E:\KALAVATRI\Kalavatri stock`;
const BUCKET = 'product-images';
const FOLDER_COUNT = 19;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function generateStorageKey() {
  return `products/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
}

async function convertToWebP(pngBuffer) {
  return sharp(pngBuffer)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function uploadImage(webpBuffer) {
  const key = generateStorageKey();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, webpBuffer, {
      contentType: 'image/webp',
      upsert: false,
      cacheControl: '31536000',
    });
  if (error) throw new Error(`Storage upload failed for ${key}: ${error.message}`);
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return publicData.publicUrl;
}

function buildVariants(sku, price) {
  const sizes = [3, 4, 5, 6, 7];
  return sizes.map((size) => ({
    sku: `${sku}-S${size}`,
    size,
    color: '',
    price,
    stockQuantity: 10,
    inStock: true,
  }));
}

// SKU overrides — fix duplicate for folder 16
const SKU_OVERRIDES = {
  16: 'JUT-PEARL-IVY-002',
};

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== KALAVATRI Stock Migration ===\n');

  // 1) Delete all existing products from database
  console.log('Step 1: Removing all existing products from database...');
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.warn('  ⚠ Delete error, falling back to soft-delete:', delErr.message);
    await supabase.from('products').update({ is_deleted: true }).neq('is_deleted', true);
  } else {
    console.log('  ✓ Cleared all old products from database.\n');
  }

  // 2) Track SKUs for uniqueness verification
  const seenSkus = new Set();
  const results = [];
  const seedProducts = [];

  for (let i = 1; i <= FOLDER_COUNT; i++) {
    console.log(`── Product ${i}/${FOLDER_COUNT} ──`);
    const folderPath = path.join(STOCK_DIR, String(i));

    // Read details.json (folder 18 has typo: "detials.json")
    const detailsFile = i === 18 ? 'detials.json' : 'details.json';
    let details;
    try {
      const raw = await readFile(path.join(folderPath, detailsFile), 'utf-8');
      details = JSON.parse(raw);
    } catch (err) {
      console.error(`  ✗ Failed to read ${detailsFile}: ${err.message}`);
      continue;
    }

    // Apply SKU override if needed
    let sku = details.product_code;
    if (SKU_OVERRIDES[i]) {
      console.log(`  ⚠ Overriding SKU from "${sku}" → "${SKU_OVERRIDES[i]}"`);
      sku = SKU_OVERRIDES[i];
    }

    // Verify uniqueness
    if (seenSkus.has(sku)) {
      console.error(`  ✗ DUPLICATE SKU "${sku}" at folder ${i} — skipping!`);
      continue;
    }
    seenSkus.add(sku);

    console.log(`  Product: ${details.product_title}`);
    console.log(`  SKU:     ${sku}`);

    // Read and process images (PNGs)
    const files = await readdir(folderPath);
    const pngFiles = files.filter((f) => f.toLowerCase().endsWith('.png')).sort();
    console.log(`  Images:  ${pngFiles.length} PNGs found`);

    const imageUrls = [];
    for (const pngFile of pngFiles) {
      try {
        const pngBuf = await readFile(path.join(folderPath, pngFile));
        const webpBuf = await convertToWebP(pngBuf);
        const url = await uploadImage(webpBuf);
        imageUrls.push(url);
        console.log(`    ✓ ${pngFile} → uploaded (${(webpBuf.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        console.error(`    ✗ ${pngFile}: ${err.message}`);
      }
      await delay(300);
    }

    if (imageUrls.length === 0) {
      console.error(`  ✗ No images uploaded — skipping product insert.`);
      continue;
    }

    const PRICE = 1999;
    const product = {
      name: details.product_title,
      slug: details.url_slug,
      sku,
      description: details.description,
      price: PRICE,
      original_price: null,
      discount: 0,
      cost_price: null,
      image: imageUrls[0],
      images: imageUrls,
      category: 'festive',
      badge: 'new',
      status: 'published',
      rating: 5.0,
      review_count: 0,
      sizes: [3, 4, 5, 6, 7],
      colors: [],
      stock_quantity: 50,
      low_stock_threshold: 5,
      in_stock: true,
      featured: true,
      variants: buildVariants(sku, PRICE),
      meta_title: details.meta_title,
      meta_description: details.meta_description,
      is_deleted: false,
    };

    // Insert into products table
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('id, name, sku')
      .single();

    if (error) {
      console.error(`  ✗ DB insert failed: ${error.message}`);
    } else {
      console.log(`  ✓ Inserted → id=${data.id}`);
      results.push(data);
      seedProducts.push({
        _id: data.id,
        ...product,
      });
    }

    console.log('');
    await delay(200);
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Migration complete: ${results.length}/${FOLDER_COUNT} products inserted.`);
  console.log('SKUs:', [...seenSkus].join(', '));

  // Sync to seedData.js
  if (seedProducts.length > 0) {
    try {
      const seedFilePath = path.resolve('backend', 'seed', 'seedData.js');
      const seedContent = `export const seedProducts = ${JSON.stringify(seedProducts, null, 2)};\n\nexport const seedReviews = [
  { name: 'Priya M.', rating: 5, comment: 'The embroidery on my bridal juttis was absolutely breathtaking. Every guest at my wedding complimented them! The craftsmanship is truly world-class.', verified: true },
  { name: 'Aarohi S.', rating: 5, comment: "I've been buying juttis for years, and Kalavatri is hands down the best. The leather is so soft, and they feel like they were made just for me. Already ordered my third pair!", verified: true },
  { name: 'Meera K.', rating: 5, comment: "I wore the Emerald Paisley pair to a Diwali party and received so many compliments! The quality is exceptional, and they're surprisingly comfortable.", verified: true },
  { name: 'Ananya R.', rating: 4, comment: 'Beautiful juttis with incredible detailing. Shipping was fast and packaging was lovely. Will definitely buy again!', verified: true },
  { name: 'Kavya D.', rating: 5, comment: 'Gifted the Ivory Dream pair to my sister for her wedding. She was overjoyed! The pearls and crystal work are so refined.', verified: true },
  { name: 'Nisha P.', rating: 5, comment: 'The Midnight Leaf juttis are a work of art. I get stopped everywhere I go. The black and silver contrast is so elegant. Worth every rupee!', verified: true },
];\n`;
      await writeFile(seedFilePath, seedContent, 'utf-8');
      console.log('  ✓ Updated backend/seed/seedData.js with new live stock!');
    } catch (seedErr) {
      console.error('  ✗ Failed to update seedData.js:', seedErr.message);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
