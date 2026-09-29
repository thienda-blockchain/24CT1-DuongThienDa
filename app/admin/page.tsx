'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIME_SLOTS = [
  { start: '05:30', end: '06:30', label: '05:30 - 06:30' },
  { start: '06:30', end: '07:30', label: '06:30 - 07:30' },
  { start: '07:30', end: '08:30', label: '07:30 - 08:30' },
  { start: '08:30', end: '09:30', label: '08:30 - 09:30' },
  { start: '15:30', end: '16:30', label: '15:30 - 16:30' },
  { start: '16:30', end: '17:30', label: '16:30 - 17:30' },
  { start: '17:30', end: '18:30', label: '17:30 - 18:30' },
  { start: '18:30', end: '19:30', label: '18:30 - 19:30' },
  { start: '19:30', end: '20:30', label: '19:30 - 20:30' },
  { start: '20:30', end: '21:30', label: '20:30 - 21:30' },
  { start: '21:30', end: '22:30', label: '21:30 - 22:30' },
];

export default function AdminPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split('T')[0];

  // State xác thực và phân quyền
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // State dữ liệu sân và danh sách đơn
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [fieldData, setFieldData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State form đặt tại quầy cho khách vãng lai
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInSubFieldId, setWalkInSubFieldId] = useState('');
  const [walkInSlot, setWalkInSlot] = useState(TIME_SLOTS[2].start);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State xem ảnh bill phóng to
  const [viewingProof, setViewingProof] = useState<{ name: string; proofUrl: string; bookingId: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Kiểm tra vai trò
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }

    try {
      const u = JSON.parse(savedUser);
      if (u.role !== 'STAFF' && u.role !== 'OWNER') {
        alert('Tài khoản cầu thủ không có quyền truy cập trang quản trị!');
        window.location.href = '/';
        return;
      }
      setCurrentUser(u);
    } catch {
      window.location.href = '/login';
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // 2. Tải danh sách đơn đặt trong ngày
  const loadData = async (date: string) => {
    setLoading(true);
    try {
      // Thêm timestamp để chống cache trình duyệt
      const res = await fetch(`/api/fields/availability?date=${date}&t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) {
        setFieldData(data.field);
        setBookings(data.bookings || []);
        if (data.field?.subFields?.length > 0 && !walkInSubFieldId) {
          setWalkInSubFieldId(data.field.subFields[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      loadData(selectedDate);
    }
  }, [authChecked, selectedDate]);

  // 3. Xử lý đặt tại quầy (mặc định đã thanh toán tiền mặt)
  const handleWalkInBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldData) return;

    setSubmitting(true);
    setMessage(null);

    const chosenSlot = TIME_SLOTS.find((s) => s.start === walkInSlot);
    if (!chosenSlot) return;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: fieldData.id,
          subFieldId: walkInSubFieldId,
          userId: null,
          customerName: walkInName.trim(),
          customerPhone: walkInPhone.trim(),
          bookingDate: selectedDate,
          startTime: chosenSlot.start,
          endTime: chosenSlot.end,
          paymentMethod: 'CASH',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đặt sân tại quầy thất bại!');
      }

      setMessage({ type: 'success', text: `Ghi nhận thành công cho khách ${walkInName}!` });
      setWalkInName('');
      setWalkInPhone('');
      await loadData(selectedDate);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Cập nhật trạng thái thanh toán (Duyệt bill chuyển khoản)
  // Cập nhật trạng thái thanh toán (Duyệt bill chuyển khoản)
  const handleConfirmPayment = async (bookingId: string) => {
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });

      const data = await res.json();

      if (res.ok) {
        // Cập nhật state trực tiếp ngay trên màn hình mà không cần chờ fetch
        setBookings((prev) =>
          prev.map((item) =>
            item._id === bookingId ? { ...item, paymentStatus: 'PAID' } : item
          )
        );

        if (viewingProof?.bookingId === bookingId) {
          setViewingProof(null);
        }
      } else {
        alert(data.message || 'Cập nhật trạng thái thất bại');
      }
    } catch (err: any) {
      console.error('Lỗi khi duyệt bill:', err);
      alert('Có lỗi xảy ra: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // 5. Hủy đơn đặt sân (nếu khách bùng kèo)
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn đặt sân này không?')) return;
    setUpdatingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        await loadData(selectedDate);
      }
    } catch (err) {
      console.error('Lỗi khi hủy đơn:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // 6. Đăng xuất triệt để
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
        Đang kiểm tra quyền hạn nhân viên...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header Quản Trị */}
      <header className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="bg-emerald-500 text-slate-900 text-xs font-bold px-2.5 py-1 rounded">
              {currentUser?.role}
            </span>
            <div>
              <h1 className="text-lg font-bold">Bảng Điều Khiển Lễ Tân - Sân Tuyên Sơn</h1>
              <p className="text-xs text-slate-400">Nhân viên trực: {currentUser?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs text-slate-300 hover:text-white underline"
            >
              Xem trang khách
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: Form ghi nhận khách tại quầy */}
        <div className="lg:col-span-1">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-1">
              Ghi Nhận Khách Vãng Lai
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Dành cho khách gọi điện hoặc đến đặt trực tiếp tại quầy
            </p>

            {message && (
              <div
                className={`p-3 rounded-lg text-xs font-medium mb-3 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleWalkInBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Tên khách / Đội bóng</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: FC Bách Khoa"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  required
                  placeholder="0905xxxxxx"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Chọn Sân con</label>
                <select
                  value={walkInSubFieldId}
                  onChange={(e) => setWalkInSubFieldId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {fieldData?.subFields?.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.pricePerHour.toLocaleString('vi-VN')} đ/h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Khung giờ đá</label>
                <select
                  value={walkInSlot}
                  onChange={(e) => setWalkInSlot(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {TIME_SLOTS.map((s, idx) => (
                    <option key={idx} value={s.start}>
                      Ca {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {submitting ? 'Đang tạo đơn...' : '+ Tạo Đơn Tại Quầy'}
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI: Danh sách các ca đá trong ngày & Xác nhận thanh toán */}
        <div className="lg:col-span-2">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Lịch Thi Đấu & Đối Soát Thanh Toán
                </h2>
                <p className="text-xs text-gray-500">
                  Tổng cộng: <span className="font-bold text-emerald-600">{bookings.length}</span> đơn đặt trong ngày
                </p>
              </div>
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs text-gray-500">
                Đang tải danh sách lịch đặt...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                Ngày {selectedDate} chưa có đội nào đặt sân.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <th className="py-2.5 px-3 font-semibold">Khung giờ / Sân</th>
                      <th className="py-2.5 px-3 font-semibold">Người đặt</th>
                      <th className="py-2.5 px-3 font-semibold">Thanh toán</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map((b: any) => {
                      const sub = fieldData?.subFields?.find((s: any) => s.id === b.subFieldId);
                      const isPaid = b.paymentStatus === 'PAID';

                      return (
                        <tr key={b._id} className="hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 block">
                              {b.startTime} - {b.endTime}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-medium">
                              {sub?.name || b.subFieldId}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-900 block">{b.customerName}</span>
                            <span className="text-[11px] text-gray-500">{b.customerPhone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              {isPaid ? (
                                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                  ✓ ĐÃ THANH TOÁN
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">
                                  CHỜ DUYỆT TIỀN
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 block mt-1">
                              {b.totalPrice?.toLocaleString('vi-VN')} đ
                            </span>
                            {/* Nút xem ảnh biên lai */}
                            {b.paymentProofUrl ? (
                              <button
                                onClick={() =>
                                  setViewingProof({
                                    name: b.customerName,
                                    proofUrl: b.paymentProofUrl,
                                    bookingId: b._id,
                                  })
                                }
                                className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold flex items-center gap-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block animate-ping"></span>
                                Xem ảnh Bill chuyển khoản
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 block mt-1">Chưa tải bill</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            {!isPaid && (
                              <button
                                onClick={() => handleConfirmPayment(b._id)}
                                disabled={updatingId === b._id}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition disabled:opacity-50"
                              >
                                {updatingId === b._id ? '...' : 'Duyệt tiền'}
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelBooking(b._id)}
                              disabled={updatingId === b._id}
                              className="px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL PHÓNG TO ẢNH BILL CHUYỂN KHOẢN ĐỂ ĐỐI SOÁT */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Biên lai chuyển khoản: {viewingProof.name}
              </h3>
              <button
                onClick={() => setViewingProof(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-100 rounded-xl p-2 flex justify-center max-h-[60vh] overflow-auto mb-4">
              <img
                src={viewingProof.proofUrl}
                alt="Biên lai đối soát"
                className="max-h-[55vh] w-auto rounded object-contain"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setViewingProof(null)}
                className="flex-1 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleConfirmPayment(viewingProof.bookingId)}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Xác nhận đúng bill & Duyệt tiền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}