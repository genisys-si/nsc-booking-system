import mongoose, { Schema, Document } from 'mongoose';

export interface IStatusHistory {
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason?: string;
}
export interface IPayment {
  amount: number;
  method: string;           // "cash", "bank_transfer", "online", etc.
  date: Date;
  transactionId?: string;
  notes?: string;
  recordedBy: mongoose.Types.ObjectId; // who recorded it (admin/manager)
}



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
  bookingRef?: string; // human-friendly booking reference
  purpose?: string;
  attendees?: number;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  statusHistory: IStatusHistory[];
  payments: IPayment[];     // ← new array for payment history
  totalPaid: number;        // computed or stored sum of payments
  remainingBalance?: number; // optional, can be computed as totalPrice - totalPaid
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;     // "cash", "bank_transfer", "online", etc.
  paidAmount?: number;
  paymentDate?: Date;
  transactionId?: string;     // for future gateway (Stripe, PayPal, etc.)
}




const bookingSchema = new Schema<IBooking>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  facilityId: { type: Schema.Types.ObjectId, ref: 'Facility', required: true },
  venueId: { type: Schema.Types.ObjectId, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'rejected'], default: 'pending' },
  purpose: String,
  attendees: Number,
  contactName: String,
  contactEmail: String,
  notes: String,
  amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],
  basePrice: { type: Number, default: 0 },  // calculated base (hours * pricePerHour)
  amenitySurcharge: { type: Number, default: 0 },  //sum of amenity surcharges
  totalPrice: { type: Number, default: 0 },  // base + surcharge
  invoiceId: String,  //unique ID for receipt
  bookingRef: { type: String, index: true, unique: true, sparse: true },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
    },
  }],
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: String,
  paidAmount: Number,
  paymentDate: Date,
  transactionId: String,
  payments: [{
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    date: { type: Date, default: Date.now },
    transactionId: String,
    notes: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  }],

  totalPaid: { type: Number, default: 0 },
  remainingBalance: Number,

}, { timestamps: true });



// Index for faster queries on status changes
bookingSchema.index({ "statusHistory.changedAt": -1 });

// Index for fast overlap queries
bookingSchema.index({ venueId: 1, startTime: 1, endTime: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);