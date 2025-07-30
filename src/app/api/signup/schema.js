import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password:{type: String,required: true },
  country: { type: String, required: true },
  address: { type: String },
  pinCode: { type: String },
  agreeToTerms: { type: Boolean, required: true },
});

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
