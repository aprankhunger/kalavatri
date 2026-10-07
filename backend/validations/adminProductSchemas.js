import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(2, 'Product name is required').trim(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().min(5, 'Description is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  originalPrice: z.number().nullable().optional(),
  costPrice: z.number().min(0).optional().default(0),
  image: z.string().min(1, 'Primary image is required'),
  images: z.array(z.string()).optional().default([]),
  category: z.string().trim().min(1, 'Category is required').max(60),
  badge: z.enum(['new', 'bestseller', 'sale', '']).optional().default(''),
  status: z.enum(['published', 'draft']).optional().default('published'),
  sizes: z.array(z.number()).optional().default([5, 6, 7, 8, 9, 10]),
  colors: z.array(z.string()).optional().default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().optional(),
        size: z.number(),
        color: z.string().optional().default(''),
        price: z.number().min(0),
        stockQuantity: z.number().min(0).default(0),
      })
    )
    .optional()
    .default([]),
  stockQuantity: z.number().min(0).optional().default(0),
  lowStockThreshold: z.number().min(0).optional().default(5),
  featured: z.boolean().optional().default(false),
  metaTitle: z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});

export const productUpdateSchema = productCreateSchema.partial();

export const bulkActionSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'delete']),
  productIds: z.array(z.string()).min(1, 'At least one product ID is required'),
});

export const stockAdjustSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantSku: z.string().optional().default(''),
  quantityChange: z.number(),
  reason: z.string().min(3, 'Adjustment reason is required'),
});
