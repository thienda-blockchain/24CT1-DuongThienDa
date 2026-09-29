import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Field from '@/models/Field';

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      fieldId,
      subFieldId,
      userId,
      customerName,
      customerPhone,
      bookingDate,
      startTime,
      endTime,
      paymentMethod = 'QR_TRANSFER',
    } = body;

    if (
      !fieldId ||
      !subFieldId ||
      !customerName ||
      !customerPhone ||
      !bookingDate ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { message: 'Vui lòng cung cấp đầy đủ thông tin đặt sân!' },
        { status: 400 }
      );
    }

    const field = await Field.findById(fieldId);
    if (!field) {
      return NextResponse.json(
        { message: 'Không tìm thấy cụm sân bóng!' },
        { status: 404 }
      );
    }

    const subField = field.subFields.find((s: any) => s.id === subFieldId);
    if (!subField) {
      return NextResponse.json(
        { message: 'Không tìm thấy sân bóng con được chọn!' },
        { status: 404 }
      );
    }

    // Kiểm tra trùng lịch
    const existingBooking = await Booking.findOne({
      fieldId,
      subFieldId,
      bookingDate,
      startTime,
      status: { $ne: 'CANCELLED' },
    });

    if (existingBooking) {
      return NextResponse.json(
        { message: 'Khung giờ này vừa có người đặt trước. Vui lòng chọn ca khác!' },
        { status: 409 }
      );
    }

    const durationHours = 1.5;
    const totalPrice = Math.round(subField.pricePerHour * durationHours);

    // Lưu đơn đặt sân kèm trạng thái thanh toán
    const newBooking = await Booking.create({
      fieldId,
      subFieldId,
      userId: userId || null,
      customerName,
      customerPhone,
      bookingDate,
      startTime,
      endTime,
      totalPrice,
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      paymentMethod,
    });

    return NextResponse.json(
      {
        message: 'Tạo đơn đặt sân thành công!',
        booking: newBooking,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Lỗi khi đặt sân:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}