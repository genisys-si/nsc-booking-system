import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  phone: {type:String, trim:true},
  password: String, // hashed in production
  role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // managedFacilityId: { type: Schema.Types.ObjectId, ref: 'Facility' } // optional
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);