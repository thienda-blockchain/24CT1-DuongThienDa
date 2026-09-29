import mongoose, { Schema, model, models } from 'mongoose';

// 1. Định nghĩa kiểu dữ liệu cho từng Sân con bên trong cụm sân
export interface ISubField {
  id: string;          // Ví dụ: 'san-5a', 'san-7a'
  name: string;        // Ví dụ: 'Sân 5 số 1', 'Sân 7 số 1'
  type: '5' | '7';     // Loại sân: Sân 5 người hoặc Sân 7 người
  pricePerHour: number;// Giá thuê mỗi giờ (VD: 250000 VNĐ)
  isActive: boolean;   // Trạng thái: đang mở cửa hay đang bảo trì cỏ
}

// 2. Định nghĩa kiểu dữ liệu cho toàn bộ Cụm sân
export interface IField {
  _id?: string;
  name: string;        // Tên cụm sân: Làng Thể Thao Tuyên Sơn
  code: string;        // Mã định danh: TUYEN_SON_DN
  address: string;     // Địa chỉ thực tế
  phone: string;       // Hotline hỗ trợ đặt sân
  subFields: ISubField[]; // Danh sách các sân con nhúng bên trong
  createdAt?: Date;
  updatedAt?: Date;
}

// 3. Schema cho từng Sân con
const SubFieldSchema = new Schema<ISubField>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['5', '7'], required: true },
  pricePerHour: { type: Number, required: true, default: 200000 },
  isActive: { type: Boolean, default: true },
});

// 4. Schema chính cho Cụm sân Tuyên Sơn
const FieldSchema = new Schema<IField>(
  {
    name: { 
      type: String, 
      required: [true, 'Tên cụm sân là bắt buộc'] 
    },
    code: { 
      type: String, 
      required: true, 
      unique: true // Mã duy nhất để nhận diện cụm sân
    },
    address: { 
      type: String, 
      required: true 
    },
    phone: { 
      type: String, 
      required: true 
    },
    subFields: [SubFieldSchema], // Nhúng mảng danh sách sân con vào
  },
  { timestamps: true }
);

// 5. Tránh lỗi nạp lại model trong Next.js
const Field = models.Field || model<IField>('Field', FieldSchema);

export default Field;