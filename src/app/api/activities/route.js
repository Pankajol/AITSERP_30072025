import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
import Comment from "@/models/project/CommentModel";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectDB();
  const token = getTokenFromHeader(req);
  const decoded = verifyJWT(token);
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entity"); // Lead, Opportunity, Customer
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "Missing entity or entityId" }, { status: 400 });
  }

  // Fetch tasks related to this entity
  const tasks = await Task.find({
    company: decoded.companyId,
    "relatedTo.model": entityType,
    "relatedTo.id": entityId,
  })
    .populate("assignees", "name")
    .populate("creatBy", "name")
    .lean();

  // Fetch comments (if they are linked to the entity, but your current comment model is linked to tasks only)
  // For simplicity, we'll only return tasks for now.
  const activities = tasks.map(t => ({
    _id: t._id,
    type: "task",
    title: t.title,
    description: t.description,
    status: t.status,
    assignees: t.assignees,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  // Sort by newest first
  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json(activities);
}