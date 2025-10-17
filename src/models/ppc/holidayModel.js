import mongoose from 'mongoose';

/**
 * HolidaySchema defines the structure for storing holiday information in the database.
 * This model is crucial for the Production Planning and Control (PPC) module to
 * accurately schedule production orders by accounting for non-working days.
 */
const HolidaySchema = new mongoose.Schema(
  {
    /**
     * The official name of the holiday.
     * e.g., "New Year's Day", "Independence Day"
     */
    companyId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'companyUser',
    },
    name: {
      type: String,
      required: [true, 'Please provide a name for the holiday'],
      trim: true, // Removes whitespace from both ends of a string
    },

    /**
     * The specific date of the holiday.
     * This field must be unique to prevent duplicate holiday entries for the same day.
     */
    date: {
      type: Date,
      required: [true, 'Please provide a date for the holiday'],
  // Ensures no two documents can have the same date
    },

    /**
     * A brief description or note about the holiday.
     * e.g., "National holiday celebrating the new year."
     */
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },

    /**
     * The type of holiday, which can help in filtering and applying rules.
     * - 'national': A public holiday observed nationwide.
     * - 'regional': A holiday specific to a certain state or region.
     * - 'company': A specific holiday observed only by the company.
     */
    holidayType: {
        type: String,
      
        default: 'national',
    }
  },
  {
    /**
     * Mongoose options.
     * - timestamps: true automatically adds `createdAt` and `updatedAt` fields
     * to the schema, which is useful for auditing and tracking changes.
     */
    timestamps: true,
  }
);

/**
 * The Holiday model.
 *
 * Mongoose prevents recompiling the model if it already exists.
 * This is important in a Next.js environment where files can be re-evaluated
 * during development with hot-reloading. `mongoose.models.Holiday` checks if the
 * model is already compiled. If not, `mongoose.model('Holiday', HolidaySchema)`
 * compiles it.
 */
export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

