// src/app/api/cities/route.js

import { NextResponse } from 'next/server';
import City from './schema';
import State from '../states/schema';
import connectDb from '../../../lib/db';

connectDb();

export async function GET(req) {
  const { country, state } = req.query;

  try {
    let query = {};

    if (state) {
      query.state = state;
    } else if (country) {
      const states = await State.find({ country }).select('_id');
      query.state = { $in: states.map((s) => s._id) };
    }

    const cities = await City.find(query).populate({
      path: 'state',
      select: 'name',
      populate: { path: 'country', select: 'name' },
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json({ message: 'Failed to fetch cities' }, { status: 500 });
  }
}

export async function POST(req) {
  const { name, code, state } = await req.json();

  if (!name || !code || !state) {
    return NextResponse.json({ message: 'Name, code, and state are required' }, { status: 400 });
  }

  try {
    const newCity = new City({ name, code, state });
    await newCity.save();

    return NextResponse.json(newCity, { status: 201 });
  } catch (error) {
    console.error('Error adding city:', error);
    return NextResponse.json({ message: 'Failed to add city' }, { status: 500 });
  }
}
