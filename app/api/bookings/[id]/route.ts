import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Booking from '@/lib/models/Booking';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await connectToDatabase();

    // Hỗ trợ params cả dạng Promise (Next.js 15+) lẫn Object thông thường
    const resolvedParams = await Promise.resolve(context.params);
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'ID đơn đặt sân không hợp lệ!' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedUpdates: any = {};
    if (body.paymentProofUrl !== undefined) allowedUpdates.paymentProofUrl = body.paymentProofUrl;
    if (body.paymentStatus !== undefined) allowedUpdates.paymentStatus = body.paymentStatus;
    if (body.status !== undefined) allowedUpdates.status = body.status;

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return NextResponse.json(
        { message: 'Không tìm thấy đơn đặt sân!' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Cập nhật thành công!',
        booking: updatedBooking,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Lỗi PATCH booking:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ nội bộ', error: error.message },
      { status: 500 }
    );
  }
}