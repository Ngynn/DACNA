import React, { useState, useEffect } from "react";
//import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Button,
  TextField,
  TablePagination
} from "@mui/material";
import LichSuThanhToan from "./thanhtoan/LichSuThanhToan";
import ThanhToanLoHang from "./thanhtoan/ThanhToanLoHang";

const ThanhToan = () => {
  const [loHangList, setLoHangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLoHang, setSelectedLoHang] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  //const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState(10); // Số dòng hiển thị mỗi trang
  const [currentPage, setCurrentPage] = useState(0); // Trang hiện tại
  const [openHistory, setOpenHistory] = useState(false);
  const [historyLoHang, setHistoryLoHang] = useState(null);

  useEffect(() => {
    const fetchThanhToan = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3000/api/thanh-toan",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Chuyển đổi congno và sotienthanhtoan sang số
        const data = response.data.map((loHang) => ({
          ...loHang,
          congno: parseFloat(loHang.congno), // Chuyển congno sang số
          sotienthanhtoan: parseFloat(loHang.sotienthanhtoan), // Chuyển sotienthanhtoan sang số
        }));

        setLoHangList(data);
        setLoading(false);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách thanh toán:", err);
        setError("Có lỗi xảy ra khi lấy danh sách thanh toán.");
        setLoading(false);
      }
    };

    fetchThanhToan();
  }, []);

  const handleOpenDialog = (loHang) => {
    setSelectedLoHang(loHang);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLoHang(null);
  };

  // refresh data sau khi thanh toan thanh cong
  const reloadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/thanh-toan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.map((loHang) => ({
        ...loHang,
        congno: parseFloat(loHang.congno),
        sotienthanhtoan: parseFloat(loHang.sotienthanhtoan),
      }));
      setLoHangList(data);
    } catch (err) {
      setError("Có lỗi xảy ra khi lấy danh sách thanh toán.");
    }
    setLoading(false);
  };

  const handleOpenHistory = (loHang) => {
    setHistoryLoHang(loHang.idlohang);
    setOpenHistory(true);
  };

  const handleCloseHistory = () => {
    setOpenHistory(false);
    setHistoryLoHang(null);
  };

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Lọc danh sách lô hàng theo mã lô hàng
  const filteredLoHangList = loHangList.filter((loHang) =>
    loHang.idlohang.toString().includes(searchQuery.trim())
  );

  // Lọc và phân trang danh sách lô hàng
  const paginatedLoHangList = filteredLoHangList.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ padding: "10px" }}>
      <h1 style={{ textAlign: "center" }}>Thanh Toán Lô Hàng</h1>

      {/* Ô tìm kiếm */}
      <Box sx={{ marginBottom: "20px" }}>
        <TextField
          label="Tìm kiếm theo Mã Lô Hàng"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã Lô Hàng</TableCell>
              <TableCell>Nhà Cung Cấp</TableCell>
              <TableCell>Tổng Tiền (VNĐ)</TableCell>
              <TableCell>Đã Thanh Toán (VNĐ)</TableCell>
              <TableCell>Công Nợ (VNĐ)</TableCell>
              <TableCell>Hành Động</TableCell>
              <TableCell>Xem lịch sử</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLoHangList.map((loHang) => (
              <TableRow key={loHang.idlohang}>
                <TableCell>{loHang.idlohang}</TableCell>
                <TableCell>{loHang.tenncc}</TableCell>
                <TableCell>{loHang.tongtien.toLocaleString("vi-VN")}</TableCell>
                <TableCell>
                  {loHang.sotienthanhtoan.toLocaleString("vi-VN")}
                </TableCell>
                <TableCell
                  sx={{
                    color: loHang.congno > 0 ? "red" : "green",
                    fontWeight: "bold",
                  }}
                >
                  {loHang.congno.toLocaleString("vi-VN")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenDialog(loHang)}
                    disabled={loHang.congno === 0} // Disable nếu công nợ bằng 0
                  >
                    Thanh Toán
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    color="info"
                    onClick={() => handleOpenHistory(loHang)}
                  >
                    Xem lịch sử
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Phân trang */}
      <TablePagination
        component="div"
        count={filteredLoHangList.length}
        page={currentPage}
        onPageChange={(e, newPage) => setCurrentPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) =>
          setRowsPerPage(parseInt(e.target.value, 10))
        }
        labelRowsPerPage="Số dòng"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
        }
      />

      {/* Dialog thanh toán */}
      <ThanhToanLoHang
        open={openDialog}
        onClose={handleCloseDialog}
        loHang={selectedLoHang}
        onSuccess={reloadData}
      />

      {/* Dialog lịch sử thanh toán */}
      <LichSuThanhToan
        open={openHistory}
        onClose={handleCloseHistory}
        idLoHang={historyLoHang}
      />
    </Box>
  );
};

export default ThanhToan;