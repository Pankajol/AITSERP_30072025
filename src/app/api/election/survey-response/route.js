import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SurveyResponse from "@/models/election/SurveyResponse";
import Voter from "@/models/election/Voter"; // Voter के surveys array में भी डालने के लिए
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "election manager", "canvasser", "booth agent"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    const required = ["survey", "voter", "answers"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // एक वोटर का एक सर्वे में एक ही रिस्पॉन्स (upsert)
    const response = await SurveyResponse.findOneAndUpdate(
      { survey: data.survey, voter: data.voter, companyId: user.companyId },
      {
        ...data,
        worker: user.id,
        submittedAt: new Date(),
        companyId: user.companyId,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // वोटर के surveys array में भी जोड़ें (अगर पहले से मौजूद नहीं तो)
    await Voter.findByIdAndUpdate(
      data.voter,
      {
        $addToSet: {
          surveys: {
            survey: data.survey,
            answers: data.answers,
            surveyedBy: user.id,
            date: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true, data: response }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to submit response" }, { status: 500 });
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const surveyId = searchParams.get("survey");
    const voterId = searchParams.get("voter");

    if (id) {
      const resp = await SurveyResponse.findOne({ _id: id, companyId: user.companyId })
        .populate("survey", "title")
        .populate("voter", "firstName lastName voterId")
        .populate("worker", "name")
        .lean();
      if (!resp) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: resp });
    }

    const query = { companyId: user.companyId };
    if (surveyId) query.survey = surveyId;
    if (voterId) query.voter = voterId;

    const responses = await SurveyResponse.find(query)
      .populate("voter", "firstName lastName voterId")
      .populate("worker", "name")
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: responses });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// PUT और DELETE आमतौर पर survey response के लिए नहीं चाहिए, लेकिन ज़रूरत हो तो जोड़ सकते हैं