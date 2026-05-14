import mongoose from "mongoose";

const TicketFeedbackSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      unique: true,
      index: true,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser", // agent
      index: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    comment: {
      type: String,
      trim: true,
    },

    sentiment: {
      label: {
        type: String,
        enum: ["positive", "neutral", "negative"],
        default: "neutral",
      },
      score: {
        type: Number, // -1 to +1
        default: 0,
      },
    },

    source: {
      type: String,
      enum: ["email", "portal"],
      default: "email",
    },
  },
  { timestamps: true }
);

export default mongoose.models.TicketFeedback ||
  mongoose.model("TicketFeedback", TicketFeedbackSchema);
