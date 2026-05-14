# 🔐 Role-Based Access Control (RBAC) Setup Guide

## 📋 Overview

This guide will help you set up and use the comprehensive Role-Based Access Control system in your import/export management application.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install react-icons jwt-decode --legacy-peer-deps
```

### 2. Start Your Development Server
```bash
npm run dev
```

### 3. Initialize the Role System
Once your server is running, visit: `http://localhost:3000/api/init-roles` (POST request)

Or use this curl command:
```bash
curl -X POST http://localhost:3000/api/init-roles
```

This will:
- ✅ Create 12 default roles with permissions
- ✅ Create a Super Admin user if none exists
- ✅ Return system summary

### 4. Default Super Admin Credentials
```
Email: admin@example.com
Password: admin123
```
**⚠️ Change this password immediately after first login!**

## 🔐 Available Roles

### 📊 System Roles (12 Total)

| Role | Description | Key Permissions |
|------|-------------|----------------|
| **Super Admin** | Full system access | All modules + user management |
| **Admin** | Administrative access | All modules except user management |
| **Sales Manager** | Full sales operations | Sales modules + reporting |
| **Sales Executive** | Sales operations | Limited sales access |
| **Purchase Manager** | Full purchase operations | Purchase modules + suppliers |
| **Purchase Executive** | Purchase operations | Limited purchase access |
| **Warehouse Manager** | Inventory management | Inventory + stock movements |
| **Warehouse Staff** | Basic warehouse ops | Read/update inventory |
| **Accountant** | Financial operations | Accounts + payments + reports |
| **Production Manager** | Production planning | BOM + production orders |
| **CRM Manager** | Customer relations | CRM + customer management |
| **Viewer** | Read-only access | View-only across modules |

## 📁 File Structure

```
src/
├── models/
│   └── User.js                     # Enhanced User & Role models
├── lib/
│   └── initializeRoles.js          # Default roles setup
├── middleware/
│   └── auth.js                     # Authentication & permission middleware
├── hooks/
│   └── useAuth.js                  # React hooks for auth & permissions
├── app/api/
│   ├── auth/
│   │   ├── login/route.js          # Login endpoint
│   │   └── profile/route.js        # User profile endpoint
│   ├── roles/
│   │   ├── route.js                # Role CRUD operations
│   │   └── [id]/route.js          # Individual role operations
│   ├── users/
│   │   └── [id]/route.js          # User management
│   ├── signup/route.js             # Enhanced user creation
│   └── init-roles/route.js         # Role initialization
└── app/(dashboard)/admin/
    └── users/page.jsx              # Enhanced user management UI
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login with role/permissions
- `GET /api/auth/profile` - Get current user profile

### User Management
- `GET /api/signup` - List all users
- `POST /api/signup` - Create new user
- `GET /api/users/[id]` - Get user details
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Role Management
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create new role
- `GET /api/roles/[id]` - Get role details
- `PUT /api/roles/[id]` - Update role
- `DELETE /api/roles/[id]` - Delete role

### System
- `POST /api/init-roles` - Initialize default roles

## 🎯 Permission System

### Module-Based Permissions
The system uses 22 modules with 7 possible actions each:

**Modules:**
- `customers`, `suppliers`, `items`, `warehouses`, `groups`
- `sales_quotations`, `sales_orders`, `sales_invoices`, `sales_delivery`
- `purchase_quotations`, `purchase_orders`, `purchase_invoices`, `purchase_grn`
- `inventory`, `stock_movements`, `production`, `bom`
- `accounts`, `payments`, `reports`, `crm`, `users`, `settings`

**Actions:**
- `create`, `read`, `update`, `delete`, `import`, `export`, `approve`

### Example Permission Check
```javascript
// Check if user can create sales orders
const canCreateSalesOrder = await user.hasPermission('sales_orders', 'create');

// Get all user permissions
const permissions = await user.getEffectivePermissions();
```

## 💻 Frontend Usage

### 1. Wrap App with AuthProvider
```jsx
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Use Permission Gates
```jsx
import { PermissionGate, RoleGate } from '@/hooks/useAuth';

// Show content only if user has permission
<PermissionGate module="sales_orders" action="create">
  <CreateOrderButton />
</PermissionGate>

// Show content only for specific roles
<RoleGate roles={['Super Admin', 'Admin']}>
  <AdminPanel />
</RoleGate>
```

