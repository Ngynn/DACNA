import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import "../styles/DangNhap.css";

const DangNhap = () => {
  const [tendangnhap, setTendangnhap] = useState("");
  const [matkhau, setMatkhau] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Bắt đầu hiển thị Loading
    setError("");
    try {
      const response = await axios.post("http://localhost:3000/api/dangnhap", {
        tendangnhap,
        matkhau,
      });

      localStorage.setItem("tendangnhap", response.data.user.tendangnhap);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userRole", response.data.user.vaitro);
      localStorage.setItem("userId", response.data.user.idnguoidung);
      //console.log("JWT Token:", response.data.token);
      //console.log("Vai trò người dùng:", response.data.user.vaitro);

      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false); // Kết thúc Loading sau khi có phản hồi từ server
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-form">
          <h2>Đăng nhập</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={tendangnhap}
                onChange={(e) => setTendangnhap(e.target.value)}
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Mật khẩu"
                value={matkhau}
                onChange={(e) => setMatkhau(e.target.value)}
              />
            </div>
            <div className="options">
              <p onClick={() => navigate("/quenmatkhau")} className="forgot-password">
                Quên mật khẩu?
              </p>
            </div>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className="login-button"
            >
              {loading ? "Đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <div className="error-message">
            {error && <Typography >{error}</Typography>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangNhap;
