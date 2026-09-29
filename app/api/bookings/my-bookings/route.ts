import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Field from '@/models/Field';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'Vui lòng cung cấp mã người dùng (userId)!' },
        { status: 400 }
      );
    }

    // Lấy thông tin sân Tuyên Sơn để map tên sân con
    const field = await Field.findOne({ code: 'TUYEN_SON_DN' }).lean();

    // Tìm tất cả đơn đặt của user này, sắp xếp đơn mới nhất lên đầu
    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const formattedBookings = bookings.map((b: any) => {
      const sub = field?.subFields?.find((s: any) => String(s.id) === String(b.subFieldId));
      return {
        _id: b._id.toString(),
        subFieldName: sub?.name || `Sân con ${b.subFieldId}`,
        subFieldType: sub?.type || 5,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        totalPrice: b.totalPrice,
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        paymentProofUrl: b.paymentProofUrl || null,
        createdAt: b.createdAt,
      };
    });

    const response = NextResponse.json(
      { bookings: formattedBookings },
      { status: 200 }
    );
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    return response;
  } catch (error: any) {
    console.error('Lỗi khi lấy lịch sử đặt sân:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}