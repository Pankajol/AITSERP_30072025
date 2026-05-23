// app/api/election/survey/assign/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Survey from "@/models/election/Survey";
import Notification from "@/models/election/Notification"; // import Notification model
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function PUT(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Election Surveys", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  try {
    const { surveyId, workerIds } = await req.json();
    if (!surveyId || !Array.isArray(workerIds)) {
      return NextResponse.json({ success: false, message: "surveyId and workerIds required" }, { status: 400 });
    }

    const survey = await Survey.findOneAndUpdate(
      { _id: surveyId, companyId: user.companyId },
      { assignedWorkers: workerIds },
      { new: true }
    );
    if (!survey) return NextResponse.json({ success: false, message: "Survey not found" }, { status: 404 });

    // Create notifications for each newly assigned worker
    // (optional: you may want to only notify workers that were newly added, but for simplicity, all)
    if (workerIds.length > 0) {
      const notifications = workerIds.map(workerId => ({
        companyId: user.companyId,
        userId: workerId,
        type: 'survey_assigned',
        title: 'New Survey Assigned',
        message: `You have been assigned to survey: ${survey.title}`,
        data: { surveyId: survey._id },
        createdAt: new Date(),
      }));
      await Notification.insertMany(notifications);
    }

    return NextResponse.json({ success: true, data: survey });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}




// // app/api/election/survey/assign/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Survey from "@/models/election/Survey";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// async function getUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   const user = await verifyJWT(token);
//   if (!user) return { error: "Invalid token", status: 401 };
//   return { user };
// }

// export async function PUT(req) {
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Election Surveys", "edit")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   await dbConnect();
//   try {
//     const { surveyId, workerIds } = await req.json();
//     if (!surveyId || !Array.isArray(workerIds)) {
//       return NextResponse.json({ success: false, message: "surveyId and workerIds required" }, { status: 400 });
//     }

//     const survey = await Survey.findOneAndUpdate(
//       { _id: surveyId, companyId: user.companyId },
//       { assignedWorkers: workerIds },
//       { new: true }
//     );
//     if (!survey) return NextResponse.json({ success: false, message: "Survey not found" }, { status: 404 });

//     return NextResponse.json({ success: true, data: survey });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Survey from "@/models/election/Survey";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function PUT(req) {
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   await dbConnect();
//   try {
//     const { surveyId, workerIds } = await req.json();
//     if (!surveyId || !Array.isArray(workerIds)) {
//       return NextResponse.json({ success: false, message: "surveyId and workerIds required" }, { status: 400 });
//     }

//     const survey = await Survey.findOneAndUpdate(
//       { _id: surveyId, companyId: user.companyId },
//       { assignedWorkers: workerIds },
//       { new: true }
//     );
//     if (!survey) return NextResponse.json({ success: false, message: "Survey not found" }, { status: 404 });

//     return NextResponse.json({ success: true, data: survey });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }