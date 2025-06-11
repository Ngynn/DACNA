import React, { useState, useEffect } from "react";
import axios from "axios";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import "../styles/TonKho.css";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  TablePagination,
  Button,
  TextField,
  ButtonGroup,
} from "@mui/material";
import { formatDateToDDMMYYYY } from "../utils/utils";
import LichSuNhapKho from "./tonkho/LichSuNhapKho";
import LichSuXuatKho from "./tonkho/LichSuXuatKho";
import LichSuKiemKe from "./tonkho/LichSuKiemKe"; // Bạn cần tạo component này
import ExcelTonKho from "./tonkho/ExcelTonKho";
import { IconButton, Menu, MenuItem } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const TonKho = () => {
  const [tonKhoData, setTonKhoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [view, setView] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openNhapModal, setOpenNhapModal] = useState(false);
  const [openXuatModal, setOpenXuatModal] = useState(false);
  const [openKiemKeModal, setOpenKiemKeModal] = useState(false);
  const [selectedVatTuId, setSelectedVatTuId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuVatTuId, setMenuVatTuId] = useState(null);

  useEffect(() => {
    const fetchTonKho = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/tonkho", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTonKhoData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching inventory data:", err);
        setError("Có lỗi xảy ra khi lấy dữ liệu tồn kho.");
        setLoading(false);
      }
    };

    fetchTonKho();
  }, []);

  // kiem tra ngay sap het han trước 14 ngày
  const getExpiringSoon = (ngayHetHan) => {
    if (!ngayHetHan) return false;
    const today = new Date();
    const expiryDate = new Date(ngayHetHan);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14 && diffDays >= 0;
  };

  // kiem tra ngay da het han
  const getExpired = (ngayHetHan) => {
    if (!ngayHetHan) return false;
    const today = new Date();
    const expiryDate = new Date(ngayHetHan);
    return expiryDate < today;
  };

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Lọc danh sách dựa trên từ khóa tìm kiếm
  const filteredTonKhoData = tonKhoData.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.tenvattu?.toLowerCase().includes(query) ||
      item.tendanhmuc?.toLowerCase().includes(query)
    );
  });

  // Sắp xếp danh sách theo bảng chữ cái
  const sortedTonKhoData = filteredTonKhoData.sort((a, b) => {
    if (sortOrder === "asc") {
      return a.tenvattu.localeCompare(b.tenvattu);
    } else {
      return b.tenvattu.localeCompare(a.tenvattu);
    }
  });

  // Lọc dữ liệu theo chế độ hiển thị
  const getViewData = () => {
    if (view === "sapHetHan") {
      return sortedTonKhoData.filter((item) => getExpiringSoon(item.ngayhethan));
    }
    if (view === "daHetHan") {
      return sortedTonKhoData.filter((item) => getExpired(item.ngayhethan));
    }
    if (view === "soLuongIt") {
      return sortedTonKhoData.filter(
        (item) => Number(item.tonkhothucte) > 0 && Number(item.tonkhothucte) < 30
      );
    }
    if (view === "tonKhoDu") {
      return sortedTonKhoData.filter(
        (item) =>
          Number(item.tonkhothucte) >= 30 &&
          !getExpired(item.ngayhethan) &&
          !getExpiringSoon(item.ngayhethan)
      );
    }
    if (view === "hetVatTu") {
      return sortedTonKhoData.filter((item) => Number(item.tonkhothucte) === 0);
    }
    return sortedTonKhoData;
  };

  const viewData = getViewData();

  // Tính toán dữ liệu phân trang
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedViewData = viewData.slice(startIndex, startIndex + rowsPerPage);

  // xac dinh class cho tung row trong table
  // CHU Y CAI HAM NAY, HAM NAY LA DE SAP XEP, LOC CAC VAT TU THEO TUNG TRANG THAI
  const getRowClass = (item) => {
    if (getExpired(item.ngayhethan)) return "da-het-han";
    if (Number(item.tonkhothucte) === 0) return "het-vat-tu";
    if (getExpiringSoon(item.ngayhethan)) return "sap-het-han";
    if (Number(item.tonkhothucte) > 0 && Number(item.tonkhothucte) < 30)
      return "ton-kho-it";
    return "ton-kho-du";
  };

  // mo menu
  const handleMenuOpen = (event, idVatTu) => {
    setAnchorEl(event.currentTarget);
    setMenuVatTuId(idVatTu);
  };

  // dong menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuVatTuId(null);
  };

  return (
    <div>
      <h1>Tồn Kho</h1>

      {/* Thanh tìm kiếm và sắp xếp */}
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
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
              transform:
                sortOrder === "asc" ? "rotate(0deg)" : "rotate(180deg)",
            }}
          />
        </Button>
      </div>
      {/* Button group chế độ hiển thị */}
      <div className="button-group-container">
        <ButtonGroup variant="outlined" color="primary">
          <Button
            variant={view === "all" ? "contained" : "outlined"}
            onClick={() => setView("all")}
          >
            Toàn bộ
          </Button>
          <Button
            variant={view === "tonKhoDu" ? "contained" : "outlined"}
            onClick={() => setView("tonKhoDu")}
            className="ton-kho-du"
          >
            Ổn định
          </Button>
          <Button
            variant={view === "soLuongIt" ? "contained" : "outlined"}
            onClick={() => setView("soLuongIt")}
            className="ton-kho-it"
          >
            Tồn kho ít
          </Button>
          <Button
            variant={view === "sapHetHan" ? "contained" : "outlined"}
            onClick={() => setView("sapHetHan")}
            className="sap-het-han"
          >
            Sắp hết hạn
          </Button>
          <Button
            variant={view === "daHetHan" ? "contained" : "outlined"}
            onClick={() => setView("daHetHan")}
            className="da-het-han"
          >
            Đã hết hạn
          </Button>
          <Button
            variant={view === "hetVatTu" ? "contained" : "outlined"}
            onClick={() => setView("hetVatTu")}
            className="het-vat-tu"
          >
            Hết vật tư
          </Button>
        </ButtonGroup>
      </div>

      {/* Bảng tồn kho */}
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID Vật Tư</TableCell>
              <TableCell>Tên Vật Tư</TableCell>
              <TableCell>Danh Mục</TableCell>
              <TableCell>Ngày Hết Hạn</TableCell>
              <TableCell>Tổng Nhập</TableCell>
              <TableCell>Tổng Xuất</TableCell>
              <TableCell>Tồn Kho Hiện Tại</TableCell>
              <TableCell>Tồn kho thực tế</TableCell>
              <TableCell>Lịch sử </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedViewData.map((item) => (
              <TableRow key={item.idvattu} className={getRowClass(item)}>
                <TableCell>{item.idvattu}</TableCell>
                <TableCell>{item.tenvattu}</TableCell>
                <TableCell>{item.tendanhmuc || "Không xác định"}</TableCell>
                <TableCell>{formatDateToDDMMYYYY(item.ngayhethan)}</TableCell>
                <TableCell>{item.tongnhap}</TableCell>
                <TableCell> {item.tongxuat}</TableCell>
                <TableCell>{item.tonkhohientai}</TableCell>
                <TableCell>{item.tonkhothucte}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, item.idvattu)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Lịch Sử Nhập Kho */}
      <LichSuNhapKho
        open={openNhapModal}
        onClose={() => setOpenNhapModal(false)}
        idVatTu={selectedVatTuId}
      />

      {/* Modal Lịch Sử Xuất Kho */}
      <LichSuXuatKho
        open={openXuatModal}
        onClose={() => setOpenXuatModal(false)}
        idVatTu={selectedVatTuId}
      />

      {/* Modal Lịch Sử Kiểm Kê */}
      <LichSuKiemKe
        open={openKiemKeModal}
        onClose={() => setOpenKiemKeModal(false)}
        idVatTu={selectedVatTuId}
      />
      {/* Menu chọn lịch sử */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            setSelectedVatTuId(menuVatTuId);
            setOpenNhapModal(true);
            handleMenuClose();
          }}
        >
          Lịch sử nhập kho
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSelectedVatTuId(menuVatTuId);
            setOpenXuatModal(true);
            handleMenuClose();
          }}
        >
          Lịch sử xuất kho
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSelectedVatTuId(menuVatTuId);
            setOpenKiemKeModal(true);
            handleMenuClose();
          }}
        >
          Lịch sử kiểm kê
        </MenuItem>
      </Menu>
      {/* Phân trang và Xuất Excel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <ExcelTonKho data={viewData} view={view} />
        <TablePagination
          component="div"
          count={viewData.length}
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
    </div>
  );
};

export default TonKho;