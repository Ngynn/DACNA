import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TableContainer,
  Paper,
  Button,
  Dialog,
  DialogContent,
} from "@mui/material";
import { SortByAlpha } from "@mui/icons-material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/DanhSachXuatKho.css";
import DownloadIcon from "@mui/icons-material/Download";
import XuatKhoPdf from "./XuatKhoPdf"; // Import XuatKhoPdf
import { formatDateToDDMMYYYY } from "../../utils/utils"; // Import formatDateToDDMMYYYY function

// Hàm định dạng ngày tháng năm 
function parseLocalDate(str) {
  // str dạng "2025-04-28"
  const [year, month, day] = str.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day) + 1);
}

const DanhSachXuatKho = ({ idxuatkhoFromRoute, ngayxuatFromRoute }) => {
  const [xuatKhoData, setXuatKhoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const today = new Date();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedTransaction, setSelectedTransaction] = useState(null); // State for selected transaction
  const [openPdfDialog, setOpenPdfDialog] = useState(false); // State for PDF dialog
  const [hasSetDateFromRoute, setHasSetDateFromRoute] = useState(false);  // trạng thái để kiểm tra xem đã set ngày từ route chưa


  useEffect(() => {
    const fetchXuatKhoData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/xuatkho", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setXuatKhoData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching export data:", err);
        setError("Có lỗi xảy ra khi lấy dữ liệu xuất kho.");
        setLoading(false);
      }
    };

    fetchXuatKhoData();
  }, []);

  // Reset lại state khi props thay đổi (đặc biệt khi điều hướng bằng navigate)
  useEffect(() => {
    setHasSetDateFromRoute(false);
  }, [idxuatkhoFromRoute, ngayxuatFromRoute]);

  useEffect(() => {
    if (ngayxuatFromRoute && !hasSetDateFromRoute) {
      const localDate = parseLocalDate(ngayxuatFromRoute);
      setStartDate(localDate);
      setEndDate(localDate);
      setHasSetDateFromRoute(true);
    }
  }, [ngayxuatFromRoute, hasSetDateFromRoute]);

  // filter du lieu theo searchQuery va range date
  const filteredData = xuatKhoData.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.tenvattu.toLowerCase().includes(query) ||
      item.nguoiyeucau.toLowerCase().includes(query) ||
      // item.phonenguoiyeucau.toString().includes(query) ||
      item.tennguoidung.toLowerCase().includes(query) ||
      item.idxuatkho.toString().includes(query) ||
      item.idvattu.toString().includes(query);

    const ngayXuat = new Date(item.ngayxuat);
    const isWithinDateRange =
      (!startDate || ngayXuat >= startDate) &&
      (!endDate || ngayXuat <= endDate);

    return matchesSearch && isWithinDateRange;
  });

  // sap xep du lieu theo idxuatkho
  // xem lai logic cho hieu di
  const sortedData = filteredData.sort((a, b) => {
    if (sortOrder === "asc") {
      return a.idxuatkho - b.idxuatkho;
    } else {
      return b.idxuatkho - a.idxuatkho;
    }
  });

  // phan trang
  const paginatedData = sortedData.slice(
    currentPage * rowsPerPage,
    currentPage * rowsPerPage + rowsPerPage
  );

  // xu ly khi click vao nut tai ve PDF
  const handleDownloadClick = (transaction) => {
    // Lọc tất cả các vật tư có cùng mã giao dịch
    const filteredTransactions = xuatKhoData.filter(
      (item) => item.idxuatkho === transaction.idxuatkho
    );
    setSelectedTransaction(filteredTransactions); // Truyền dữ liệu bao gồm dongia
    setOpenPdfDialog(true);
  };

  const handleClosePdfDialog = () => {
    setOpenPdfDialog(false);
    setSelectedTransaction(null);
  };

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div>
      <h3>Danh Sách Xuất Kho</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <TextField
          placeholder="Tìm kiếm"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "640px" }}
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
      </div>
      <div className="date-style">
        <div>
          <label>
            Ngày bắt đầu:
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày bắt đầu"
              className="custom-datepicker"
            />
          </label>
        </div>
        <div>
          <label>
            Ngày kết thúc:
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Chọn ngày kết thúc"
              className="custom-datepicker"
            />
          </label>
        </div>
      </div>
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã Xuất Kho</TableCell>
              <TableCell>Ngày Xuất Kho</TableCell>
              <TableCell>Mã Vật Tư</TableCell>
              <TableCell>Tên Vật Tư</TableCell>
              <TableCell>Số Lượng</TableCell>
              <TableCell>Người Yêu Cầu</TableCell>
              <TableCell>SĐT Người Yêu Cầu</TableCell>
              <TableCell>Người Xuất</TableCell>
              <TableCell>Đơn Giá</TableCell>
              <TableCell>Xuất PDF</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((item, index) => {
              const isHighlighted =
                idxuatkhoFromRoute && item.idxuatkho === idxuatkhoFromRoute;
              return (
                <TableRow
                  key={index}
                  style={
                    isHighlighted
                      ? { backgroundColor: "#ffe082" } // vàng nhạt
                      : {}
                  }
                >
                  <TableCell>{item.idxuatkho}</TableCell>
                  <TableCell>{formatDateToDDMMYYYY(item.ngayxuat)}</TableCell>
                  <TableCell>{item.idvattu}</TableCell>
                  <TableCell>{item.tenvattu}</TableCell>
                  <TableCell>{item.soluong}</TableCell>
                  <TableCell>{item.nguoiyeucau}</TableCell>
                  <TableCell>{item.phonenguoiyeucau}</TableCell>
                  <TableCell>{item.tennguoidung}</TableCell>
                  <TableCell>{item.dongia}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleDownloadClick(item)}
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<DownloadIcon />}
                    >
                      Tải
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedData.length}
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

      {/* Dialog for PDF */}
      <Dialog
        open={openPdfDialog}
        onClose={handleClosePdfDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogContent>
          {selectedTransaction && (
            <XuatKhoPdf phieuXuatKho={selectedTransaction} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DanhSachXuatKho;
