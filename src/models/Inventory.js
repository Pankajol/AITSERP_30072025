import mongoose from 'mongoose';

// Batch sub‑schema (if you use batches)
const InventoryBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  purchaseOrderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grnRef: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
  receivedDate: { type: Date, default: Date.now },
}, { _id: false });

// Variant‑specific inventory sub‑schema
const VariantInventorySchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  sku: { type: String, required: true },
  attributes: { type: Object, default: {} },
  quantity: { type: Number, default: 0 },      // physical stock for this variant
  committed: { type: Number, default: 0 },     // reserved for sales orders
  onOrder: { type: Number, default: 0 },       // pending purchase orders
  unitPrice: { type: Number, default: 0 },
  batches: { type: [InventoryBatchSchema], default: [] },
}, { _id: true });

const InventorySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin' },

  // Flag to indicate if this item has variants
  hasVariants: { type: Boolean, default: false },

  // For items with variants, store variant‑level inventory
  variantInventory: { type: [VariantInventorySchema], default: [] },

  // For non‑batch managed items (base item stock)
  quantity: { type: Number, default: 0 },
  committed: { type: Number, default: 0 },
  onOrder: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },

  // For batch‑managed items
  batches: { type: [InventoryBatchSchema], default: [] },

  // Product / BOM references
  productNo: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM' },
  productDesc: { type: String, default: "" },

  // Stock status (auto‑updated)
  stockStatus: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'],
    default: 'In Stock'
  },
  reorderLevel: { type: Number, default: 0 },
  reorderQuantity: { type: Number, default: 0 },

  // Tracking
  lastStockUpdate: { type: Date, default: Date.now },
  lastGRNReference: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },

}, { timestamps: true });

// Indexes
InventorySchema.index({ companyId: 1, item: 1, warehouse: 1 }, { unique: true });
InventorySchema.index({ companyId: 1, warehouse: 1, 'variantInventory.sku': 1 });
InventorySchema.index({ companyId: 1, item: 1, 'variantInventory.variantId': 1 });

// Instance method: get variant inventory
InventorySchema.methods.getVariantInventory = function(variantId) {
  return this.variantInventory.find(v => v.variantId.toString() === variantId.toString());
};

// Instance method: add variant inventory record
InventorySchema.methods.addVariantInventory = function(variantData) {
  const existing = this.getVariantInventory(variantData.variantId);
  if (!existing) {
    this.variantInventory.push({
      variantId: variantData.variantId,
      sku: variantData.sku,
      attributes: variantData.attributes || {},
      quantity: variantData.quantity || 0,
      committed: variantData.committed || 0,
      onOrder: variantData.onOrder || 0,
      unitPrice: variantData.unitPrice || 0,
      batches: variantData.batches || []
    });
  }
  return this.save();
};

// Instance method: update variant stock (add, subtract, set)
InventorySchema.methods.updateVariantStock = function(variantId, qty, type = 'add') {
  const variantInv = this.getVariantInventory(variantId);
  if (variantInv) {
    if (type === 'add') variantInv.quantity += qty;
    else if (type === 'subtract') variantInv.quantity -= qty;
    else if (type === 'set') variantInv.quantity = qty;
    // Ensure non‑negative
    variantInv.quantity = Math.max(0, variantInv.quantity);
    variantInv.committed = Math.max(0, variantInv.committed);
    variantInv.onOrder = Math.max(0, variantInv.onOrder);
    return this.save();
  }
  return Promise.reject(new Error('Variant not found in inventory'));
};

// Instance method: update overall stock status
InventorySchema.methods.updateStockStatus = function() {
  let total = 0;
  if (this.hasVariants) {
    total = this.variantInventory.reduce((sum, v) => sum + v.quantity, 0);
  } else {
    total = this.quantity;
  }
  if (total <= 0) this.stockStatus = 'Out of Stock';
  else if (total <= (this.reorderLevel || 10)) this.stockStatus = 'Low Stock';
  else this.stockStatus = 'In Stock';
  this.lastStockUpdate = new Date();
  return this.save();
};

// Static method: check availability
InventorySchema.statics.checkAvailability = async function(companyId, itemId, warehouseId, requiredQty, variantId = null) {
  const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
  if (!inventory) return false;
  let available = 0;
  if (variantId && inventory.hasVariants) {
    const v = inventory.getVariantInventory(variantId);
    available = v ? (v.quantity - v.committed) : 0;
  } else {
    available = inventory.quantity - inventory.committed;
  }
  return available >= requiredQty;
};

// Static method: reserve stock (for sales orders)
InventorySchema.statics.reserveStock = async function(companyId, itemId, warehouseId, qty, variantId = null) {
  const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
  if (!inventory) return false;
  if (variantId && inventory.hasVariants) {
    const v = inventory.getVariantInventory(variantId);
    if (v && (v.quantity - v.committed) >= qty) {
      v.committed += qty;
      await inventory.save();
      return true;
    }
  } else if ((inventory.quantity - inventory.committed) >= qty) {
    inventory.committed += qty;
    await inventory.save();
    return true;
  }
  return false;
};

