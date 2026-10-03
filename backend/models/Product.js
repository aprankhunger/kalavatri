import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    image: { type: String, required: true },
    category: {
      type: String,
      enum: ['bridal', 'festive', 'everyday', 'designer'],
      required: true,
    },
    badge: {
      type: String,
      enum: ['new', 'bestseller', 'sale', ''],
      default: '',
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    sizes: [{ type: Number }],
    colors: [{ type: String }],
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
