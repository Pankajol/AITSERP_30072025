import mongoose from "mongoose";

const TicketFeedbackSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      unique: true, // 🔒 ONE FEEDBACK PER TICKET
      index: true,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
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
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
  },
  { timestamps: true }
);

export default mongoose.models.TicketFeedback ||
  mongoose.model("TicketFeedback", TicketFeedbackSchema);
