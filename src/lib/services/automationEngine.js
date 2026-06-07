import AutomationRule from "@/models/AutomationRule";
import Task from "@/models/TaskModel";
import Notification from "@/models/Notification";
import Lead from "@/models/crm/load";
import Opportunity from "@/models/crm/Opportunity";
import Customer from "@/models/CustomerModel";

// Evaluate a single condition
function evaluateCondition(condition, data) {
  const { field, operator, value } = condition;
  const fieldValue = data[field];

  switch (operator) {
    case "eq": return fieldValue === value;
    case "ne": return fieldValue !== value;
    case "gt": return fieldValue > value;
    case "lt": return fieldValue < value;
    case "gte": return fieldValue >= value;
    case "lte": return fieldValue <= value;
    case "in": return Array.isArray(value) && value.includes(fieldValue);
    case "nin": return !Array.isArray(value) || !value.includes(fieldValue);
    default: return false;
  }
}

// Execute an action based on rule
async function executeAction(action, event, rule) {
  const { companyId, entity, entityId, data } = event;
  const { type, params } = action;

  switch (type) {
    case "create_task":
      const task = new Task({
        company: companyId,
        title: params.title || `Auto task for ${entity}`,
        description: params.description || `Created by automation rule: ${rule.name}`,
        dueDate: params.dueInHours ? new Date(Date.now() + params.dueInHours * 60 * 60 * 1000) : null,
        assignees: params.assigneeIds || [],
        relatedTo: { model: entity, id: entityId },
        priority: params.priority || "medium",
        status: "todo",
      });
      await task.save();
      console.log(`[Automation] Created task: ${task.title}`);
      break;

    case "send_notification":
      const notification = new Notification({
        companyId,
        userId: params.userId,
        title: params.title || `Automation: ${rule.name}`,
        message: params.message || `Rule "${rule.name}" triggered on ${entity}`,
        type: "system",
        referenceId: entityId,
        referenceModel: entity,
        isRead: false,
      });
      await notification.save();
      console.log(`[Automation] Sent notification to ${params.userId}`);
      break;

    case "update_field":
      let Model;
      if (entity === "Lead") Model = Lead;
      else if (entity === "Opportunity") Model = Opportunity;
      else if (entity === "Customer") Model = Customer;
      else return;
      await Model.updateOne({ _id: entityId }, { [params.field]: params.value });
      console.log(`[Automation] Updated ${entity} ${entityId}: ${params.field} = ${params.value}`);
      break;

    case "change_stage":
      if (entity === "Opportunity") {
        await Opportunity.updateOne({ _id: entityId }, { stage: params.stage });
        console.log(`[Automation] Changed opportunity stage to ${params.stage}`);
      }
      break;

    default:
      console.log(`[Automation] Unknown action type: ${type}`);
  }
}

// Main event handler – call this from your APIs
export async function handleEvent(event) {
  const { companyId, entity, entityId, action, data, previousData = null } = event;

  // Find matching active rules
  const rules = await AutomationRule.find({
    companyId,
    isActive: true,
    "trigger.entity": entity,
    "trigger.event": action,
  }).sort({ priority: -1 });

  for (const rule of rules) {
    let conditionsMet = true;
    if (rule.trigger.conditions && rule.trigger.conditions.length > 0) {
      for (const cond of rule.trigger.conditions) {
        if (!evaluateCondition(cond, data)) {
          conditionsMet = false;
          break;
        }
      }
    }

    if (!conditionsMet) continue;

    // Execute all actions of this rule
    for (const act of rule.actions) {
      await executeAction(act, event, rule);
    }

    // Update rule statistics
    await rule.updateOne({
      $inc: { triggerCount: 1 },
      $set: { lastTriggeredAt: new Date() },
    });
  }
}