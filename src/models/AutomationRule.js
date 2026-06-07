import mongoose from "mongoose";

const ConditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: { type: String, enum: ["eq", "ne", "gt", "lt", "gte", "lte", "in", "nin"], default: "eq" },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const ActionSchema = new mongoose.Schema({
  type: { type: String, enum: ["create_task", "send_notification", "update_field", "change_stage"], required: true },
  params: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const AutomationRuleSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  trigger: {
    entity: { type: String, enum: ["Lead", "Opportunity", "Customer", "Task"], required: true },
    event: { type: String, enum: ["created", "updated", "status_changed", "stage_changed", "deleted"], required: true },
    conditions: [ConditionSchema],
  },
  actions: [ActionSchema],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  lastTriggeredAt: Date,
  triggerCount: { type: Number, default: 0 },
}, { timestamps: true });

AutomationRuleSchema.index({ companyId: 1, isActive: 1, priority: 1 });
AutomationRuleSchema.index({ "trigger.entity": 1, "trigger.event": 1 });

export default mongoose.models.AutomationRule || mongoose.model("AutomationRule", AutomationRuleSchema);