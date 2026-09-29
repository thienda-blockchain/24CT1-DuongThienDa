'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Cấu hình tài khoản nhận tiền VietQR của sân Tuyên Sơn
const BANK_CONFIG = {
  BANK_ID: 'MB', // MB Bank
  ACCOUNT_NO: '0905123456',
  ACCOUNT_NAME: 'SAN BONG TUYEN SON',
};

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

export default function HomePage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [fieldData, setFieldData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal yêu cầu đăng nhập nếu chưa có tài khoản
  const [showAuthModal, setShowAuthModal] = useState(false);

  // State Modal đặt sân & thanh toán
  const [selectedSlot, setSelectedSlot] = useState<{
    subField: any;
    slot: { start: string; end: string; label: string };
  } | null>(null);

  const [modalStep, setModalStep] = useState<'FORM' | 'QR'>('FORM');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State xử lý tải ảnh biên lai
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.name) setCustomerName(u.name);
        if (u.phone) setCustomerPhone(u.phone);
      } catch (e) {
        console.error('Lỗi đọc user:', e);
      }
    }
  }, []);

  const fetchAvailability = async (date: string) => {
    setLoading(true);
    try {
      // Dùng cache: 'no-store' và timestamp chống cache tuyệt đối
      const res = await fetch(`/api/fields/availability?date=${date}&_t=${new Date().getTime()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setFieldData(data.field);
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sân:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate]);

  // Xác định trạng thái của khung giờ: AVAILABLE | PENDING | PAID
  const getSlotStatus = (subFieldId: string, slotStart: string) => {
    const matched = bookings.find(
      (b) =>
        String(b.subFieldId) === String(subFieldId) &&
        b.startTime === slotStart &&
        b.status !== 'CANCELLED'
    );
    if (!matched) return 'AVAILABLE';
    if (matched.paymentStatus === 'PAID') return 'PAID';
    return 'PENDING';
  };

  const handleOpenBooking = (subField: any, slot: any) => {
    // CHẶN BẮT BUỘC: Nếu chưa đăng nhập thì bật modal thông báo yêu cầu đăng nhập
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setCustomerName(currentUser.name || '');
    setCustomerPhone(currentUser.phone || customerPhone || '');
    setSelectedSlot({ subField, slot });
    setModalStep('FORM');
    setCreatedBooking(null);
    setBookingMessage(null);
    setProofImage(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setCustomerName('');
    setCustomerPhone('');
    window.location.href = '/login';
  };

  // Bước 1: Gửi thông tin đặt sân
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !fieldData) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setBookingMessage({ type: 'error', text: 'Vui lòng nhập họ tên và số điện thoại liên hệ!' });
      return;
    }

    setSubmitting(true);
    setBookingMessage(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: fieldData.id,
          subFieldId: selectedSlot.subField.id,
          userId: currentUser?.id || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          bookingDate: selectedDate,
          startTime: selectedSlot.slot.start,
          endTime: selectedSlot.slot.end,
          paymentMethod: 'QR_TRANSFER',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đặt sân không thành công');
      }

      setCreatedBooking(data.booking);
      setModalStep('QR');
      // Cập nhật lại lịch ngay để ô chuyển sang màu vàng (PENDING)
      await fetchAvailability(selectedDate);
    } catch (err: any) {
      setBookingMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Nén ảnh bằng Canvas trước khi tải lên
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProofImage(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
  };

  // Bước 2: Hoàn tất đơn và gửi ảnh biên lai
  const handleUploadProofAndComplete = async () => {
    if (!createdBooking) {
      handleCloseModal();
      return;
    }

    if (proofImage) {
      setUploadingProof(true);
      try {
        const res = await fetch(`/api/bookings/${createdBooking._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentProofUrl: proofImage }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Lỗi tải ảnh biên lai');
        }

        alert('Tải ảnh biên lai thành công! Đơn của bạn đang ở trạng thái chờ duyệt.');
      } catch (err: any) {
        console.error('Lỗi khi gửi ảnh:', err);
        alert('Không thể lưu ảnh biên lai: ' + err.message);
        setUploadingProof(false);
        return;
      } finally {
        setUploadingProof(false);
      }
    }

    // Tải lại lịch sân ngay để hiển thị màu vàng và đóng modal
    await fetchAvailability(selectedDate);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setSelectedSlot(null);
    setModalStep('FORM');
    setCreatedBooking(null);
    setBookingMessage(null);
    setProofImage(null);
  };

  const getVietQrUrl = () => {
    if (!createdBooking) return '';
    const amount = createdBooking.totalPrice;
    const memo = `DATSAN ${createdBooking._id.slice(-6).toUpperCase()}`;
    return `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      memo
    )}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SÂN BÓNG TUYÊN SƠN</h1>
            <p className="text-xs text-emerald-100">Đặt Sân & Cập Nhật Lịch Trực Tiếp</p>
          </div>
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs sm:text-sm font-medium">
                  Chào, <strong className="font-bold underline">{currentUser.name}</strong>
                </span>

                {/* Nút xem đơn đặt của tôi dành cho Cầu thủ */}
                <Link
                  href="/my-bookings"
                  className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white font-semibold transition"
                >
                  Lịch sử đặt
                </Link>

                {(currentUser.role === 'STAFF' || currentUser.role === 'OWNER') && (
                  <Link
                    href="/admin"
                    className="px-2.5 py-1 text-xs bg-emerald-800 hover:bg-emerald-900 rounded text-white font-medium"
                  >
                    Vào Quản Trị
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white font-medium transition"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-white text-emerald-800 rounded-lg hover:bg-emerald-50 transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6">
        {/* Bộ lọc ngày & Chú thích 3 màu */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">
              Chọn ngày thi đấu:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Chú thích 3 trạng thái */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <div className="flex items-center">
              <span className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-500 rounded mr-1.5 inline-block"></span>
              <span className="text-gray-700">Sân trống</span>
            </div>
            <div className="flex items-center">
              <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-400 rounded mr-1.5 inline-block"></span>
              <span className="text-amber-800 font-medium">Chờ duyệt tiền</span>
            </div>
            <div className="flex items-center">
              <span className="w-3.5 h-3.5 bg-red-100 border border-red-400 rounded mr-1.5 inline-block"></span>
              <span className="text-gray-600">Đã đặt (Đã duyệt)</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 bg-white p-10 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
            Đang tải dữ liệu sân bóng...
          </div>
        ) : (
          <div className="mt-6">
            {/* GIAO DIỆN DI ĐỘNG (Thẻ) */}
            <div className="block md:hidden space-y-4">
              {fieldData?.subFields?.map((sub: any) => (
                <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{sub.name}</h3>
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 mt-0.5">
                        Sân {sub.type} người
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Đơn giá</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {sub.pricePerHour.toLocaleString('vi-VN')} đ/h
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-gray-500 mb-2">Chọn khung giờ:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot, idx) => {
                      const status = getSlotStatus(sub.id, slot.start);

                      if (status === 'PAID') {
                        return (
                          <div
                            key={idx}
                            className="py-2.5 px-2 text-center rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200"
                          >
                            <span className="block font-semibold">{slot.label}</span>
                            <span className="text-[10px] text-red-500">Đã đặt</span>
                          </div>
                        );
                      }

                      if (status === 'PENDING') {
                        return (
                          <div
                            key={idx}
                            className="py-2.5 px-2 text-center rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-300"
                          >
                            <span className="block font-semibold">{slot.label}</span>
                            <span className="text-[10px] text-amber-600 font-bold">Chờ duyệt tiền...</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleOpenBooking(sub, slot)}
                          className="py-2.5 px-2 text-center rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-xs font-medium border border-emerald-300 transition"
                        >
                          <span className="block font-semibold">{slot.label}</span>
                          <span className="text-[10px] text-emerald-600 group-hover:text-white">Đặt ngay</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* GIAO DIỆN MÁY TÍNH (Bảng) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 font-bold text-gray-700 w-56">Tên Sân</th>
                      {TIME_SLOTS.map((slot, idx) => (
                        <th key={idx} className="p-4 font-semibold text-gray-600 text-center text-sm">
                          {slot.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fieldData?.subFields?.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{sub.name}</div>
                          <div className="text-xs text-emerald-600 font-medium">
                            {sub.pricePerHour.toLocaleString('vi-VN')} đ/h
                          </div>
                        </td>

                        {TIME_SLOTS.map((slot, idx) => {
                          const status = getSlotStatus(sub.id, slot.start);

                          return (
                            <td key={idx} className="p-2 text-center">
                              {status === 'PAID' ? (
                                <div className="bg-red-50 text-red-700 text-xs font-semibold py-3 px-2 rounded-lg border border-red-200 cursor-not-allowed">
                                  Đã đặt
                                </div>
                              ) : status === 'PENDING' ? (
                                <div className="bg-amber-50 text-amber-800 text-xs font-semibold py-3 px-2 rounded-lg border border-amber-300 cursor-not-allowed">
                                  Chờ duyệt tiền
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenBooking(sub, slot)}
                                  className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-semibold py-3 px-2 rounded-lg border border-emerald-200 transition"
                                >
                                  Đặt sân
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL CẢNH BÁO YÊU CẦU ĐĂNG NHẬP / ĐĂNG KÝ */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center animate-fadeIn">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🔒
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Yêu cầu Đăng nhập</h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Bạn cần đăng nhập hoặc tạo tài khoản để có thể đặt sân.
            </p>
            <div className="flex flex-col space-y-2">
              <Link
                href="/login"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Đăng nhập ngay
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs transition"
              >
                Tạo tài khoản mới
              </Link>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="pt-2 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Để sau, tôi muốn xem lịch tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐẶT SÂN & THANH TOÁN */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {modalStep === 'FORM' ? (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Xác nhận đặt sân
                </h3>
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs space-y-1 text-gray-700">
                  <p><span className="font-semibold">Sân:</span> {selectedSlot.subField.name}</p>
                  <p><span className="font-semibold">Ngày đá:</span> {selectedDate}</p>
                  <p><span className="font-semibold">Khung giờ:</span> {selectedSlot.slot.label}</p>
                  <p><span className="font-semibold">Tiền sân:</span> <span className="text-emerald-700 font-bold">{(selectedSlot.subField.pricePerHour * 1.5).toLocaleString('vi-VN')} đ</span></p>
                </div>

                {bookingMessage && (
                  <div className="p-3 rounded-lg text-xs font-medium mb-3 bg-red-50 text-red-600 border border-red-200">
                    {bookingMessage.text}
                  </div>
                )}

                <form onSubmit={handleConfirmBooking} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Họ và tên người đặt</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Số điện thoại liên hệ</label>
                    <input
                      type="tel"
                      required
                      placeholder="0905xxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {currentUser && (
                    <p className="text-[11px] text-emerald-600 italic">
                      * Đang đặt bằng tài khoản: {currentUser.email}
                    </p>
                  )}

                  <div className="flex space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={submitting}
                      className="flex-1 py-2.5 px-3 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 shadow-sm"
                    >
                      {submitting ? 'Đang tạo đơn...' : 'Tiếp tục thanh toán →'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* MÀN HÌNH QUÉT MÃ VIETQR & TẢI BIÊN LAI */
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-2">
                  Đã tạo đơn - Vui lòng chuyển khoản
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Quét mã VietQR để thanh toán
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Mở app ngân hàng bất kỳ để quét mã
                </p>

                <div className="flex justify-center mb-3">
                  <div className="p-2 border-2 border-dashed border-emerald-500 rounded-xl bg-white shadow-sm inline-block">
                    <img
                      src={getVietQrUrl()}
                      alt="VietQR Payment"
                      className="w-48 h-auto mx-auto rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 text-left space-y-1 mb-3">
                  <p><span className="font-semibold">Số tiền:</span> <span className="font-bold text-emerald-700">{createdBooking?.totalPrice?.toLocaleString('vi-VN')} đ</span></p>
                  <p><span className="font-semibold">Nội dung CK:</span> <span className="font-mono font-bold text-red-600">DATSAN {createdBooking?._id?.slice(-6).toUpperCase()}</span></p>
                  <p><span className="font-semibold">Chủ TK:</span> {BANK_CONFIG.ACCOUNT_NAME}</p>
                </div>

                {/* Ô tải ảnh biên lai */}
                <div className="mb-4 text-left border-t border-gray-100 pt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tải ảnh chụp màn hình chuyển khoản (để xác minh):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {proofImage && (
                    <div className="mt-2 text-center bg-gray-50 p-2 rounded-lg border border-emerald-200">
                      <img
                        src={proofImage}
                        alt="Biên lai đã chọn"
                        className="h-28 mx-auto rounded object-contain"
                      />
                      <p className="text-[10px] text-emerald-700 font-medium mt-1">✓ Đã chọn ảnh biên lai giao dịch</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={uploadingProof}
                  onClick={handleUploadProofAndComplete}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow disabled:opacity-50"
                >
                  {uploadingProof ? 'Đang tải biên lai lên...' : 'Hoàn tất & Đóng'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}