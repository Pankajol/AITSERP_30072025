import dbConnect from './db';
import { Role } from '../models/User';

// Default roles with their permissions
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissions: [
      // All modules with all actions
      { module: 'customers', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'suppliers', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'items', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'warehouses', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'groups', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'sales_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_delivery', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_grn', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'inventory', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'stock_movements', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'production', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'bom', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'accounts', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'payments', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'reports', actions: ['read', 'export'] },
      { module: 'crm', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'settings', actions: ['create', 'read', 'update', 'delete'] }
    ]
  },
  {
    name: 'Admin',
    description: 'Administrative access with most permissions except user management',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'suppliers', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'items', actions: ['create', 'read', 'update', 'delete', 'import', 'export'] },
      { module: 'warehouses', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'groups', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'sales_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_delivery', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_grn', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'inventory', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'stock_movements', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'production', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'bom', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'accounts', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'payments', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'reports', actions: ['read', 'export'] },
      { module: 'crm', actions: ['create', 'read', 'update', 'delete', 'export'] }
    ]
  },
  {
    name: 'Sales Manager',
    description: 'Full sales module access with reporting capabilities',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['create', 'read', 'update', 'export'] },
      { module: 'items', actions: ['read', 'export'] },
      { module: 'sales_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'sales_invoices', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'sales_delivery', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'inventory', actions: ['read'] },
      { module: 'reports', actions: ['read', 'export'] },
      { module: 'crm', actions: ['create', 'read', 'update', 'delete', 'export'] }
    ]
  },
  {
    name: 'Sales Executive',
    description: 'Sales operations with limited administrative access',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['create', 'read', 'update'] },
      { module: 'items', actions: ['read'] },
      { module: 'sales_quotations', actions: ['create', 'read', 'update'] },
      { module: 'sales_orders', actions: ['create', 'read', 'update'] },
      { module: 'sales_invoices', actions: ['read'] },
      { module: 'sales_delivery', actions: ['read'] },
      { module: 'inventory', actions: ['read'] },
      { module: 'crm', actions: ['create', 'read', 'update'] }
    ]
  },
  {
    name: 'Purchase Manager',
    description: 'Full purchase module access with supplier management',
    isSystem: true,
    permissions: [
      { module: 'suppliers', actions: ['create', 'read', 'update', 'export'] },
      { module: 'items', actions: ['read', 'update', 'export'] },
      { module: 'purchase_quotations', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_orders', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_invoices', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'purchase_grn', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'inventory', actions: ['read', 'update', 'export'] },
      { module: 'stock_movements', actions: ['read', 'export'] },
      { module: 'accounts', actions: ['read'] },
      { module: 'reports', actions: ['read', 'export'] }
    ]
  },
  {
    name: 'Purchase Executive',
    description: 'Purchase operations with limited access',
    isSystem: true,
    permissions: [
      { module: 'suppliers', actions: ['read', 'update'] },
      { module: 'items', actions: ['read'] },
      { module: 'purchase_quotations', actions: ['create', 'read', 'update'] },
      { module: 'purchase_orders', actions: ['create', 'read', 'update'] },
      { module: 'purchase_invoices', actions: ['read'] },
      { module: 'purchase_grn', actions: ['create', 'read', 'update'] },
      { module: 'inventory', actions: ['read'] }
    ]
  },
  {
    name: 'Warehouse Manager',
    description: 'Inventory and warehouse operations management',
    isSystem: true,
    permissions: [
      { module: 'items', actions: ['read', 'update'] },
      { module: 'warehouses', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'inventory', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'stock_movements', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'sales_delivery', actions: ['read', 'update'] },
      { module: 'purchase_grn', actions: ['read', 'update'] },
      { module: 'production', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read', 'export'] }
    ]
  },
  {
    name: 'Warehouse Staff',
    description: 'Basic warehouse operations',
    isSystem: true,
    permissions: [
      { module: 'items', actions: ['read'] },
      { module: 'inventory', actions: ['read', 'update'] },
      { module: 'stock_movements', actions: ['create', 'read'] },
      { module: 'sales_delivery', actions: ['read', 'update'] },
      { module: 'purchase_grn', actions: ['read', 'update'] }
    ]
  },
  {
    name: 'Accountant',
    description: 'Financial operations and reporting',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['read'] },
      { module: 'suppliers', actions: ['read'] },
      { module: 'sales_invoices', actions: ['read', 'update', 'export'] },
      { module: 'purchase_invoices', actions: ['read', 'update', 'export'] },
      { module: 'accounts', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'payments', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'reports', actions: ['read', 'export'] }
    ]
  },
  {
    name: 'Production Manager',
    description: 'Production planning and BOM management',
    isSystem: true,
    permissions: [
      { module: 'items', actions: ['read', 'update'] },
      { module: 'bom', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'production', actions: ['create', 'read', 'update', 'delete', 'approve', 'export'] },
      { module: 'inventory', actions: ['read', 'update'] },
      { module: 'stock_movements', actions: ['read', 'export'] },
      { module: 'reports', actions: ['read', 'export'] }
    ]
  },
  {
    name: 'CRM Manager',
    description: 'Customer relationship management and lead handling',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['create', 'read', 'update', 'export'] },
      { module: 'crm', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { module: 'sales_quotations', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read', 'export'] }
    ]
  },
  {
    name: 'Viewer',
    description: 'Read-only access to most modules',
    isSystem: true,
    permissions: [
      { module: 'customers', actions: ['read'] },
      { module: 'suppliers', actions: ['read'] },
      { module: 'items', actions: ['read'] },
      { module: 'warehouses', actions: ['read'] },
      { module: 'sales_quotations', actions: ['read'] },
      { module: 'sales_orders', actions: ['read'] },
      { module: 'sales_invoices', actions: ['read'] },
      { module: 'sales_delivery', actions: ['read'] },
      { module: 'purchase_quotations', actions: ['read'] },
      { module: 'purchase_orders', actions: ['read'] },
      { module: 'purchase_invoices', actions: ['read'] },
      { module: 'purchase_grn', actions: ['read'] },
      { module: 'inventory', actions: ['read'] },
      { module: 'production', actions: ['read'] },
      { module: 'bom', actions: ['read'] },
      { module: 'accounts', actions: ['read'] },
      { module: 'reports', actions: ['read'] },
      { module: 'crm', actions: ['read'] }
    ]
  }
];

export async function initializeRoles() {
  try {
    await dbConnect();
    
    console.log('Initializing default roles...');
    
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }
    
    console.log('Role initialization completed!');
    return true;
  } catch (error) {
    console.error('Error initializing roles:', error);
    throw error;
  }
}

// Export default roles for reference
export { defaultRoles };
