import mongoose from 'mongoose';

const inventoryMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      index: true,
    },
    variantSku: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['initial_stock', 'addition', 'sale', 'cancellation', 'return', 'manual_adjustment', 'audit'],
      required: true,
      index: true,
    },
    quantityChange: {
      type: Number,
      required: true, // e.g. +10, -1, etc.
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    adminEmail: {
      type: String,
      default: 'system',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);
export default InventoryMovement;
