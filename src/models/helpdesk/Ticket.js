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
        return this.senderType !== "customer";
      },
    },

    externalEmail: {
      type: String,
    },


    
    message: {
      type: String,
      required: true,
    },
        // 🔥 NEW (Graph ID – used for reply + threading)
    // 🔥 Outlook Graph ID (REPLY uses this)
    graphMessageId: { type: String, index: true },

    // 🔁 Internet RFC id (reference only)
    internetMessageId: { type: String, index: true },

    // legacy search
    messageId: { type: String, index: true },

    // optional – for reference only
 
    attachments: [
      {
        filename: String,
        url: String,
        publicId: String,
        contentType: String,
        size: Number
      },
    ],

    fromEmail: String,
    toEmail: String,
    messageId: String,
    inReplyTo: String,

    aiSuggested: {
      type: Boolean,
      default: false,
    },
   

    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
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
    ticketNo: {
      type: String,
     
      unique: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    customerEmail: {
      type: String,
      required: true,
      index: true,
    },

    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      default: null,
      index: true,
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
      enum: ["open", "closed", "pending", "in-progress"],
      default: "open",
      index: true,
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

    // ✅ IMPORTANT – SLA & AUTO CLOSE
    lastReplyAt: {
      type: Date,
      default: Date.now,
    },
      emailAlias: {type: String},
    lastCustomerReplyAt: {
      type: Date,
      default: null,
    },

    lastAgentReplyAt: {
      type: Date,
      default: null,
    },

    autoClosed: {
      type: Boolean,
      default: false,
    },

    emailThreadId: {
      type: String,
      required: true,
      index: true,
    },

    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },

    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    feedbackSentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: null,
    },
  },
  { timestamps: true }
);

TicketSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const date = new Date();
    const currentYear = date.getFullYear();

    // 1. Shortname Generator
    // Agar Pankaj Law hai toh PKLW, Sandeep hai toh SANC
    const rawName = this.customerId?.customerName || "SUPPORT";
    
    // Logic: Pehle 4 characters uthayega aur symbols/spaces ko remove karega
    const shortName = rawName
      .replace(/[^a-zA-Z]/g, "") // Sirf letters rakhega
      .substring(0, 4)
      .toUpperCase();

    // 2. Iss specific shortname aur year ka latest ticket check karna
    const lastTicket = await mongoose.model("Ticket").findOne({
      ticketNo: new RegExp(`^${shortName}/${currentYear}/`)
    }).sort({ createdAt: -1 });

    let newSequence = "0001";

    if (lastTicket && lastTicket.ticketNo) {
      // Last part nikal kar increment karna
      const parts = lastTicket.ticketNo.split("/");
      const lastNum = parseInt(parts[parts.length - 1]);
      newSequence = (lastNum + 1).toString().padStart(4, "0");
    }

    // 3. Final Format: PKLW/2026/0001
    this.ticketNo = `${shortName}/${currentYear}/${newSequence}`;
    
    next();
  } catch (err) {
    next(err);
  }
});

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
