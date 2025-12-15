// models/CustomField.js
import mongoose from "mongoose";

const CustomFieldSchema = new mongoose.Schema(
  {
    /* ================= COMPANY / MODULE ================= */
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Customer | Ticket | Lead | Job | etc.
    module: {
      type: String,
      required: true,
      default: "Customer",
      index: true,
    },

    /* ================= FIELD META ================= */
    fieldKey: {
      type: String,
      required: true, // e.g. assignedAgents
      trim: true,
    },

    label: {
      type: String,
      required: true, // e.g. Assigned Agents
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "text",
        "number",
        "date",
        "select",
        "multiselect",
        "checkbox",
      ],
      required: true,
    },

    /* ================= DATA SOURCE ================= */
    // static = manual options
    // agents = load from agents collection
    source: {
      type: String,
      enum: ["static", "agents"],
      default: "static",
    },

    /* ================= OPTIONS ================= */
    // for select / multiselect (static)
    options: [
      {
        label: { type: String },
        value: { type: String },
      },
    ],

    required: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
    },

    /* ================= SOFT ENABLE / DISABLE ================= */
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* ================= UNIQUE CONSTRAINT =================
   Same company + module + fieldKey allowed only once
======================================================= */
CustomFieldSchema.index(
  { companyId: 1, module: 1, fieldKey: 1 },
  { unique: true }
);

export default mongoose.models.CustomField ||
  mongoose.model("CustomField", CustomFieldSchema);
