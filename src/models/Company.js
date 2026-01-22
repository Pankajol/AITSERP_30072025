


    import mongoose from 'mongoose';

    const CompanySchema = new mongoose.Schema(
      {
        companyName: {
          type: String,
          required: true,
          trim: true,
        },
        contactName: {
          type: String,
          required: true,
          trim: true,
        },
        phone: {
          type: String,
          required: true,
          match: /^[0-9]{10}$/,
        },
        email: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
        },
    //     supportEmails: {
    //   type: [String],
    //   default: [],
    // },
    supportEmails: {
      type: [
        {
          email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
          },
          type: {
            type: String,
            enum: ["gmail", "outlook", "smtp"],
            default: "gmail",
          },
          appPassword: {
            type: String,
            required: true,
            select: false, // 🔐 security (GET me nahi aayega)
          },

          tenantId: {
        type: String,
        required: function () {
          return this.type === "outlook";
        },
      },

      clientId: {
        type: String,
        required: function () {
          return this.type === "outlook";
        },
      },

      webhookSecret: {
        type: String,
        required: function () {
          return this.type === "outlook";
        },
      },
          inboundEnabled: {
            type: Boolean,
            default: true,
          },
          outboundEnabled: {
            type: Boolean,
            default: true,
          },
          subscriptionId: { type: String },
subscriptionExpiresAt: { type: Date },

          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

        gstNumber: {
          type: String,
          unique: true,
          sparse: true, // optional field, but still enforce uniqueness if present
          uppercase: true,
          trim: true,
          match: /^[0-9A-Z]{15}$/,
        },
        country: {
          type: String,
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        pinCode: {
          type: String,
          required: true,
          match: /^[0-9]{6}$/,
        },
        password: {
          type: String,
          required: true,
        },
        agreeToTerms: {
          type: Boolean,
          default: false,
        },
      },
      { timestamps: true }
    );

    // Prevent model overwrite issue in development
    export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