### 3. Use Authentication Hooks
```jsx
import { useAuth, usePermission, useRole } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const canEdit = usePermission('customers', 'update');
  const isAdmin = useRole('Super Admin');

  if (!isAuthenticated) return <LoginForm />;
  
  return (
    <div>
      <h1>Welcome, {user.fullName}</h1>
      {canEdit && <EditButton />}
      {isAdmin && <AdminTools />}
    </div>
  );
}
```

### 4. Protect Pages with HOC
```jsx
import { withAuth } from '@/hooks/useAuth';

// Protect entire page
export default withAuth(MyPage, ['sales_orders', 'read'], 'Sales Manager');
```

## 🔒 API Middleware Usage

### Protect API Routes
```javascript
import { withPermission, withRole, withAuth } from '@/middleware/auth';

// Require specific permission
export const GET = withPermission('customers', 'read')(getCustomers);
export const POST = withPermission('customers', 'create')(createCustomer);

// Require specific role
export const DELETE = withRole('Super Admin')(deleteUser);

// Just require authentication
export const GET = withAuth(getProfile);
```

## 🎨 User Management Interface

### Features
- **User List**: View all users with roles and status
- **Role Filtering**: Filter users by role
- **Status Management**: Activate/deactivate users
- **Role Assignment**: Assign roles to users
- **Search**: Search users by name/email
- **User Actions**: Edit, delete, view user details

### Access
Navigate to: `/admin/users` (requires user management permissions)

## 🔐 Security Features

### Account Security
- **Password hashing** with bcrypt (salt rounds: 12)
- **Account locking** after 5 failed login attempts (2-hour lockout)
- **JWT tokens** with configurable expiration
- **Role-based access control** with granular permissions

### Data Protection
- **Input validation** and sanitization
- **SQL injection protection** via Mongoose
- **Permission verification** on every protected endpoint
- **Audit trails** with login tracking

## 🛠️ Customization

### Adding New Roles
1. Use the roles API or create via UI
2. Define custom permissions for modules
3. Assign to users as needed

### Adding New Modules
1. Update the permission schema in `User.js`
2. Add module to the enum list
3. Update role initialization if needed

### Custom Permissions
Users can have additional permissions beyond their role:
```javascript
// Add custom permission to user
user.customPermissions.push({
  module: 'special_reports',
  actions: ['read', 'export']
});
```

## 📊 Testing & Verification

### 1. Test Role Creation
```bash
# Check if roles were created
curl http://localhost:3000/api/roles
```

### 2. Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 3. Test Protected Endpoint
```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚨 Troubleshooting

### Common Issues

1. **"Role not found" error**
   - Run the initialization: `POST /api/init-roles`

2. **"Permission denied" error**
   - Check user role and permissions
   - Verify JWT token is valid

3. **"User not found" error**
   - Ensure user was created properly
   - Check database connection

4. **Frontend authentication issues**
   - Ensure AuthProvider wraps your app
   - Check localStorage for token
   - Verify API endpoints are correct

### Debug Commands
```bash
# Check database connection
npm run dev

# View logs
tail -f logs/app.log

# Test API endpoints
curl -v http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Next Steps

1. **Change default password** for Super Admin
2. **Create additional users** with appropriate roles
3. **Test permissions** in your application
4. **Customize roles** as needed for your business
5. **Set up proper environment variables** for JWT secrets
6. **Configure email verification** (optional)
7. **Set up audit logging** (optional)

## 🔄 Migration from Old System

If you had a previous user system:

1. **Backup your data** before running initialization
2. **Run the initialization** to create new role structure
3. **Migrate existing users** to the new system
4. **Update frontend components** to use new auth hooks
5. **Test all protected routes** and permissions

## 🎉 You're Ready!

Your role-based access control system is now set up and ready to use. Users can be assigned specific roles with granular permissions, and your application will enforce these permissions across all endpoints and UI components.

For additional help or customization, refer to the code comments and documentation within each file.
