import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Field from '@/lib/models/Field';
import Booking from '@/lib/models/Booking';

// Ép Next.js không bao giờ cache kết quả API này
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { message: 'Vui lòng cung cấp ngày cần kiểm tra (date=YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // 1. Tìm thông tin sân
    const field = await Field.findOne({ code: 'TUYEN_SON_DN' });
    if (!field) {
      return NextResponse.json(
        { message: 'Không tìm thấy dữ liệu cụm sân Tuyên Sơn!' },
        { status: 404 }
      );
    }

    // 2. Tìm tất cả đơn đặt trong ngày chưa bị hủy
    const bookings = await Booking.find({
      fieldId: field._id,
      bookingDate: date,
      status: { $ne: 'CANCELLED' },
    }).lean();

    const response = NextResponse.json(
      {
        field: {
          id: field._id.toString(),
          name: field.name,
          address: field.address,
          subFields: field.subFields,
        },
        bookings: bookings.map((b: any) => ({
          _id: b._id.toString(),
          subFieldId: String(b.subFieldId), // Ép kiểu string chuẩn xác
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          startTime: b.startTime,
          endTime: b.endTime,
          totalPrice: b.totalPrice,
          status: b.status,
          paymentStatus: b.paymentStatus || 'PENDING',
          paymentProofUrl: b.paymentProofUrl || null,
        })),
      },
      { status: 200 }
    );

    // Chặn hoàn toàn trình duyệt lưu cache
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Lỗi API availability:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}