import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAmenity {
  name: string;
  description?: string;
  surcharge?: number; 
}

export interface IVenue {
  _id: mongoose.Types.ObjectId;
  name: string;
  capacity?: number;
  isBookable: boolean;
  amenities: IAmenity[];
  images?: { url: string; alt: string }[]; // for future use
  pricePerHour?: number;
  pricePerDay?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFacility extends Document {
  name: string;
  location: string;
  managerIds: mongoose.Types.ObjectId[];
  venues: IVenue[];
  status: 'active' | 'inactive' | 'maintenance' | 'closed';
  coordinates?: { lat: number; lng: number };
  coverImage?: string;
  galleryImages?: string[];
  contactPhone: string;
  contactEmail: string;
  createdBy?: Types.ObjectId;
}

const amenitySchema = new Schema<IAmenity>({
  name: { type: String, required: true },
  description: String,
  surcharge: { type: Number, default: 0 }, 
});

const venueSchema = new Schema<IVenue>({
  name: { type: String, required: true },
  capacity: Number,
  isBookable: { type: Boolean, default: false },
  amenities: [amenitySchema],
  pricePerHour: { type: Number, default: 0 },
  pricePerDay: { type: Number, default: 0 },
  images: [{                    
    type: String,               
    alt: String,                
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const facilitySchema = new Schema<IFacility>({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'closed'],
    default: 'active',
  },
  coordinates: {
    type: { lat: Number, lng: Number },
    required: false,
  },
  coverImage: { type: String },                    // single cover photo
  galleryImages: [{ type: String }],
  managerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  contactPhone: String,
  contactEmail: String,
  venues: [venueSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Facility || mongoose.model<IFacility>('Facility', facilitySchema);