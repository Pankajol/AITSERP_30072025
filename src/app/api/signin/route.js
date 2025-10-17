// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import User from './schema';
// import connectDb from '../../../lib/db'; // Assuming you have a dbConnect utility

// export async function POST(req) {
//   await connectDb(); // Connect to the database

//   try {
//     const { email, password, role } = await req.json(); // Parse JSON body from the request

//     // Find the user by email and role
//     const user = await User.findOne({ email, role });
//     if (!user) {
//       return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 400 });
//     }

//     // Check if the password matches
//     const isPasswordMatch = await bcrypt.compare(password, user.password);
//     if (!isPasswordMatch) {
//       return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 400 });
//     }

//     // Create a JWT token
//     const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
//       expiresIn: '1h',
//     });

//     return new Response(JSON.stringify({ token }), { status: 200 });
//   } catch (error) {
//     console.error('Server Error:', error); // Log the error for debugging
//     return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
//   }
// }


import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './schema';
import connectDb from '../../../lib/db';

export async function POST(req) {
  await connectDb();

  try {
    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ message: 'All fields are required' }), { status: 400 });
    }

    const user = await User.findOne({ email, role });
    if (!user) {
      return new Response(JSON.stringify({ message: 'Invalid email or role' }), { status: 400 });
    }

    // const isPasswordMatch = await bcrypt.compare(password, user.password);
    // if (!isPasswordMatch) {
    //   return new Response(JSON.stringify({ message: 'Invalid password' }), { status: 400 });
    // }

    const token = jwt.sign({ id: user._id, role: user.role,mo }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return new Response(JSON.stringify({ token }), { status: 200 });
  } catch (error) {
    console.error('Server Error:', error);
    return new Response(JSON.stringify({ message: 'Server error occurred' }), { status: 500 });
  }
}

