import React, { useState, useEffect } from "react";
import axios from "axios";
import XuatKhoPdf from "./xuatkho/XuatKhoPdf";
import DanhSachXuatKho from "./xuatkho/DanhSachXuatKho";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  TextField,
  Autocomplete,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useLocation } from "react-router-dom";

const XuatKho = () => {
  const [NguoiYeuCau, setNguoiYeuCau] = useState("");
  const [PhoneNguoiYeuCau, setPhoneNguoiYeuCau] = useState("");
  const [IDNguoiDung, setIDNguoiDung] = useState("");
  const [TenNguoiDung, setTenNguoiDung] = useState("");
  const [vatTuGroups, setVatTuGroups] = useState([]);
  const [currentVatTu, setCurrentVatTu] = useState({
    IDVatTu: "",
    TenVatTu: "",
    SoLuong: "",
    DonGia: "",
  });
  const [vatTuList, setVatTuList] = useState([]);
  const [nguoiDungList, setNguoiDungList] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phieuXuatKho, setPhieuXuatKho] = useState(null);
  const [open, setOpen] = useState(false);
  const location = useLocation();  // Sử dụng useLocation để lấy thông tin từ route

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const vatTuResponse = await axios.get(
          "http://localhost:3000/api/vattu",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const nguoiDungResponse = await axios.get(
          "http://localhost:3000/api/nguoidung",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setVatTuList(vatTuResponse.data);
        setNguoiDungList(nguoiDungResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // Hàm xử lý gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setPhieuXuatKho(null);

    // Kiểm tra nếu chưa có vật tư nào được thêm
    if (vatTuGroups.length === 0) {
      setError("Vui lòng thêm ít nhất một vật tư trước khi xuất kho.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const data = {
        vatTuGroups: vatTuGroups.map((group) => ({
          IDVatTu: parseInt(group.IDVatTu, 10),
          TenVatTu: group.TenVatTu,
          SoLuong: parseInt(group.SoLuong, 10),
        })),
        NguoiYeuCau,
        PhoneNguoiYeuCau,
        IDNguoiDung: parseInt(IDNguoiDung, 10),
      };

      // api
      const response = await axios.post("http://localhost:3000/xuatkho", data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMessage(response.data.message);
        setPhieuXuatKho(response.data.data);
        setVatTuGroups([]); // Xóa danh sách vật tư sau khi xuất kho thành công
        setNguoiYeuCau("");
        setPhoneNguoiYeuCau(""); // Reset sdt
        setIDNguoiDung("");
        setTenNguoiDung("");
      }
    } catch (err) {
      console.error("Error:", err);
      setError(
        err.response?.data?.message || "Có lỗi xảy ra khi kết nối đến server."
      );
    }
  };

  // Hàm thêm vật tư
  const handleAddVatTu = () => {
    if (
      currentVatTu.IDVatTu &&
      currentVatTu.TenVatTu &&
      currentVatTu.SoLuong &&
      currentVatTu.DonGia
    ) {
      // Kiểm tra nếu số lượng xuất <= 0
      if (parseInt(currentVatTu.SoLuong, 10) <= 0) {
        setError("Số lượng xuất phải lớn hơn 0!");
        return;
      }

      // Kiểm tra nếu số lượng xuất lớn hơn tồn kho
      if (parseInt(currentVatTu.SoLuong, 10) > currentVatTu.TonKhoHienTai) {
        setError("Số lượng xuất không được lớn hơn số lượng tồn kho!");
        return;
      }

      // Thêm vật tư vào danh sách nếu hợp lệ
      setVatTuGroups([...vatTuGroups, currentVatTu]);
      setCurrentVatTu({
        IDVatTu: "",
        TenVatTu: "",
        SoLuong: "",
        DonGia: "",
        TonKhoHienTai: 0,
        NgayHetHan: "",
      });
      setError(""); // Xóa lỗi nếu thêm thành công
    } else {
      setError("Vui lòng nhập đầy đủ thông tin vật tư!");
    }
  };

  // Hàm xóa vật tư
  const handleRemoveVatTu = (index) => {
    const updatedGroups = vatTuGroups.filter((_, i) => i !== index);
    setVatTuGroups(updatedGroups);
  };

  // Hàm mở form
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    // Hàm đóng form
    setOpen(false);
    setError(""); // Xóa lỗi khi đóng form
    setCurrentVatTu({
      IDVatTu: "",
      TenVatTu: "",
      SoLuong: "",
      DonGia: "",
      TonKhoHienTai: 0,
      NgayHetHan: "",
    }); // Reset thông tin vật tư hiện tại
    setNguoiYeuCau(""); // Reset người yêu cầu
    setPhoneNguoiYeuCau(""); // Reset số điện thoại người yêu cầu
    setIDNguoiDung(""); // Reset ID người dùng
    setTenNguoiDung(""); // Reset tên người dùng
  };

  return (
    <div>
      <h1>Xuất Kho</h1>

      <Button
        variant="contained"
        onClick={() => handleOpen()}
        style={{ background: "#28a745" }}
      >
        <AddCircleOutlineIcon style={{ marginRight: "5px" }} />
        Thêm xuất kho
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
        <DialogTitle>Thêm Xuất Kho</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
            <Grid container spacing={2}>
              {/* Bên trái */}
              <Grid>
                <Box sx={{ marginBottom: 2 }}>
                  <TextField
                    label="Người Yêu Cầu"
                    fullWidth
                    value={NguoiYeuCau}
                    onChange={(e) => setNguoiYeuCau(e.target.value)}
                    required
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <TextField
                    label="Số Điện Thoại Người Yêu Cầu"
                    fullWidth
                    value={PhoneNguoiYeuCau}
                    onChange={(e) => setPhoneNguoiYeuCau(e.target.value)}
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <Autocomplete
                    options={nguoiDungList}
                    getOptionLabel={(option) => option.idnguoidung.toString()}
                    value={
                      nguoiDungList.find(
                        (nd) => nd.idnguoidung === parseInt(IDNguoiDung)
                      ) || null
                    }
                    onChange={(e, newValue) => {
                      setIDNguoiDung(newValue ? newValue.idnguoidung : "");
                      setTenNguoiDung(newValue ? newValue.tendangnhap : "");
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="ID Người Dùng" required />
                    )}
                    fullWidth
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <Autocomplete
                    options={nguoiDungList}
                    getOptionLabel={(option) => option.tendangnhap}
                    value={
                      nguoiDungList.find(
                        (nd) => nd.tendangnhap === TenNguoiDung
                      ) || null
                    }
                    onChange={(e, newValue) => {
                      setTenNguoiDung(newValue ? newValue.tendangnhap : "");
                      setIDNguoiDung(newValue ? newValue.idnguoidung : "");
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Tên Người Dùng" required />
                    )}
                    fullWidth
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <Autocomplete
                    options={vatTuList.filter(
                      (vt) =>
                        vt.tonkhohientai > 0 &&
                        new Date(vt.ngayhethan) > new Date() // Lọc vật tư còn tồn kho và chưa hết hạn
                    )}
                    getOptionLabel={(option) => option.idvattu.toString()}
                    value={
                      vatTuList.find(
                        (vt) => vt.idvattu === parseInt(currentVatTu.IDVatTu)
                      ) || null
                    }
                    onChange={(e, newValue) => {
                      if (newValue) {
                        setCurrentVatTu({
                          ...currentVatTu,
                          IDVatTu: newValue ? newValue.idvattu : "",
                          TenVatTu: newValue ? newValue.tenvattu : "", // Xóa Tên nếu ID bị xóa
                          DonGia: newValue ? newValue.dongia : "",
                          TonKhoHienTai: newValue ? newValue.tonkhohientai : 0,
                          NgayHetHan: newValue ? newValue.ngayhethan : "",
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="ID Vật Tư" />
                    )}
                    fullWidth
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <Autocomplete
                    options={vatTuList.filter(
                      (vt) =>
                        vt.tonkhohientai > 0 &&
                        new Date(vt.ngayhethan) > new Date() // Lọc vật tư còn tồn kho và chưa hết hạn
                    )}
                    getOptionLabel={(option) => option.tenvattu}
                    value={
                      vatTuList.find(
                        (vt) => vt.tenvattu === currentVatTu.TenVatTu
                      ) || null
                    }
                    onChange={(e, newValue) => {
                      if (newValue) {
                        setCurrentVatTu({
                          ...currentVatTu,
                          IDVatTu: newValue ? newValue.idvattu : "", // Xóa ID nếu Tên bị xóa
                          TenVatTu: newValue ? newValue.tenvattu : "",
                          DonGia: newValue ? newValue.dongia : "",
                          TonKhoHienTai: newValue ? newValue.tonkhohientai : 0,
                          NgayHetHan: newValue ? newValue.ngayhethan : "",
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Tên Vật Tư" />
                    )}
                    fullWidth
                    sx={{ width: "500px" }}
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <TextField
                    label="Số Lượng"
                    type="number"
                    fullWidth
                    value={currentVatTu.SoLuong}
                    onChange={(e) =>
                      setCurrentVatTu({
                        ...currentVatTu,
                        SoLuong: e.target.value,
                      })
                    }
                    sx={{ width: "500px" }} // Đặt chiều rộng cụ thể
                  />
                </Box>
                <Box sx={{ marginBottom: 2 }}>
                  <TextField
                    label="Đơn Giá"
                    value={currentVatTu.DonGia || ""} // Hiển thị Đơn Giá
                    disabled
                    fullWidth
                    sx={{ width: "500px" }}
                  />
                </Box>
                {/* Hiển thị dòng chữ nhỏ */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center", // Căn giữa theo chiều dọc
                    marginTop: "10px",
                  }}
                >
                  <p
                    style={{
                      color: currentVatTu.TonKhoHienTai ? "green" : "grey",
                      margin: 0,
                    }}
                  >
                    {currentVatTu.TonKhoHienTai
                      ? `Còn lại: ${currentVatTu.TonKhoHienTai}`
                      : "Còn lại: không xác định"}
                  </p>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddVatTu}
                  >
                    Thêm Vật Tư
                  </Button>
                </Box>
              </Grid>

              {/* Bên phải: Danh sách vật tư đã thêm */}
              <Grid style={{ marginLeft: "30px" }}>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID Vật Tư</TableCell>
                        <TableCell>Tên Vật Tư</TableCell>
                        <TableCell>Số Lượng</TableCell>
                        <TableCell>Đơn Giá (VNĐ)</TableCell>
                        <TableCell>Hành Động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vatTuGroups.map((group, index) => (
                        <TableRow key={index}>
                          <TableCell>{group.IDVatTu}</TableCell>
                          <TableCell>{group.TenVatTu}</TableCell>
                          <TableCell>{group.SoLuong}</TableCell>
                          <TableCell>{group.DonGia}</TableCell>
                          <TableCell>
                            <Button
                              color="secondary"
                              onClick={() => handleRemoveVatTu(index)}
                            >
                              Xóa
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
            >
              <Button variant="outlined" onClick={handleClose}>
                Hủy
              </Button>

              {/* Hiển thị thông báo lỗi bên trong form */}
              {error && (
                <p
                  style={{
                    color: "red",
                    marginTop: "10px",
                    textAlign: "center",
                  }}
                >
                  {error}
                </p>
              )}

              <Button type="submit" variant="contained" color="primary">
                Xuất
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hiển thị thông báo thành công bên ngoài form và phiếu xuất kho*/}
      {message && <p style={{ color: "green" }}>{message}</p>}
      {phieuXuatKho && <XuatKhoPdf phieuXuatKho={phieuXuatKho} />}

      {/* Hiển thị danh sách xuất kho */}
      <DanhSachXuatKho
        idxuatkhoFromRoute={location.state?.idxuatkho}  // Lấy từ route
        ngayxuatFromRoute={location.state?.ngayxuat}
      />
    </div>
  );
};

export default XuatKho;
