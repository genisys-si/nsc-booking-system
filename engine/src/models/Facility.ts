import mongoose, { Schema, Document } from 'mongoose';

export interface IAmenity {
  name: string;
  description?: string;
}

export interface IVenue {
  _id: mongoose.Types.ObjectId;
  name: string;
  capacity?: number;
  isBookable: boolean;
  amenities: IAmenity[];
}

export interface IFacility extends Document {
  name: string;
  location: string;
  managerIds: mongoose.Types.ObjectId[];
  venues: IVenue[];
}

const amenitySchema = new Schema<IAmenity>({
  name: { type: String, required: true },
  description: String,
});

const venueSchema = new Schema<IVenue>({
  name: { type: String, required: true },
  capacity: Number,
  isBookable: { type: Boolean, default: false },
  amenities: [amenitySchema],
});

const facilitySchema = new Schema<IFacility>({
  name: { type: String, required: true },
  location: String,
  managerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  venues: [venueSchema],
}, { timestamps: true });

export default mongoose.models.Facility || mongoose.model<IFacility>('Facility', facilitySchema);