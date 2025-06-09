import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App'; // Import UserContext
import { Switch, Typography, Button, Card, Box, Grid, TextField } from '@mui/material';

const CaiDat = () => {
    const navigate = useNavigate();
    const { mode, toggleTheme } = useContext(UserContext); // Lấy mode và toggleTheme từ context
    const [matkhauCu, setMatkhauCu] = useState("");
    const [matkhauMoi, setMatkhauMoi] = useState("");
    const [thongbao, setThongbao] = useState("");
    const userRole = localStorage.getItem('userRole'); // Lấy thông tin người dùng

    const handleLogout = () => {
        // Xóa thông tin người dùng khỏi localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('userToken'); // Nếu có token, xóa luôn
        // Chuyển hướng về trang đăng nhập
        navigate('/login');
    };

    const handleBackup = async () => {
    try {
        const res = await fetch("http://localhost:5000/api/backup", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });
        if (!res.ok) throw new Error("Lỗi khi sao lưu dữ liệu.");

        // hiển thị option download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();

        // lấy thời gian khi backup
        // định dạng tên file theo kiểu dulieu_YYYYMMDD_HHMMSS.sql
        const fileName = `dulieu_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}.sql`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Lỗi khi sao lưu:", error);
        alert("Lỗi khi sao lưu dữ liệu.");
    }
};

    const handleChangePassword = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/doimatkhau", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ matkhauCu, matkhauMoi }),
            });

            const data = await res.json();
            if (res.ok) {
                setThongbao("Đổi mật khẩu thành công.");
                setMatkhauCu("");
                setMatkhauMoi("");
            } else {
                setThongbao(data.message || "Có lỗi xảy ra.");
            }
        } catch (error) {
            console.error("Lỗi đổi mật khẩu:", error);
            setThongbao("Lỗi hệ thống.");
        }
    };

    return (
      <Box sx={{ padding: "20px", maxWidth: 600, margin: "auto" }}>
        <Card sx={{ padding: "20px", boxShadow: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ textAlign: "center", color: "primary.main" }}
          >
            Cài đặt
          </Typography>

          <Box sx={{ marginBottom: "20px" }}>
            <Typography
              variant="body1"
              sx={{ marginRight: "10px", display: "inline-block" }}
            >
              Chế độ: {mode === "light" ? "Sáng" : "Tối"}
            </Typography>
            <Switch
              checked={mode === "dark"}
              onChange={toggleTheme} // Gọi hàm toggleTheme khi người dùng thay đổi
            />
          </Box>

          <Grid container spacing={2} justifyContent="center">
            <Grid>
              <Button
                variant="contained"
                color="primary"
                onClick={handleLogout}
                sx={{ width: "200px" }} 
              >
                Đăng xuất
              </Button>
            </Grid>
            <Grid>
              {/* Chỉ hiển thị khi userRole là Admin */}
              {userRole === "Admin" && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleBackup}
                  sx={{ width: "200px" }} 
                >
                  Sao lưu dữ liệu
                </Button>
              )}
            </Grid>
          </Grid>

          <Box sx={{ marginTop: "20px" }}>
            <Typography variant="h6" gutterBottom>
              Đổi mật khẩu
            </Typography>
            <form // Dùn form để chặn Cảnh báo "Password field is not contained in a form"
              onSubmit={(e) => {
                e.preventDefault(); 
                handleChangePassword(); 
              }}
            >
              <TextField
                label="Mật khẩu cũ"
                type="password"
                fullWidth
                value={matkhauCu}
                onChange={(e) => setMatkhauCu(e.target.value)}
                sx={{ marginBottom: "10px" }}
              />
              <TextField
                label="Mật khẩu mới"
                type="password"
                fullWidth
                value={matkhauMoi}
                onChange={(e) => setMatkhauMoi(e.target.value)}
                sx={{ marginBottom: "10px" }}
              />
              <Button
                type="submit" 
                variant="contained"
                color="primary"
                fullWidth
              >
                Đổi mật khẩu
              </Button>
            </form>
            {thongbao && (
              <Typography
                variant="body2"
                sx={{ color: "red", marginTop: "10px", textAlign: "center" }}
              >
                {thongbao}
              </Typography>
            )}
          </Box>
        </Card>
      </Box>
    );
};

export default CaiDat;