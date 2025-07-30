// import { connectDB } from "@/models";
// import { User } from "@/models/User";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export async function POST(req) {
//   const { email, password } = await req.json();
//   await connectDB();
//   const user = await User.findOne({ email }).populate("role");
//   if (!user || !(await user.comparePassword(password))) {
//     return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401 });
//   }
//   const token = jwt.sign({ uid: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
//   return new Response(JSON.stringify({ token, role: user.role.name }), { status: 200 });
// }



// import dbConnect from '@/lib/db';
// import { User } from '@/models/User';
// import { generateToken } from '@/middleware/auth';

// export async function POST(req) {
//   try {
//     await dbConnect();
    
//     const { email, password } = await req.json();
    
//     // Validate input
//     if (!email || !password) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           message: 'Email and password are required'
//         }),
//         { 
//           status: 400,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Find user by email and populate role
//     const user = await User.findOne({ email }).populate('role');
    
//     if (!user) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           message: 'Invalid email or password'
//         }),
//         { 
//           status: 401,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Check if account is locked
//     if (user.isLocked()) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           message: 'Account is temporarily locked due to multiple failed login attempts'
//         }),
//         { 
//           status: 423,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Check if account is active
//     if (!user.isActive) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           message: 'Account is deactivated. Please contact administrator.'
//         }),
//         { 
//           status: 403,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Verify password
//     const isPasswordValid = await user.comparePassword(password);
    
//     if (!isPasswordValid) {
//       // Increment failed login attempts
//       await user.incLoginAttempts();
      
//       return new Response(
//         JSON.stringify({
//           success: false,
//           message: 'Invalid email or password'
//         }),
//         { 
//           status: 401,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Reset failed login attempts on successful login
//     const updates = {
//       lastLoginAt: new Date(),
//       $unset: { failedLoginAttempts: 1, lockedUntil: 1 }
//     };
//     await user.updateOne(updates);

//     // Get user's effective permissions
//     const permissions = await user.getEffectivePermissions();

//     // Generate JWT token
//     const token = generateToken(user._id);

//     // Prepare user data for response (excluding sensitive fields)
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
//       lastLoginAt: new Date(),
//       preferences: user.preferences
//     };

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: 'Login successful',
//         token,
//         user: userData,
//         permissions
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );

//   } catch (error) {
//     console.error('Login error:', error);
//     return new Response(
//       JSON.stringify({
//         success: false,
//         message: 'An error occurred during login',
//         error: error.message
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }
