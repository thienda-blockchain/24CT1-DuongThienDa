'use client'; // Bắt buộc: Báo cho Next.js biết đây là trang có tương tác người dùng (nhập phím, click chuột)

import { useState } from 'react';
import Link from 'next/link'; // Dùng để chuyển trang mượt mà không bị reload
import { useRouter } from 'next/navigation'; // Dùng để chuyển hướng trang bằng code

export default function RegisterPage() {
  const router = useRouter(); // Khởi tạo router để sau này chuyển trang

  // 1. Tạo 1 biến object chứa toàn bộ dữ liệu form người dùng nhập
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // 2. Tạo biến lưu thông báo lỗi (nếu có lỗi thì hiển thị lên màn hình)
  const [error, setError] = useState('');

  // 3. Tạo biến cờ xem form có đang trong quá trình gửi đi hay không (để khóa nút bấm)
  const [loading, setLoading] = useState(false);

  // Hàm này sẽ tự động được gọi khi người dùng nhấn phím Enter hoặc click nút Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CỰC KỲ QUAN TRỌNG: Chặn trình duyệt tự reload lại trang theo kiểu web cổ điển
    setError(''); // Xóa thông báo lỗi cũ nếu có

    // . Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không đúng định dạng (Ví dụ: cauthu@gmail.com)');
      return; // Dừng lại ngay trên trình duyệt, không gửi yêu cầu đi
    }

    // 2. Kiểm tra mật khẩu
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự!');
      return;
    }

    // Sau đó mới đến setLoading(true) và gọi fetch...
    // Bước 2: Bật trạng thái đang tải (Loading)
    setLoading(true);

    try {
      // Bước 3: Gửi dữ liệu sang API Backend mà chúng ta đã test bằng cURL lúc nãy
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      // Nếu API trả về mã lỗi (400, 409, 500...)
      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký thất bại!');
      }

      // Nếu thành công (mã 201)
      alert('Đăng ký tài khoản thành công!');
      router.push('/login'); // Chuyển ngay sang trang đăng nhập
    } catch (err: any) {
      // Nếu có lỗi, đưa câu thông báo lỗi vào biến error để hiện ra ngoài web
      setError(err.message);
    } finally {
      setLoading(false); // Tắt trạng thái xoay vòng/loading dù thành công hay thất bại
    }

    
  };

  return (
    // 1. Thẻ bao bọc toàn màn hình: Căn giữa dọc + ngang
    <div className="min-h-screen flex items-center justify-center bg-green-200 px-5 py-12">
      
      {/* 2. Khối thẻ Card màu trắng: Chiều rộng tối đa 448px (max-w-md), đổ bóng, bo tròn viền */}
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        
        {/* Tiêu đề trang */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Sân Bóng Tuyên Sơn
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Tạo tài khoản để đặt sân và chọn lịch thi đấu
          </p>
        </div>

        {/* Khung báo lỗi: Chỉ xuất hiện khi biến error có chữ */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* 3. Thẻ FORM: Gắn sự kiện onSubmit với hàm handleSubmit đã viết ở Phần 2 */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          {/* Ô nhập họ tên */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black"
              placeholder="VD: Nguyễn Văn Cầu Thủ"
              value={formData.name}
              // Khi người dùng gõ phím -> Cập nhật trường name trong formData
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Ô nhập Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Địa chỉ Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black"
              placeholder="cauthu@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Ô nhập Số điện thoại */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              type="tel"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black"
              placeholder="0905xxxxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* Ô nhập Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black"
              placeholder="Tối thiểu 6 ký tự"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {/* Ô Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-black"
              placeholder="Nhập lại mật khẩu trên"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          {/* Nút bấm Submit: Đổi màu xanh lá cây đại diện sân cỏ (emerald) */}
          <button
            type="submit"
            disabled={loading} // Đang gửi thì làm mờ và khóa nút không cho click tiếp
            className="w-full py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition duration-150"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        {/* Chuyển hướng sang trang đăng nhập */}
        <p className="text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}