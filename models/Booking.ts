import mongoose, { Schema, model, models } from 'mongoose';

export interface IBooking {
  _id?: string;
  fieldId: mongoose.Types.ObjectId;
  subFieldId: string;
  userId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID';
  paymentMethod?: 'QR_TRANSFER' | 'CASH';
  paymentProofUrl?: string; // Lưu chuỗi ảnh biên lai (Base64)
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    fieldId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Field', 
      required: true 
    },
    subFieldId: { 
      type: String, 
      required: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      default: null 
    },
    customerName: { 
      type: String, 
      required: [true, 'Tên người đặt là bắt buộc'] 
    },
    customerPhone: { 
      type: String, 
      required: [true, 'Số điện thoại người đặt là bắt buộc'] 
    },
    bookingDate: { 
      type: String, 
      required: true 
    },
    startTime: { 
      type: String, 
      required: true 
    },
    endTime: { 
      type: String, 
      required: true 
    },
    totalPrice: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'CONFIRMED',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['QR_TRANSFER', 'CASH'],
      default: 'QR_TRANSFER',
    },
    paymentProofUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Booking = models.Booking || model<IBooking>('Booking', BookingSchema);

export default Booking;