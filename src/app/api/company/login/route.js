import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
    }

    await dbConnect();
    const company = await Company.findOne({ email });

    if (!company) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const token = jwt.sign(
      {
        id: company._id,
        email: company.email,
        type: 'company',
        companyName: company.companyName,
        companyId: company._id, 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({ token, company }, { status: 200 });

  } catch (err) {
    console.error('Company Login Error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
