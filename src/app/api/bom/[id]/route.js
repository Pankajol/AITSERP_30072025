import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import BOM from '@/models/BOM'

// GET /api/bom/:id
export async function GET(request, { params }) {
  // first await the params promise
  const { id } = await params

  // then connect to the database
  await connectDB()

  try {
    const bom = await BOM.findById(id)
    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 })
    }
    return NextResponse.json(bom, { status: 200 })
  } catch (err) {
    console.error('Error fetching BOM by ID:', err)
    return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 })
  }
}
