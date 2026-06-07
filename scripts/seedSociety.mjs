// scripts/seedSociety.mjs
// import dotenv from "dotenv";
// dotenv.config({ path: ".env.local" });

import dbConnect from "../src/lib/db.js";
import Company from "../src/models/Company.js";
import Society from "../src/models/society/Society.js";
import Flat from "../src/models/society/Flat.js";
import Resident from "../src/models/society/Resident.js";
import Employee from "../src/models/hr/Employee.js";
import CompanyUser from "../src/models/CompanyUser.js";
import Designation from "../src/models/hr/Designation.js";
import Shift from "../src/models/hr/Shift.js";
import Deployment from "../src/models/society/Deployment.js";
import GuardEntry from "../src/models/society/GuardEntry.js";
import GateEntry from "../src/models/society/GateEntry.js";
import BuildingEntry from "../src/models/society/BuildingEntry.js";
import MaintenanceBill from "../src/models/society/MaintenanceBill.js";
import Complaint from "../src/models/society/Complaint.js";
import Notice from "../src/models/society/Notice.js";
import VisitorPass from "../src/models/society/VisitorPass.js";
import bcrypt from "bcryptjs";

const COMPANY_ID = "6a1941a94d94ddef551ec261";
const PASSWORD = "123456";

async function cleanAll() {
  const models = [
    GuardEntry, GateEntry, BuildingEntry,
    Deployment, MaintenanceBill, Complaint,
    Notice, VisitorPass,
    Resident, Flat,
    Employee, CompanyUser,
    Society,
  ];
  for (const Model of models) {
    await Model.deleteMany({ companyId: COMPANY_ID });
  }
  console.log("🧹 All previous data cleared.");
}

async function getOrCreateDesignation(title) {
  let des = await Designation.findOne({ title, companyId: COMPANY_ID });
  if (des) return des;
  try {
    des = await Designation.create({ title, companyId: COMPANY_ID });
  } catch (err) {
    if (err.code === 11000) des = await Designation.findOne({ title });
    else throw err;
  }
  return des;
}

async function getOrCreateShift(name, start, end, grace = 10) {
  let shift = await Shift.findOne({ name, companyId: COMPANY_ID });
  if (shift) return shift;
  shift = await Shift.create({ name, startTime: start, endTime: end, gracePeriod: grace, weeklyOffs: ["Sunday"], companyId: COMPANY_ID });
  return shift;
}

