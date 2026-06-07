import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
import Notification from "@/models/project/NotificationModel";
import { NextResponse } from "next/server";

export async function POST(req) {
  await connectDB();
  const now = new Date();
  const tasksToRemind = await Task.find({
    reminderAt: { $lte: now },
    reminderSent: false,
    status: { $ne: "done" },
  }).populate("assignees");

  let remindedCount = 0;
  for (const task of tasksToRemind) {
    for (const assignee of task.assignees) {
      await Notification.create({
        user: assignee._id,
        task: task._id,
        type: "task-reminder",
        message: `⏰ Reminder: Task "${task.title}" is due ${task.dueDate ? `on ${new Date(task.dueDate).toLocaleDateString()}` : "soon"}.`,
        read: false,
      });
    }
    task.reminderSent = true;
    await task.save();
    remindedCount++;
  }
  return NextResponse.json({ reminded: remindedCount });
}