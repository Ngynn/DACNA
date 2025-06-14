import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/QuenMatKhau.css";

const QuenMatKhau = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleReset = async () => {
    try {
      await axios.post("http://localhost:3000/api/quenmatkhau", { email });
      alert("Yêu cầu khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.");
    } catch (err) {
      // Hiển thị thông báo lỗi chi tiết nếu có, hoặc lỗi chung
      alert(err.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="pw-page">
      <div className="pw-container">
        <div className="pw-form">
          <h2>Khôi phục mật khẩu</h2>
          <div className="input-group">
            <input
              type="text"
              placeholder="Nhập email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button onClick={handleReset}>Lấy lại mật khẩu</button>
          <p
            onClick={() => navigate("/login")}
            style={{ color: "blue", cursor: "pointer" }}
          >
            Quay lại trang đăng nhập
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuenMatKhau;
