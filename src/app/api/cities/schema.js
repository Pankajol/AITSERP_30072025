import mongoose from 'mongoose';

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true }, // Reference to the State model
});

const City = mongoose.models.City || mongoose.model('City', CitySchema);
export default City;
