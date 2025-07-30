import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Clear session cookies (example: auth_token, refresh_token)
  
    const response = NextResponse.json({ message: 'Logout successful' });
    
    // Set cookies with Max-Age=0 to delete them
    response.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    response.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
