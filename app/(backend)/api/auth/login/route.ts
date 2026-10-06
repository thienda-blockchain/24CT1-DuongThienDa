import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    // 1. Kết nối cơ sở dữ liệu
    await connectToDatabase();

    // 2. Lấy email và password từ request body
    const body = await request.json();
    const { email, password } = body;

    // 3. Kiểm tra dữ liệu bắt buộc
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    // 4. Tìm kiếm người dùng trong cơ sở dữ liệu
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 5. So khớp mật khẩu nhập vào với mật khẩu đã băm (hash)
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    // 6. Tạo JWT Token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET chưa được cấu hình trong .env.local');
    }

    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '7d' } // Token có hạn trong 7 ngày
    );

    // 7. Trả token và thông tin người dùng về cho client
    return NextResponse.json(
      {
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Lỗi khi đăng nhập:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}