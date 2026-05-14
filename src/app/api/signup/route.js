// import connectDb from '../../../lib/db';
// import Account from './schema';

// export async function POST(request) {
//   try {
//     await connectDb();
//     const body = await request.json();

//     // Create a new user
//     const account = new Account(body);
//     await account.save();

//     return new Response(JSON.stringify({ message: 'User created successfully!' }), {
//       status: 201,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   } catch (error) {
//     console.error(error);
//     return new Response(JSON.stringify({ error: 'Error creating user', details: error.message }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   }
// }

// export async function GET() {
//     try {
//       await connectDb(); // Ensure the database is connected
  
//       // Fetch all accounts from the database
//       const accounts = await Account.find();
  
//       return new Response(JSON.stringify(accounts), {
//         status: 200,
//         headers: { 'Content-Type': 'application/json' },
//       });
//     } catch (error) {
//       console.error(error);
//       return new Response(
//         JSON.stringify({ error: 'Error fetching accounts', details: error.message }),
//         {
//           status: 500,
//           headers: { 'Content-Type': 'application/json' },
//         }
//       );
//     }
//   }



import User from '../signin/schema';
import Account from './schema';
import connectDb from '../../../lib/db';

export async function POST(req) {
  await connectDb(); // Ensure the database is connected

  try {
    // Parse the request body
    const body = await req.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      country,
      address,
      pinCode,
      password,
      role,
      agreeToTerms,
    } = body;

    // Input validation
    if (!email || !password || !role || !agreeToTerms) {
      return new Response(
        JSON.stringify({ message: 'Required fields are missing.' }),
        { status: 400 }
      );
    }

    // Check if the email or phone already exists
    const existingAccount = await Account.findOne({ $or: [{ email }, { phone }] });
    const existingUser = await User.findOne({ email });

    if (existingAccount || existingUser) {
      return new Response(
        JSON.stringify({ message: 'Account with this email or phone already exists.' }),
        { status: 400 }
      );
    }

    // Create an Account entry
    const account = await Account.create({
      firstName,
      lastName,
      phone,
      email,
      password, // Optionally hash here if required
      country,
      address,
      pinCode,
      agreeToTerms,
    });

    // Create a User entry
    const user = await User.create({
      email,
      password, // Automatically hashed by the User schema
      role: role || 'Customer', // Assign a default role if not provided
    });

    // Return success response
    return new Response(
      JSON.stringify({
        message: 'Account created successfully!',
        account,
        user,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating account and user:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error. Please try again.' }),
      { status: 500 }
    );
  }
}

// export async function GET() {
//   await connectDb(); // Ensure the database is connected

//   try {
//     // Fetch all accounts from the database
//     const accounts = await Account.find().populate('role', 'name'); // Populate role name

//     return new Response(JSON.stringify(accounts), {
//       status: 200,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   } catch (error) {
//     console.error('Error fetching accounts:', error);
//     return new Response(
//       JSON.stringify({ message: 'Error fetching accounts', details: error.message }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// }