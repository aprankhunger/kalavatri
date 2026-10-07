import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    size: { type: Number, required: true },
    color: { type: String, default: '' },
    price: { type: Number, required: true },
    stockQuantity: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    costPrice: { type: Number, default: 0, min: 0 }, // For internal accounting / profit reports
    image: { type: String, required: true },
    images: [{ type: String }],
    category: {
      type: String,
      enum: ['bridal', 'festive', 'everyday', 'designer'],
      required: true,
      index: true,
    },
    badge: {
      type: String,
      enum: ['new', 'bestseller', 'sale', ''],
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['published', 'draft'],
      default: 'published',
      index: true,
    },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    sizes: [{ type: Number }],
    colors: [{ type: String }],
    variants: [variantSchema],
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false, index: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Pre-save hook to calculate total stock & inStock status
productSchema.pre('save', function (next) {
  if (this.variants && this.variants.length > 0) {
    this.stockQuantity = this.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    this.inStock = this.stockQuantity > 0;
    this.variants.forEach((v) => {
      v.inStock = (v.stockQuantity || 0) > 0;
    });
  } else {
    this.inStock = (this.stockQuantity || 0) > 0;
  }

  // Calculate discount percentage if originalPrice is higher than price
  if (this.originalPrice && this.originalPrice > this.price) {
    this.discount = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  } else {
    this.discount = 0;
  }

  next();
});

// Method for safe public serialization (excludes internal cost price & soft delete metadata)
productSchema.methods.toPublicObject = function () {
  return {
    _id: this._id,
    name: this.name,
    slug: this.slug,
    sku: this.sku,
    description: this.description,
    price: this.price,
    originalPrice: this.originalPrice,
    discount: this.discount,
    image: this.image,
    images: this.images,
    category: this.category,
    badge: this.badge,
    rating: this.rating,
    reviewCount: this.reviewCount,
    sizes: this.sizes,
    colors: this.colors,
    variants: this.variants.map((v) => ({
      _id: v._id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: v.price,
      inStock: v.inStock,
    })),
    inStock: this.inStock,
    featured: this.featured,
    metaTitle: this.metaTitle,
    metaDescription: this.metaDescription,
  };
};

const Product = mongoose.model('Product', productSchema);
export default Product;