async function seed() {
  await dbConnect();
  await cleanAll();

  const agency = await Company.findById(COMPANY_ID);
  if (!agency) {
    console.error(`❌ Company ${COMPANY_ID} not found.`);
    process.exit(1);
  }
  console.log(`✅ Using agency: ${agency.companyName}`);

  const desGuard = await getOrCreateDesignation("Guard");
  const desHousekeeper = await getOrCreateDesignation("Housekeeper");
  const morningShift = await getOrCreateShift("Morning", "06:00", "14:00");
  const nightShift = await getOrCreateShift("Night", "14:00", "22:00");

  // Societies
  const societies = [];
  for (let i = 1; i <= 10; i++) {
    const s = await Society.create({
      companyId: COMPANY_ID,
      name: `Society ${i}`,
      siteType: i % 3 === 0 ? "Society" : i % 3 === 1 ? "Apartment" : "Office",
      code: `SOC${String(i).padStart(3, "0")}`,
      contactPerson: { name: `Manager ${i}`, phone: `98765432${String(i).padStart(2, "0")}`, email: `soc${i}@example.com` },
      address: { line1: `Plot ${i}, Sector ${i+10}`, city: "Noida", state: "Uttar Pradesh", pincode: "201301" },
      geofence: { latitude: 28.5855 + (i * 0.001), longitude: 77.31 + (i * 0.001), radius: 150 },
      checkpoints: [
        { name: "Main Gate", latitude: 28.5858 + (i * 0.001), longitude: 77.3105 + (i * 0.001), radius: 30 },
        { name: "Building A Entrance", latitude: 28.586 + (i * 0.001), longitude: 77.3108 + (i * 0.001), radius: 20 },
      ],
    });
    societies.push(s);
  }
  console.log(`✅ ${societies.length} societies`);

  // Flats
  const flats = [];
  for (let i = 0; i < 10; i++) {
    const soc = societies[i % societies.length];
    const block = String.fromCharCode(65 + (i % 4));
    const flatNumber = `${block}${101 + i}`;
    const flat = await Flat.create({
      societyId: soc._id,
      companyId: COMPANY_ID,
      block,
      floor: `${1 + (i % 4)}`,
      flatNumber,
      flatType: i % 3 === 0 ? "2BHK" : i % 3 === 1 ? "3BHK" : "1BHK",
      area: 800 + (i * 50),
    });
    flats.push(flat);
  }
  console.log(`✅ ${flats.length} flats`);

  // Residents
  for (let i = 1; i <= 10; i++) {
    await Resident.create({
      societyId: societies[i % societies.length]._id,
      flatId: flats[i % flats.length]._id,
      name: `Resident ${i}`,
      phone: `98111223${String(i).padStart(2, "0")}`,
      email: `resident${i}@example.com`,
      residentType: i % 2 === 0 ? "Owner" : "Tenant",
      moveInDate: new Date(2020, 0, i),
      companyId: COMPANY_ID,
    });
  }
  console.log(`✅ 10 residents`);

  // Employees (Staff)
  const employees = [];
  for (let i = 1; i <= 10; i++) {
    const emp = await Employee.create({
      companyId: COMPANY_ID,
      employeeCode: `EMP${String(i).padStart(3, "0")}`,
      fullName: `Staff ${i}`,
      email: `staff${i}@example.com`,
      phone: `99111223${String(i).padStart(2, "0")}`,
      gender: i % 2 === 0 ? "Male" : "Female",
      joiningDate: new Date(2024, 10, i),
      employmentType: "Contract",
      designation: i % 2 === 0 ? desGuard._id : desHousekeeper._id,
      address: `Address ${i}`,
    });
    employees.push(emp);
  }
  console.log(`✅ ${employees.length} employees`);

  // CompanyUsers (staff logins)
  const hash = await bcrypt.hash(PASSWORD, 10);
  const companyUsers = [];
  for (const emp of employees) {
    const cu = await CompanyUser.create({
      companyId: COMPANY_ID,
      employeeId: emp._id,
      name: emp.fullName,
      email: emp.email,
      password: hash,
      roles: emp.designation.toString() === desGuard._id.toString() ? ["Guard"] : ["Housekeeper"],
      modules: {
        "Guard Entry": { selected: true, permissions: { view: true, create: true } },
        "Gate Entry": { selected: true, permissions: { view: true, create: true } },
        "Building Entry": { selected: true, permissions: { view: true, create: true } },
      },
    });
    companyUsers.push(cu);
  }
  console.log(`✅ ${companyUsers.length} company users`);

  // Deployments (using Employee IDs)
  for (let i = 0; i < 10; i++) {
    await Deployment.create({
      employeeId: employees[i]._id,          // Employee ObjectId
      societyId: societies[i % societies.length]._id,
      shiftId: i % 2 === 0 ? morningShift._id : nightShift._id,
      startDate: new Date(2025, 4, 1),
      isActive: true,
      dailyRate: 500 + (i * 10),
      billingCycle: i % 3 === 0 ? "Daily" : i % 3 === 1 ? "Weekly" : "Monthly",
      companyId: COMPANY_ID,                // ✅ companyId included
    });
  }
  console.log(`✅ 10 deployments`);

  // GuardEntries (using CompanyUser IDs)
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  for (let i = 0; i < 5; i++) {
    await GuardEntry.create({
  companyId: COMPANY_ID,
  employeeId: companyUsers[i]._id,   // ✅ CompanyUser ID
  societyId: societies[i % societies.length]._id,
  deploymentId: null,
  checkpointName: "Main Gate",
  checkpointType: "IN",
  timestamp: new Date(today.getTime() + i * 3600000),
  latitude: 28.5858,
  longitude: 77.3105,
  withinGeofence: true,
});
  }
  console.log(`✅ 5 guard entries`);

  // GateEntries
  for (let i = 0; i < 10; i++) {
    await GateEntry.create({
      companyId: COMPANY_ID,
      societyId: societies[i % societies.length]._id,
      gateName: "Main Gate",
      entryType: i % 2 === 0 ? "IN" : "OUT",
      category: ["Car", "Person", "Bike"][i % 3],
      personName: `Visitor ${i + 1}`,
      vehicleNumber: i % 2 === 0 ? `UP16AB${1000 + i}` : undefined,
      purpose: "Delivery",
      timestamp: new Date(),
      recordedBy: companyUsers[0]?._id,       // optional
    });
  }
  console.log(`✅ 10 gate entries`);

  // BuildingEntries
  for (let i = 0; i < 5; i++) {
    await BuildingEntry.create({
      companyId: COMPANY_ID,
      societyId: societies[i % societies.length]._id,
      buildingName: "Building A Entrance",
      personName: `Worker ${i + 1}`,
      personType: "Worker",
      entryType: i % 2 === 0 ? "IN" : "OUT",
      purpose: "Maintenance",
      timestamp: new Date(),
      recordedBy: companyUsers[0]?._id,
    });
  }
  console.log(`✅ 5 building entries`);

  // Maintenance Bills
  const thisMonth = new Date().toISOString().slice(0, 7);
  for (let i = 0; i < 10; i++) {
    await MaintenanceBill.create({
      companyId: COMPANY_ID,
      societyId: societies[i % societies.length]._id,
      flatId: flats[i % flats.length]._id,
      billPeriod: thisMonth,
      totalAmount: 2000 + (i * 100),
      dueDate: new Date(2026, 4, 15),
      paymentStatus: i % 3 === 0 ? "Paid" : i % 3 === 1 ? "Pending" : "Overdue",
      paidAmount: i % 3 === 0 ? 2000 + (i * 100) : 0,
      paidAt: i % 3 === 0 ? new Date() : null,
    });
  }
  console.log(`✅ 10 maintenance bills`);

  // Complaints
  for (let i = 0; i < 10; i++) {
    await Complaint.create({
      companyId: COMPANY_ID,
      societyId: societies[i % societies.length]._id,
      flatId: flats[i % flats.length]._id,
      raisedBy: { name: `Resident ${i + 1}`, phone: `98111223${String(i + 1).padStart(2, "0")}` },
      category: ["Plumbing", "Electrical", "Cleaning", "Security", "CommonArea"][i % 5],
      description: `Issue ${i + 1} description`,
      priority: i % 2 === 0 ? "High" : "Medium",
      status: ["Pending", "Assigned", "InProgress"][i % 3],
    });
  }
  console.log(`✅ 10 complaints`);

  // Notices
  for (let i = 0; i < 10; i++) {
    await Notice.create({
      societyId: societies[i % societies.length]._id,
      title: `Notice ${i + 1}`,
      description: `This is notice number ${i + 1}.`,
      createdBy: companyUsers[0]?._id,
    });
  }
  console.log(`✅ 10 notices`);

  // Visitor Passes
  for (let i = 0; i < 10; i++) {
    await VisitorPass.create({
      societyId: societies[i % societies.length]._id,
      flatId: flats[i % flats.length]._id,
      visitorName: `Guest ${i + 1}`,
      phone: `99999888${String(i + 1).padStart(2, "0")}`,
      vehicleNumber: i % 2 === 0 ? `DL3CAB${5000 + i}` : undefined,
      purpose: "Visit",
      validFrom: new Date(),
      validTill: new Date(Date.now() + 86400000),
      status: "Pending",
    });
  }
  console.log(`✅ 10 visitor passes`);

  console.log("🎉 ALL DUMMY DATA SEEDED SUCCESSFULLY!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});