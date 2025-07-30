// import { withAuth } from '@/middleware/auth';

// async function getProfile(req) {
//   try {
//     const user = req.user;
    
//     // Get user's effective permissions
//     const permissions = await user.getEffectivePermissions();
    
//     // Prepare user data for response
//     const userData = {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       fullName: user.fullName,
//       email: user.email,
//       phone: user.phone,
//       role: {
//         id: user.role._id,
//         name: user.role.name,
//         description: user.role.description
//       },
//       department: user.department,
//       employeeId: user.employeeId,
//       lastLoginAt: user.lastLoginAt,
//       preferences: user.preferences,
//       isActive: user.isActive,
//       createdAt: user.createdAt
//     };

//     return new Response(
//       JSON.stringify({
//         success: true,
//         user: userData,
//         permissions
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );

//   } catch (error) {
//     console.error('Profile fetch error:', error);
//     return new Response(
//       JSON.stringify({
//         success: false,
//         message: 'Failed to fetch profile',
//         error: error.message
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }

// export const GET = withAuth(getProfile);
