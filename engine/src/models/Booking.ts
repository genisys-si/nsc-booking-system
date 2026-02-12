import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  facilityId: mongoose.Types.ObjectId;
  venueId: mongoose.Types.ObjectId;     // _id from facility.venues
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  amenities?: mongoose.Types.ObjectId[]; // array of amenity _ids
  basePrice?: number;  // calculated base (hours * pricePerHour)
  amenitySurcharge?: number;  //sum of amenity surcharges
  totalPrice?: number;  // base + surcharge
  invoiceId?: string;  //unique ID for receipt
  purpose?: string;
  attendees?: number;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

const bookingSchema = new Schema<IBooking>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId:  { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  venueId:     { type: Schema.Types.ObjectId, required: true },
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, required: true },
  status:      { type: String, enum: ['pending','confirmed','cancelled','rejected'], default: 'pending' },
  purpose:     String,
  attendees:   Number,
  contactName: String,
  contactEmail:String,
  notes:       String,
  amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],  
  basePrice: { type: Number, default: 0 },  // calculated base (hours * pricePerHour)
  amenitySurcharge: { type: Number, default: 0 },  //sum of amenity surcharges
  totalPrice: { type: Number, default: 0 },  // base + surcharge
  invoiceId: String,  //unique ID for receipt
}, { timestamps: true });

// Index for fast overlap queries
bookingSchema.index({ venueId: 1, startTime: 1, endTime: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);