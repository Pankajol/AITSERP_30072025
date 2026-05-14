// import { initializeRoles } from '@/lib/initializeRoles';
// import { User, Role } from '@/models/User';
// import dbConnect from '@/lib/db';

// export async function POST(req) {
//   try {
//     console.log('🚀 Initializing Role-Based Access Control System...');
    
//     // Connect to database
//     await dbConnect();
//     console.log('✅ Connected to database');
    
//     // Initialize default roles
//     await initializeRoles();
//     console.log('✅ Default roles initialized');
    
//     // Check if Super Admin user exists
//     const superAdminRole = await Role.findOne({ name: 'Super Admin' });
//     if (!superAdminRole) {
//       throw new Error('Super Admin role not found');
//     }
    
//     let superAdmin = await User.findOne({ role: superAdminRole._id });
    
//     if (!superAdmin) {
//       console.log('⚠️  No Super Admin user found. Creating default Super Admin...');
      
//       superAdmin = await User.create({
//         firstName: 'Super',
//         lastName: 'Admin',
//         email: 'admin@example.com',
//         phone: '1234567890',
//         password: 'admin123', // Change this in production!
//         role: superAdminRole._id,
//         department: 'IT',
//         employeeId: 'SA001',
//         isEmailVerified: true
//       });
      
//       console.log('✅ Super Admin user created');
//     }
    
//     // Get role summary
//     const roles = await Role.find().sort({ name: 1 });
//     const users = await User.countDocuments();
    
//     const roleSummary = [];
//     for (const role of roles) {
//       const userCount = await User.countDocuments({ role: role._id });
//       roleSummary.push({
//         name: role.name,
//         description: role.description,
//         userCount,
//         isSystem: role.isSystem
//       });
//     }
    
//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: 'Role-Based Access Control System initialized successfully',
//         data: {
//           totalRoles: roles.length,
//           totalUsers: users,
//           superAdminCreated: !superAdmin.createdAt || superAdmin.createdAt > new Date(Date.now() - 1000),
//           roles: roleSummary,
//           superAdmin: {
//             email: 'admin@example.com',
//             password: 'admin123',
//             note: 'Please change the default password immediately!'
//           }
//         }
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );

//   } catch (error) {
//     console.error('❌ Error initializing RBAC system:', error);
//     return new Response(
//       JSON.stringify({
//         success: false,
//         message: 'Failed to initialize RBAC system',
//         error: error.message
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }
