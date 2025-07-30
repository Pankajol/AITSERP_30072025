import mongoose from 'mongoose';
import Company from './Company';

const CounterSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);



// models/Counter.js
// import mongoose from 'mongoose';

// const CounterSchema = new mongoose.Schema({
//   id: { type: String, required: true, unique: true },
//   seq: { type: Number, default: 0 },
// });

// export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