// Static method: release reserved stock
InventorySchema.statics.releaseReservedStock = async function(companyId, itemId, warehouseId, qty, variantId = null) {
  const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
  if (!inventory) return false;
  if (variantId && inventory.hasVariants) {
    const v = inventory.getVariantInventory(variantId);
    if (v) {
      v.committed = Math.max(0, v.committed - qty);
      await inventory.save();
      return true;
    }
  } else {
    inventory.committed = Math.max(0, inventory.committed - qty);
    await inventory.save();
    return true;
  }
  return false;
};

// Pre‑save hook
InventorySchema.pre('save', function(next) {
  this.lastStockUpdate = new Date();
  next();
});

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export default Inventory;



// import mongoose from 'mongoose';

// // Define a schema for batch details.
// const InventoryBatchSchema = new mongoose.Schema({
//   batchNumber: { type: String, required: true },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   quantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   purchaseOrderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
//   grnRef: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
//   receivedDate: { type: Date, default: Date.now },
// }, { _id: false });

// // ✅ Variant‑specific inventory sub‑schema
// const VariantInventorySchema = new mongoose.Schema({
//   variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
//   sku: { type: String, required: true },
//   attributes: { type: Object, default: {} },
//   quantity: { type: Number, default: 0 },      // physical stock for this variant
//   committed: { type: Number, default: 0 },     // reserved for sales orders
//   onOrder: { type: Number, default: 0 },       // pending purchase orders
//   unitPrice: { type: Number, default: 0 },
//   batches: { type: [InventoryBatchSchema], default: [] },
// }, { _id: true });

// const InventorySchema = new mongoose.Schema({
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin' },

//   // ✅ Flag to indicate if this item has variants
//   hasVariants: { type: Boolean, default: false },

//   // ✅ For items with variants, store variant‑level inventory
//   variantInventory: { type: [VariantInventorySchema], default: [] },

//   // For non‑batch managed items (base item stock)
//   quantity: { type: Number, default: 0 },
//   committed: { type: Number, default: 0 },
//   onOrder: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },

//   // For batch‑managed items
//   batches: { type: [InventoryBatchSchema], default: [] },

//   // Product / BOM references
//   productNo: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM' },
//   productDesc: { type: String, default: "" },

//   // ✅ Stock status (auto‑updated)
//   stockStatus: {
//     type: String,
//     enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'],
//     default: 'In Stock'
//   },
//   reorderLevel: { type: Number, default: 0 },
//   reorderQuantity: { type: Number, default: 0 },

//   // ✅ Tracking
//   lastStockUpdate: { type: Date, default: Date.now },
//   lastGRNReference: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },

// }, { timestamps: true });

// // ─────────────────────────────────────────────────────────────────
// // Indexes for fast queries
// InventorySchema.index({ companyId: 1, item: 1, warehouse: 1 }, { unique: true });
// InventorySchema.index({ companyId: 1, warehouse: 1, 'variantInventory.sku': 1 });
// InventorySchema.index({ companyId: 1, item: 1, 'variantInventory.variantId': 1 });

// // ─────────────────────────────────────────────────────────────────
// // Helper Methods (instance)

// // Get variant inventory object
// InventorySchema.methods.getVariantInventory = function(variantId) {
//   return this.variantInventory.find(v => v.variantId.toString() === variantId.toString());
// };

// // Add a new variant inventory record (if not exists)
// InventorySchema.methods.addVariantInventory = function(variantData) {
//   const existing = this.getVariantInventory(variantData.variantId);
//   if (!existing) {
//     this.variantInventory.push({
//       variantId: variantData.variantId,
//       sku: variantData.sku,
//       attributes: variantData.attributes || {},
//       quantity: variantData.quantity || 0,
//       committed: variantData.committed || 0,
//       onOrder: variantData.onOrder || 0,
//       unitPrice: variantData.unitPrice || 0,
//       batches: variantData.batches || []
//     });
//   }
//   return this.save();
// };

// // Update variant stock (add, subtract, or set)
// InventorySchema.methods.updateVariantStock = function(variantId, quantityChange, type = 'add') {
//   const variantInv = this.getVariantInventory(variantId);
//   if (variantInv) {
//     if (type === 'add') variantInv.quantity += quantityChange;
//     else if (type === 'subtract') variantInv.quantity -= quantityChange;
//     else if (type === 'set') variantInv.quantity = quantityChange;
//     // Ensure non‑negative
//     variantInv.quantity = Math.max(0, variantInv.quantity);
//     variantInv.committed = Math.max(0, variantInv.committed);
//     variantInv.onOrder = Math.max(0, variantInv.onOrder);
//     return this.save();
//   }
//   return Promise.reject(new Error('Variant not found in inventory'));
// };

