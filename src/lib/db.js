// lib/mongoose.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB Connected');
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
// import mongoose from 'mongoose';

// const connectDb = async () => {
//   if (mongoose.connections[0].readyState) {
//     console.log('Already connected to MongoDB');
//     return;
//   }

//   try {
//     await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('MongoDB Connected');
//   } catch (error) {
//     console.error('Database Connection Error:', error.message);

//     // Provide additional information
//     if (error.name === 'MongoServerError') {
//       console.error('Ensure that your MongoDB URI, username, and password are correct.');
//     }

//     throw new Error('Database connection failed');
//   }
// };

// export default connectDb;

