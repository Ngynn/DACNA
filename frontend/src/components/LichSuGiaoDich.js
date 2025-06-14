import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import CSS của react-datepicker
import "../styles/LichSuGiaoDich.css";
import { Button, TextField } from "@mui/material";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
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
import { formatDateToDDMMYYYY } from "../utils/utils"; // Import hàm định dạng ngày

const LichSuGiaoDich = () => {
  const [lichSuGiaoDich, setLichSuGiaoDich] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // Tìm kiếm
  const [rowsPerPage, setRowsPerPage] = useState(10); // Số dòng hiển thị
  const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại
  const today = new Date(); // Lấy ngày hiện tại
  const [startDate, setStartDate] = useState(today); // Ngày bắt đầu mặc định là hôm nay
  const [endDate, setEndDate] = useState(today); // Ngày kết thúc mặc định là hôm nay
  const [sortOrder, setSortOrder] = useState("asc"); // Thứ tự sắp xếp: asc hoặc desc

  useEffect(() => {
    const fetchLichSuGiaoDich = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3000/lichsugiaodich",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("Lịch sử giao dịch:", token); // Log dữ liệu nhận được
        setLichSuGiaoDich(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
        setError("Có lỗi xảy ra khi lấy lịch sử giao dịch.");
        setLoading(false);
      }
    };

    fetchLichSuGiaoDich();
  }, []);

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Lọc danh sách giao dịch dựa trên từ khóa tìm kiếm và khoảng thời gian
  const filteredLichSuGiaoDich = lichSuGiaoDich
    .filter((giaoDich) => {
      const query = searchQuery.toLowerCase();
      const ngayGiaoDich = new Date(giaoDich.ngaygiaodich);
      const isWithinDateRange =
        (!startDate || ngayGiaoDich >= startDate) &&
        (!endDate || ngayGiaoDich <= endDate);

      return (
        isWithinDateRange &&
        (giaoDich.tenvattu?.toLowerCase().includes(query) ||
          giaoDich.tennguoidung?.toLowerCase().includes(query) ||
          giaoDich.loaigiaodich?.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.idgiaodich - b.idgiaodich;
      } else {
        return b.idgiaodich - a.idgiaodich;
      }
    });

  // Phân trang
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLichSuGiaoDich = filteredLichSuGiaoDich.slice(
    startIndex,
    startIndex + rowsPerPage
  );
  //const totalPages = Math.ceil(filteredLichSuGiaoDich.length / rowsPerPage);

  return (
    <div>
      <h1>Lịch Sử Giao Dịch</h1>

      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <TextField
          placeholder="Tìm kiếm theo tên hoặc vai trò..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginRight: "10px", width: "640px" }}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          style={{ marginRight: "10px", background: "#007bff" }}
        >
          <SortByAlphaIcon
            style={{
              transform: sortOrder === "asc" ? "scaleX(1)" : "scaleX(-1)",
            }}
          />
        </Button>
      </div>

      <div className="date-style">
        {/* Ngày bắt đầu */}
        <div>
          <label>
            Ngày bắt đầu:
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày bắt đầu"
              className="custom-datepicker" // Thêm class tùy chỉnh
            />
          </label>
        </div>

        {/* Ngày kết thúc */}
        <div>
          <label>
            Ngày kết thúc:
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày kết thúc"
              className="custom-datepicker" // Thêm class tùy chỉnh
            />
          </label>
        </div>
      </div>

      {/* Bảng danh sách giao dịch */}
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã Giao Dịch</TableCell>
              <TableCell>Mã Vật Tư</TableCell>
              <TableCell>Tên Vật Tư</TableCell>
              <TableCell>Loại Giao Dịch</TableCell>
              <TableCell>Số Lượng</TableCell>
              <TableCell>Người Dùng</TableCell>
              <TableCell>Ngày Giao Dịch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLichSuGiaoDich.map((giaoDich) =>
              giaoDich.inventories.map((inventory, index) => (
                <TableRow key={`${giaoDich.idgiaodich}-${index}`}>
                  <TableCell>{giaoDich.idgiaodich}</TableCell>
                  <TableCell>{inventory.idvattu}</TableCell>
                  <TableCell>
                    {inventory.tenvattu || "Không xác định"}
                  </TableCell>
                  <TableCell>{giaoDich.loaigiaodich}</TableCell>
                  <TableCell>{inventory.soluong}</TableCell>
                  <TableCell>
                    {giaoDich.tennguoidung || "Không xác định"}
                  </TableCell>
                  <TableCell>
                    {formatDateToDDMMYYYY(giaoDich.ngaygiaodich)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Phân trang */}
      <TablePagination
        component="div"
        count={filteredLichSuGiaoDich.length}
        page={currentPage - 1}
        onPageChange={(e, newPage) => setCurrentPage(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
        labelRowsPerPage="Số dòng"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
        }
      />
    </div>
  );
};

export default LichSuGiaoDich;
