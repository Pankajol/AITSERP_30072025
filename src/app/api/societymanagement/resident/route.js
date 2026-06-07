import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Resident from '@/models/society/Resident';
import Society from '@/models/society/Society';
import Flat from '@/models/society/Flat';
import Building from '@/models/society/Building';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';
import { getTokenFromHeader, verifyJWT, hasPermission } from '@/lib/auth';

// Helper to get user from request (using your existing helpers)
async function getUserFromReq(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const user = verifyJWT(token);
  if (!user) return null;
  return user;
}

// Helper to check module permission
async function checkPermission(req, action) {
  const user = await getUserFromReq(req);
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!hasPermission(user, 'Resident', action)) {
    return { error: 'Forbidden', status: 403 };
  }
  return { user };
}

// Automatically create a CompanyUser for a resident (with default Resident module)
async function createResidentUser(resident, companyId, societyId) {
  const userEmail = resident.email || (resident.phone ? `${resident.phone}@resident.local` : `${resident._id}@resident.local`);
  const defaultPassword = '123456'; // CHANGE in production
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const existing = await CompanyUser.findOne({ email: userEmail, companyId });
  if (!existing) {
    const newUser = new CompanyUser({
      companyId,
      employeeId: resident._id,
      name: resident.name,
      email: userEmail,
      phone: resident.phone,
      password: hashedPassword,
      roles: ['Resident'],
      societyId,
      modules: {
        Resident: {
          selected: true,
          permissions: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
        },
      },
    });
    await newUser.save();
  }
}

export async function GET(req) {
  await dbConnect();
  const perm = await checkPermission(req, 'view');
  if (perm.error) return NextResponse.json({ success: false, message: perm.error }, { status: perm.status });
  const { user } = perm;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const societyId = searchParams.get('societyId') || user.societyId;
    const buildingId = searchParams.get('buildingId');
    const flatId = searchParams.get('flatId');
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 100);
    const search = searchParams.get('search') || '';

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (buildingId) query.buildingId = buildingId;
    if (flatId) query.flatIds = flatId;

    if (id) {
      const resident = await Resident.findOne({ _id: id, ...query })
        .populate('societyId flatIds buildingId')
        .lean();
      if (!resident) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: resident });
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [residents, total] = await Promise.all([
      Resident.find(query)
        .populate('societyId flatIds buildingId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Resident.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: residents,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const perm = await checkPermission(req, 'create');
  if (perm.error) return NextResponse.json({ success: false, message: perm.error }, { status: perm.status });
  const { user } = perm;

  try {
    const data = await req.json();
    const { buildingId, flatIds, name, phone, email } = data;
    if (!buildingId || !flatIds || !flatIds.length || !name) {
      return NextResponse.json({ success: false, message: 'buildingId, flatIds (array) and name are required' }, { status: 400 });
    }

    // Fetch all selected flats
    const flats = await Flat.find({ _id: { $in: flatIds } });
    if (flats.length !== flatIds.length) {
      return NextResponse.json({ success: false, message: 'One or more flats not found' }, { status: 404 });
    }

    // Validate all flats belong to the same society and same building
    const firstFlat = flats[0];
    const societyId = firstFlat.societyId;
    const buildingFromFlats = firstFlat.buildingId;
    for (const flat of flats) {
      if (flat.societyId.toString() !== societyId.toString()) {
        return NextResponse.json({ success: false, message: 'All flats must belong to the same society' }, { status: 400 });
      }
      if (flat.buildingId.toString() !== buildingFromFlats.toString()) {
        return NextResponse.json({ success: false, message: 'All flats must belong to the same building' }, { status: 400 });
      }
    }
    if (buildingId !== buildingFromFlats.toString()) {
      return NextResponse.json({ success: false, message: 'Provided buildingId does not match the flats\' building' }, { status: 400 });
    }

    // Check duplicate phone (unique per society)
    if (phone) {
      const existing = await Resident.findOne({ societyId, phone, companyId: user.companyId });
      if (existing) {
        return NextResponse.json({ success: false, message: 'A resident with this phone number already exists in this society.' }, { status: 409 });
      }
    }

    // Create resident
    const resident = new Resident({
      ...data,
      societyId,
      buildingId,
      flatIds,
      companyId: user.companyId,
    });
    await resident.save();

    // Automatically create CompanyUser for this resident (if not already exists)
    await createResidentUser(resident, user.companyId, societyId);

    const populated = await Resident.findById(resident._id)
      .populate('societyId flatIds buildingId')
      .lean();
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Create failed: ' + err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const perm = await checkPermission(req, 'edit');
  if (perm.error) return NextResponse.json({ success: false, message: perm.error }, { status: perm.status });
  const { user } = perm;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    const data = await req.json();
    delete data.companyId;

    const existing = await Resident.findOne({ _id: id, companyId: user.companyId });
    if (!existing) return NextResponse.json({ success: false, message: 'Resident not found' }, { status: 404 });

    // If flatIds or buildingId changed, re-validate
    const newFlatIds = data.flatIds || existing.flatIds;
    const newBuildingId = data.buildingId || existing.buildingId;

    if (JSON.stringify(newFlatIds.map(id => id.toString())) !== JSON.stringify(existing.flatIds.map(id => id.toString())) ||
        newBuildingId.toString() !== existing.buildingId.toString()) {
      const flats = await Flat.find({ _id: { $in: newFlatIds } });
      if (flats.length !== newFlatIds.length) {
        return NextResponse.json({ success: false, message: 'One or more flats not found' }, { status: 404 });
      }
      const firstFlat = flats[0];
      const societyId = firstFlat.societyId;
      const buildingFromFlats = firstFlat.buildingId;
      for (const flat of flats) {
        if (flat.societyId.toString() !== societyId.toString()) {
          return NextResponse.json({ success: false, message: 'All flats must belong to the same society' }, { status: 400 });
        }
        if (flat.buildingId.toString() !== buildingFromFlats.toString()) {
          return NextResponse.json({ success: false, message: 'All flats must belong to the same building' }, { status: 400 });
        }
      }
      if (newBuildingId.toString() !== buildingFromFlats.toString()) {
        return NextResponse.json({ success: false, message: 'BuildingId does not match the flats\' building' }, { status: 400 });
      }
      data.societyId = societyId;
    }

    // Phone duplicate check
    if (data.phone && data.phone !== existing.phone) {
      const duplicate = await Resident.findOne({
        societyId: data.societyId || existing.societyId,
        phone: data.phone,
        companyId: user.companyId,
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, message: 'Another resident with this phone number already exists in this society.' }, { status: 409 });
      }
    }

    const updated = await Resident.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('societyId flatIds buildingId');

    // Also update the linked CompanyUser (name, phone, email)
    if (data.name || data.phone || data.email) {
      const companyUser = await CompanyUser.findOne({ employeeId: id, companyId: user.companyId });
      if (companyUser) {
        if (data.name) companyUser.name = data.name;
        if (data.phone) companyUser.phone = data.phone;
        if (data.email) companyUser.email = data.email;
        await companyUser.save();
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Update failed: ' + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const perm = await checkPermission(req, 'delete');
  if (perm.error) return NextResponse.json({ success: false, message: perm.error }, { status: perm.status });
  const { user } = perm;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    const deleted = await Resident.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

    // Optionally delete the linked CompanyUser
    await CompanyUser.findOneAndDelete({ employeeId: id, companyId: user.companyId });
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Delete failed' }, { status: 500 });
  }
}