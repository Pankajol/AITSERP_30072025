import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    await dbConnect();

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const company = await Company.create({
      ...body,
      password: hashedPassword,
    });

    return NextResponse.json({ id: company._id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: 'Registration failed' },
      { status: 400 }
    );
  }
}
