'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyBookingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // 1. Kiểm tra đăng nhập
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      window.location.href = '/login';
      return;
    }
    try {
      const u = JSON.parse(savedUser);
      setCurrentUser(u);
      fetchMyBookings(u.id);
    } catch {
      window.location.href = '/login';
    }
  }, []);

  // 2. Tải danh sách đơn đặt
  const fetchMyBookings = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/my-bookings?userId=${userId}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử đơn:', err);
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <Link href="/" className="text-xl sm:text-2xl font-black tracking-tight hover:text-emerald-100">
              SÂN BÓNG TUYÊN SƠN
            </Link>
            <p className="text-xs text-emerald-100">Lịch sử đặt sân thi đấu</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs sm:text-sm px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 rounded-lg text-white font-medium transition"
            >
              ← Về trang đặt sân
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs px-2.5 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Danh Sách Ca Đấu Của Tôi</h2>
              <p className="text-xs text-gray-500">
                Tài khoản: <strong className="text-emerald-700">{currentUser?.name}</strong> ({currentUser?.email})
              </p>
            </div>
            <button
              onClick={() => currentUser?.id && fetchMyBookings(currentUser.id)}
              className="self-start sm:self-auto text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
            >
              ↻ Làm mới danh sách
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs text-gray-400">
              Đang tải danh sách đơn đặt của bạn...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-semibold text-gray-600 mb-1">Bạn chưa có đơn đặt sân nào!</p>
              <p className="text-xs text-gray-400 mb-4">Hãy quay lại trang chủ để chọn sân và khung giờ thi đấu.</p>
              <Link
                href="/"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
              >
                Đặt sân ngay
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {bookings.map((b) => {
                const isPaid = b.paymentStatus === 'PAID';
                return (
                  <div
                    key={b._id}
                    className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 transition bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Cột thông tin sân & ngày giờ */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 text-base">{b.subFieldName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          Sân {b.subFieldType} người
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3">
                        <span>
                          📅 Ngày đá: <strong className="text-gray-900">{b.bookingDate}</strong>
                        </span>
                        <span>
                          ⏰ Khung giờ: <strong className="text-gray-900">{b.startTime} - {b.endTime}</strong>
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Mã đơn: <span className="font-mono text-gray-600">{b._id}</span>
                      </p>
                    </div>

                    {/* Cột giá tiền & trạng thái */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 gap-2">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-gray-400 block">Tổng tiền sân</span>
                        <span className="text-base font-extrabold text-emerald-700">
                          {b.totalPrice?.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            ✓ ĐÃ XÁC NHẬN
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            ⏳ CHỜ DUYỆT TIỀN
                          </span>
                        )}

                        {b.paymentProofUrl && (
                          <button
                            onClick={() => setSelectedProof(b.paymentProofUrl)}
                            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg transition"
                          >
                            Xem bill
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal phóng to ảnh biên lai */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl text-center">
            <h3 className="font-bold text-gray-900 text-sm mb-2">Ảnh Biên Lai Của Bạn</h3>
            <div className="bg-gray-100 rounded-lg p-2 max-h-[60vh] overflow-auto mb-3">
              <img
                src={selectedProof}
                alt="Biên lai"
                className="max-h-[50vh] mx-auto rounded object-contain"
              />
            </div>
            <button
              onClick={() => setSelectedProof(null)}
              className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}