// // Update overall stock status based on current quantities
// InventorySchema.methods.updateStockStatus = function() {
//   let total = 0;
//   if (this.hasVariants) {
//     total = this.variantInventory.reduce((sum, v) => sum + v.quantity, 0);
//   } else {
//     total = this.quantity;
//   }
//   if (total <= 0) this.stockStatus = 'Out of Stock';
//   else if (total <= (this.reorderLevel || 10)) this.stockStatus = 'Low Stock';
//   else this.stockStatus = 'In Stock';
//   this.lastStockUpdate = new Date();
//   return this.save();
// };

// // ─────────────────────────────────────────────────────────────────
// // Static Methods

// // Get inventory for a specific item & warehouse, optionally for a variant
// InventorySchema.statics.getInventoryByItemAndVariant = async function(companyId, itemId, warehouseId, variantId = null) {
//   const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
//   if (!inventory) return null;
//   if (variantId && inventory.hasVariants) {
//     return inventory.getVariantInventory(variantId);
//   }
//   return inventory;
// };

// // Check if sufficient stock is available
// InventorySchema.statics.checkAvailability = async function(companyId, itemId, warehouseId, requiredQty, variantId = null) {
//   const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
//   if (!inventory) return false;
//   let available = 0;
//   if (variantId && inventory.hasVariants) {
//     const v = inventory.getVariantInventory(variantId);
//     available = v ? (v.quantity - v.committed) : 0;
//   } else {
//     available = inventory.quantity - inventory.committed;
//   }
//   return available >= requiredQty;
// };

// // Reserve stock (for sales orders)
// InventorySchema.statics.reserveStock = async function(companyId, itemId, warehouseId, qty, variantId = null) {
//   const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
//   if (!inventory) return false;
//   if (variantId && inventory.hasVariants) {
//     const v = inventory.getVariantInventory(variantId);
//     if (v && (v.quantity - v.committed) >= qty) {
//       v.committed += qty;
//       await inventory.save();
//       return true;
//     }
//   } else if ((inventory.quantity - inventory.committed) >= qty) {
//     inventory.committed += qty;
//     await inventory.save();
//     return true;
//   }
//   return false;
// };

// // Release reserved stock (e.g., order cancelled)
// InventorySchema.statics.releaseReservedStock = async function(companyId, itemId, warehouseId, qty, variantId = null) {
//   const inventory = await this.findOne({ companyId, item: itemId, warehouse: warehouseId });
//   if (!inventory) return false;
//   if (variantId && inventory.hasVariants) {
//     const v = inventory.getVariantInventory(variantId);
//     if (v) {
//       v.committed = Math.max(0, v.committed - qty);
//       await inventory.save();
//       return true;
//     }
//   } else {
//     inventory.committed = Math.max(0, inventory.committed - qty);
//     await inventory.save();
//     return true;
//   }
//   return false;
// };

// // ─────────────────────────────────────────────────────────────────
// // Pre‑save hook to automatically update stock status
// InventorySchema.pre('save', function(next) {
//   this.lastStockUpdate = new Date();
//   // Optionally auto‑update stock status here, but we keep method separate.
//   next();
// });

// // ─────────────────────────────────────────────────────────────────
// // Export model
// const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
// export default Inventory;



// import mongoose from 'mongoose';

// // Define a schema for batch details.
// const InventoryBatchSchema = new mongoose.Schema({
//   batchNumber: { type: String, required: true },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   quantity: { type: Number, default: 0 }, // Quantity for this batch
//   unitPrice: { type: Number, default: 0 },
// }, { _id: false });

// const InventorySchema = new mongoose.Schema({
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin' },
//   // For non-batch managed items.
//   quantity: { type: Number, default: 0 }, // Total physical stock
//   committed: { type: Number, default: 0 }, // Reserved for sales orders
//   onOrder: { type: Number, default: 0 },   // Pending purchase orders (if applicable)
//   unitPrice: { type: Number, default: 0 },
//   // For batch-managed items, store batch details.
//   batches: { type: [InventoryBatchSchema], default: [] },
//   productNo: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM' },
//   productDesc: { type: String },

// }, {
//   timestamps: true,
// });

// export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);







// import mongoose from 'mongoose';

// const InventorySchema = new mongoose.Schema({
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   quantity: { type: Number, default: 0 }, // Physical stock
//   committed: { type: Number, default: 0 }, // Reserved for sales orders
//   onOrder: { type: Number, default: 0 },   // Pending purchase orders (if applicable)
//   unitPrice: { type: Number, default: 0 },
// }, {
//   timestamps: true,
// });

// export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

