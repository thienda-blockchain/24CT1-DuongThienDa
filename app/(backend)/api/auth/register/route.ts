import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// Định nghĩa hàm xử lý phương thức HTTP POST
export async function POST(request: Request) {
  try {
    // 1. Kết nối cơ sở dữ liệu MongoDB Atlas
    await connectToDatabase();

    // 2. Đọc dữ liệu JSON gửi lên từ Client (đã loại bỏ phone)
    const body = await request.json();
    const { name, email, password } = body;

    // 3. Kiểm tra dữ liệu bắt buộc (Validation)
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu' },
        { status: 400 } // Lỗi 400: Bad Request
      );
    }

    // --- Kiểm tra định dạng Email chuẩn ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Định dạng email không hợp lệ (Ví dụ: name@example.com)' },
        { status: 400 }
      );
    }

    // 4. Kiểm tra xem Email đã được đăng ký trong CSDL chưa
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: `Email ${email} đã tồn tại` },
        { status: 409 } // Lỗi 409: Conflict (Trùng lặp dữ liệu)
      );
    }

    // 5. Băm mật khẩu (Hash Password) bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Lưu bản ghi mới vào cơ sở dữ liệu MongoDB
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'PLAYER', // Đăng ký mới mặc định luôn là Cầu thủ
    });

    // 7. Trả về kết quả thành công (Bảo mật: không trả lại password)
    return NextResponse.json(
      {
        message: 'Đăng ký tài khoản thành công',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 } // Mã 201: Created
    );
  } catch (error: any) {
    console.error('Lỗi khi gọi API Register:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 } // Lỗi 500: Internal Server Error
    );
  }
}