import mongoose from "mongoose";

/* =========================
   Ticket Message Schema
========================== */
const TicketMessageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["customer", "agent", "system"],
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: function () {
        return this.senderType !== "customer";   // customer email me id nahi hogi
      },
    },

    externalEmail: {
      type: String, // customer ka real email
    },

    message: {
      type: String,
      required: true,
    },

    attachments: [
      {
        filename: String,
        url: String,
      },
    ],

    fromEmail: String,
    toEmail: String,
    messageId: String, // Outlook message-id
    inReplyTo: String,

    aiSuggested: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =========================
   Ticket Main Schema
========================== */

const TicketSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    customerEmail: {
      type: String,
      required: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      default: null,
    },

    source: {
      type: String,
      enum: ["web", "email", "whatsapp"],
      default: "web",
    },

    subject: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: "general",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "waiting", "closed"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    messages: [TicketMessageSchema],

    summary: {
      type: String,
      default: "",
    },

    lastReplyAt: {
      type: Date,
      default: Date.now,
    },
     lastCustomerReplyAt,
  lastAgentReplyAt,
  autoClosed: Boolean,

    emailThreadId: String,

  },
  { timestamps: true }
);

export default mongoose.models.Ticket ||
  mongoose.model("Ticket", TicketSchema);



// import mongoose from "mongoose";

// const TicketMessageSchema = new mongoose.Schema(
//   {
//     sender: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
//     message: { type: String, required: true },
//     aiSuggested: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// const TicketSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     customerId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
//     agentId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
//     subject: { type: String, required: true },
//     category: { type: String, default: "general" },
//     status: { type: String, default: "open" },
//     priority: { type: String, default: "normal" },
//     messages: [TicketMessageSchema],
//     summary: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Ticket ||
//   mongoose.model("Ticket", TicketSchema);
