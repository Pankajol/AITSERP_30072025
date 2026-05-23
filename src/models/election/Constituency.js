// models/election/Constituency.js
import mongoose from 'mongoose';

const ConstituencySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  type: { type: String,   enum: [
    "Lok Sabha",          // लोकसभा
    "Vidhan Sabha", 
    "Nagar Panchayat",    // नगर पंचायत
    "Municipal Corporation", // नगर निगम
    "Zila Parishad",      // जिला परिषद
    
    "Jila Panchayat",     // जिला पंचायत
    "Pradhani",           // प्रधानी
    "BDC",                // ब्लॉक डेवलपमेंट कमिटी
    "Ward",               // वार्ड (नगर निगम)
    "Other"               // कोई अन्य
  ], required: true },
  district: String,
  state: String,
  totalVoters: { type: Number, default: 0 },
  // भौगोलिक बाउंड्री (GeoJSON) – भविष्य के लिए
  booths: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booth' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

// 🔧 2dsphere index temporarily disabled to avoid errors when coordinates are empty
// Uncomment when all documents have valid coordinate arrays
// ConstituencySchema.index({ boundary: '2dsphere' });

export default mongoose.models.Constituency || mongoose.model('Constituency', ConstituencySchema);