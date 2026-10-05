import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import Field from '@/lib/models/Field';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Đọc các biến cấu hình từ biến môi trường
    const rawOwnerPassword = process.env.DEFAULT_OWNER_PASSWORD;
    const rawStaffPassword = process.env.DEFAULT_STAFF_PASSWORD;
    const ownerEmail = process.env.DEFAULT_OWNER_EMAIL;
    const ownerPhone = process.env.DEFAULT_OWNER_PHONE;
    const staffEmail = process.env.DEFAULT_STAFF_EMAIL;
    const staffPhone = process.env.DEFAULT_STAFF_PHONE;
    const seedSecretKey = process.env.SEED_SECRET_KEY;

    // Kiểm tra tính đầy đủ của cấu hình máy chủ
    if (
      !rawOwnerPassword ||
      !rawStaffPassword ||
      !ownerEmail ||
      !ownerPhone ||
      !staffEmail ||
      !staffPhone ||
      !seedSecretKey
    ) {
      return NextResponse.json(
        {
          message:
            'Lỗi cấu hình máy chủ: Thiếu các biến môi trường nhạy cảm trong file môi trường (.env.local hoặc Vercel Environment Variables).',
        },
        { status: 500 }
      );
    }

    // 2. Kiểm tra mã khóa truy cập bảo vệ qua URL (?key=...)
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== seedSecretKey) {
      return NextResponse.json(
        { message: 'Từ chối truy cập! Khóa bảo mật không chính xác.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // 3. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedOwnerPassword = await bcrypt.hash(rawOwnerPassword, salt);
    const hashedStaffPassword = await bcrypt.hash(rawStaffPassword, salt);

    // 4. Khởi tạo / cập nhật tài khoản Chủ sân (OWNER)
    let owner = await User.findOne({ email: ownerEmail });
    if (!owner) {
      owner = await User.create({
        name: 'Chủ Sân Tuyên Sơn',
        email: ownerEmail,
        password: hashedOwnerPassword,
        phone: ownerPhone,
        role: 'OWNER',
      });
    } else {
      owner.password = hashedOwnerPassword;
      owner.phone = ownerPhone;
      await owner.save();
    }

    // 5. Khởi tạo / cập nhật tài khoản Nhân viên (STAFF)
    let staff = await User.findOne({ email: staffEmail });
    if (!staff) {
      staff = await User.create({
        name: 'Nhân Viên Lễ Tân',
        email: staffEmail,
        password: hashedStaffPassword,
        phone: staffPhone,
        role: 'STAFF',
      });
    } else {
      staff.password = hashedStaffPassword;
      staff.phone = staffPhone;
      await staff.save();
    }

    // 6. Danh sách sân con chuẩn hóa ID
    const subFieldsData = [
      { id: 'san-5a', name: 'Sân 5A', type: '5', pricePerHour: 250000, isActive: true },
      { id: 'san-5b', name: 'Sân 5B', type: '5', pricePerHour: 250000, isActive: true },
      { id: 'san-5c', name: 'Sân 5C', type: '5', pricePerHour: 250000, isActive: true },
      { id: 'san-7a1', name: 'Sân 7A1', type: '7', pricePerHour: 350000, isActive: true },
      { id: 'san-7a2', name: 'Sân 7A2', type: '7', pricePerHour: 350000, isActive: true },
      { id: 'san-7b1', name: 'Sân 7B1', type: '7', pricePerHour: 350000, isActive: true },
      { id: 'san-7b2', name: 'Sân 7B2', type: '7', pricePerHour: 350000, isActive: true },
      { id: 'san-7c1', name: 'Sân 7C1', type: '7', pricePerHour: 350000, isActive: true },
      { id: 'san-7c2', name: 'Sân 7C2', type: '7', pricePerHour: 350000, isActive: true },
    ];

    // 7. Khởi tạo / cập nhật thông tin Cụm Sân Tuyên Sơn
    const fieldCode = 'TUYEN_SON_DN';
    let field = await Field.findOne({ code: fieldCode });

    if (!field) {
      field = await Field.create({
        name: 'Làng Thể Thao Tuyên Sơn',
        code: fieldCode,
        address: 'Số 02 Đường 2 Tháng 9, Hải Châu, Đà Nẵng',
        phone: ownerPhone,
        subFields: subFieldsData,
      });
    } else {
      field.subFields = subFieldsData as any;
      field.phone = ownerPhone;
      await field.save();
    }

    return NextResponse.json({
      message: 'Khởi tạo dữ liệu mẫu cụm sân Tuyên Sơn thành công!',
      accounts: [
        { role: 'OWNER', email: ownerEmail },
        { role: 'STAFF', email: staffEmail },
      ],
      field: {
        name: field.name,
        totalSubFields: field.subFields.length,
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi seed data:', error);
    return NextResponse.json(
      { message: 'Khởi tạo dữ liệu thất bại', error: error.message },
      { status: 500 }
    );
  }
}