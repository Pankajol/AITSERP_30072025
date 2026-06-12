import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedEmail = email.toLowerCase().trim();

    const result = await CompanyUser.updateOne(
      { email: normalizedEmail },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
