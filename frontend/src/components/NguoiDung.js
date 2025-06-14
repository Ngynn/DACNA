import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { IconButton, Button, TextField, Modal, Box } from "@mui/material";
import { Edit, Delete, Lock, LockOpen, SortByAlpha } from "@mui/icons-material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  TablePagination,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material"; // Import icons

const NguoiDung = () => {
  const [nguoiDung, setNguoiDung] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // Tìm kiếm theo tên hoặc vai trò
  const [sortOrder, setSortOrder] = useState("asc"); // Sắp xếp danh sách
  const [rowsPerPage, setRowsPerPage] = useState(10); // Số dòng hiển thị
  const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại
  const [showModal, setShowModal] = useState(false); // Hiển thị Modal
  const [selectedUser, setSelectedUser] = useState(null); // Người dùng được chọn
  const [formData, setFormData] = useState({
    tendangnhap: "",
    matkhau: "",
    vaitro: "QuanLy",
    trangthai: "active",
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false); // gọi hàm để dùng Ẩn/hiện mật khẩu

  const navigate = useNavigate();

  // Lấy danh sách người dùng
  const fetchNguoiDung = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/nguoidung", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNguoiDung(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response && error.response.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        navigate("/");
      }
    }
  }, [navigate]);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "Admin") {
      alert("Bạn không có quyền truy cập vào chức năng này.");
      navigate("/");
      return;
    }
    fetchNguoiDung();
  }, [fetchNguoiDung, navigate]);

  // Xử lý tìm kiếm
  const filteredNguoiDung = nguoiDung.filter(
    (user) =>
      user.tendangnhap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.vaitro.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Xử lý sắp xếp
  const sortedNguoiDung = filteredNguoiDung.sort((a, b) => {
    if (sortOrder === "asc") {
      return a.tendangnhap.localeCompare(b.tendangnhap);
    } else {
      return b.tendangnhap.localeCompare(a.tendangnhap);
    }
  });

  // Phân trang
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedNguoiDung = sortedNguoiDung.slice(
    startIndex,
    startIndex + rowsPerPage
  );
  //const totalPages = Math.ceil(sortedNguoiDung.length / rowsPerPage);

  // Xử lý mở Modal
  const handleOpenModal = (user = null) => {
    setSelectedUser(user);
    setFormData(
      user || {
        tendangnhap: "",
        matkhau: "",
        vaitro: "QuanLy",
        trangthai: "active",
        email: "",
      }
    );
    setShowModal(true);
  };

  // Xử lý đóng Modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // Xử lý lưu (thêm hoặc chỉnh sửa)
  const handleAddOrUpdate = async () => {
    const token = localStorage.getItem("token");
    try {
      if (selectedUser) {
        // Cập nhật người dùng
        await axios.put(
          `http://localhost:3000/api/nguoidung/${selectedUser.idnguoidung}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert("Cập nhật người dùng thành công!");
      } else {
        // Thêm người dùng mới
        await axios.post("http://localhost:3000/api/dangky", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert("Thêm người dùng thành công!");
      }
      fetchNguoiDung();
      handleCloseModal();
    } catch (error) {
      // Log lỗi chi tiết để debug
      console.error("Lỗi khi lưu người dùng:", error, error?.response?.data);
      // Ưu tiên hiển thị message từ server
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Có lỗi xảy ra khi lưu người dùng.";
      alert(msg);
    }
  };

  // Xử lý xóa người dùng
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:3000/api/nguoidung/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert("Xóa thành công");
        fetchNguoiDung();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Có lỗi xảy ra khi xóa người dùng.");
      }
    }
  };

  // Xử lý khóa/mở khóa người dùng
  const handleToggleLock = async (id, currentStatus) => {
    const newStatus = currentStatus === "locked" ? "active" : "locked";
    if (
      window.confirm(
        `Bạn có chắc chắn muốn ${newStatus === "locked" ? "khóa" : "mở khóa"} tài khoản này?`
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(
          `http://localhost:3000/api/nguoidung/khoa/${id}`,
          { trangthai: newStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        alert(
          `Tài khoản đã được ${newStatus === "locked" ? "khóa" : "mở khóa"}`
        );
        fetchNguoiDung();
      } catch (error) {
        console.error("Error toggling lock:", error);
        alert("Có lỗi xảy ra khi khóa/mở khóa người dùng.");
      }
    }
  };

  return (
    <div>
      <h1>Người dùng</h1>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <TextField
          placeholder="Tìm kiếm theo tên hoặc vai trò..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginRight: "10px", width: "400px" }}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          style={{
            background: "#007bff",
            marginRight: "10px",
          }}
        >
          <SortByAlpha
            style={{
              transform: sortOrder === "asc" ? "scaleX(1)" : "scaleX(-1)",
            }}
          />
        </Button>
        <Button
          variant="contained"
          onClick={() => handleOpenModal()}
          style={{ background: "#28a745" }}
        >
          <AddCircleOutlineIcon style={{ marginRight: "5px" }} />
          Thêm người dùng
        </Button>
      </div>
      {/* Bảng danh sách người dùng */}
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tên đăng nhập</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Hiển thị danh sách người dùng */}
            {paginatedNguoiDung.map((user) => (
              <TableRow key={user.idnguoidung}>
                <TableCell>{user.idnguoidung}</TableCell>
                <TableCell>{user.tendangnhap}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.vaitro === "QuanLy" ? "Quản Lý" : user.vaitro}
                </TableCell>
                <TableCell>
                  {user.trangthai === "locked" ? "Đã khóa" : "Hoạt động"}
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenModal(user)}
                  >
                    <Edit />
                  </IconButton>
                  {user.vaitro !== "Admin" && (
                    <>
                      <IconButton
                        color="secondary"
                        onClick={() => handleDelete(user.idnguoidung)}
                      >
                        <Delete />
                      </IconButton>
                      <IconButton
                        color={
                          user.trangthai === "locked" ? "success" : "error"
                        }
                        onClick={() =>
                          handleToggleLock(user.idnguoidung, user.trangthai)
                        }
                      >
                        {user.trangthai === "locked" ? <LockOpen /> : <Lock />}
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Phân trang */}
      <TablePagination
        component="div"
        count={sortedNguoiDung.length}
        page={currentPage - 1}
        onPageChange={(e, newPage) => setCurrentPage(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
        labelRowsPerPage="Số dòng"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
        }
      />

      {/* Modal thêm/chỉnh sửa người dùng */}
      <Modal open={showModal} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: "8px",
          }}
        >
          <h2>{selectedUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h2>
          <TextField
            fullWidth
            margin="normal"
            label="Tên đăng nhập"
            name="tendangnhap"
            value={formData.tendangnhap}
            onChange={(e) =>
              setFormData({ ...formData, tendangnhap: e.target.value })
            }
            required
            autoComplete="off" // Ngăn trình duyệt tự động điền
          />
          <TextField
            fullWidth
            margin="normal"
            label="Mật khẩu"
            name="matkhau"
            type={showPassword ? "text" : "password"} // Ẩn hoặc hiện mật khẩu
            value={formData.matkhau}
            onChange={(e) =>
              setFormData({ ...formData, matkhau: e.target.value })
            }
            required
            autoComplete="new-password"
            InputProps={{
              endAdornment: selectedUser !== null && ( // Nếu người dùng có giá trị thì hiển thị icon con mắt
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Vai trò"
            name="vaitro"
            value={formData.vaitro === "QuanLy" ? "Quản lý" : formData.vaitro} // Hiển thị "Quản lý"
            onChange={(e) => {
              const value =
                e.target.value === "Quản lý" ? "QuanLy" : e.target.value; // Chuyển đổi ngược lại
              setFormData({ ...formData, vaitro: value });
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button variant="outlined" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button variant="contained" onClick={handleAddOrUpdate}>
              {selectedUser ? "Cập nhật" : "Thêm"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default NguoiDung;
