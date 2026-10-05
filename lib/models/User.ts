import mongoose, { Schema, model, models } from 'mongoose';

// 1. Định nghĩa kiểu dữ liệu TypeScript (Interface) cho User
export interface IUser {
  _id?: string;  // (?): trường có thể để trống
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'PLAYER' | 'STAFF' | 'OWNER'; // Chỉ được 1 trong 3
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Định nghĩa Schema (Khuôn mẫu bảng dữ liệu) cho Mongoose
const UserSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: [true, 'Bắt buộc']  // Bắt buộc phải có giá trị
    },
    email: { 
      type: String, 
      required: [true, 'Bắt buộc'], 
      unique: true // Không cho phép 2 tài khoản trùng email
    },
    password: { 
      type: String, 
      required: [true, 'Mật khẩu là bắt buộc'] 
    },
    phone: { 
      type: String, 
      default: '' 
    },
    role: {
      type: String,
      enum: ['PLAYER', 'STAFF', 'OWNER'], // Chỉ được nhận 1 trong 3 giá trị này
      default: 'PLAYER', // Mặc định đăng ký mới là Cầu thủ
    },
  },
  { 
    timestamps: true // Tự động thêm 2 cột createdAt và updatedAt
  }
);

// 3. Tránh lỗi biên dịch lại Model trong môi trường Next.js
// Mỗi khi sửa code, Next.js sẽ nạp lại file, cú pháp mang nghĩa 
// "Nếu trong list models đã có User thì dùng lại cáid đó, chưa có thì tạo"
const User = models.User || model<IUser>('User', UserSchema);

export default User;