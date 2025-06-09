import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Tooltip,
  IconButton,
  Button,
  TextField,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Edit, Delete, SortByAlpha } from "@mui/icons-material";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
} from "@mui/material";
import { formatDateToDDMMYYYY } from "../utils/utils"; 
import ChucNangVatTu from "./danhmucvattu/ChucNangVatTu";

const DanhMucVatTu = () => {
  const [danhMucVatTu, setDanhMucVatTu] = useState([]); // ds danh muc vt
  const [vatTu, setVatTu] = useState([]); // ds vat tu
  const [loading, setLoading] = useState(true); // trang thai loading
  const [error, setError] = useState(null);
  const [selectedDanhMuc, setSelectedDanhMuc] = useState(null); // danh muc duoc chon
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rowsPerPage, setRowsPerPage] = useState(10); // so dong hien thi
  const [currentPage, setCurrentPage] = useState(1); // trang hien tai
  const [suppliers, setSuppliers] = useState([]); // xem ncc
  const [selectedVatTuId, setSelectedVatTuId] = useState(null); // ID vat tu duoc chon
  const [viewingSuppliers, setViewingSuppliers] = useState(false); // trang thai xem nha cung cap
  const [openDialog, setOpenDialog] = useState(false);
  const [editVatTu, setEditVatTu] = useState(null);

  const tenVatTu =
    vatTu.find((vt) => vt.idvattu === selectedVatTuId)?.tenvattu ||
    "Không xác định"; // Tên vật tư được chọn

  useEffect(() => {
    // Gọi API để lấy danh sách danh mục vật tư
    const fetchDanhMucVatTu = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/danhmuc", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Danh mục vật tư:", token);
        setDanhMucVatTu(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDanhMucVatTu();
  }, []);

  // lay vat tu theo id danh muc
  const fetchVatTu = async (idDanhMuc) => {
    const token = localStorage.getItem("token");

    try {
      const response = await axios.get(
        `http://localhost:5000/api/vattu?idDanhMuc=${idDanhMuc}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // lay thong tin nha cung cap cho tung vat tu
      const vatTuWithSuppliers = await Promise.all(
        response.data.map(async (item) => {
          const supplierRes = await axios.get(
            `http://localhost:5000/api/nhacungcap/vattu/${item.idvattu}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          return { ...item, hasSuppliers: supplierRes.data.length > 0 };
        })
      );

      setVatTu(vatTuWithSuppliers);
      setSelectedDanhMuc(idDanhMuc);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    }
  };

  // lay ncc theo id vat tu
  const fetchSuppliers = async (idVatTu) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:5000/api/nhacungcap/vattu/${idVatTu}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuppliers(res.data);
      setSelectedVatTuId(idVatTu);
      setViewingSuppliers(true);
    } catch (err) {
      console.error("Lỗi khi lấy NCC:", err);
      setSuppliers([]);
      setViewingSuppliers(true);
    }
  };

  // loc va sap xep vat tu 
  const filteredAndSortedVatTu = vatTu
    .filter((item) =>
      item.tenvattu.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.tenvattu.localeCompare(b.tenvattu);
      } else {
        return b.tenvattu.localeCompare(a.tenvattu);
      }
    });

  // Tính toán dữ liệu phân trang
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedVatTu = filteredAndSortedVatTu.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  //const totalPages = Math.ceil(filteredAndSortedVatTu.length / rowsPerPage);

  const handleOpenAdd = () => {
    setEditVatTu(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (row) => {
    setEditVatTu(row);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const reloadVatTu = () => {
    if (selectedDanhMuc) fetchVatTu(selectedDanhMuc);
  };

  // xoa vat tu
  const handleDeleteVatTu = async (idvattu) => {
  if (!window.confirm("Bạn có chắc chắn muốn xóa vật tư này?")) return;
  const token = localStorage.getItem("token");
  try {
    await axios.delete(`http://localhost:5000/api/vattu/${idvattu}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    reloadVatTu();
  } catch (err) {
    alert(err.response?.data?.message || "Không thể xóa vật tư này!");
  }
};

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>Có lỗi xảy ra: {error}</p>;
  }

  return (
    <div>
      <h1>Danh mục vật tư</h1>
      <div>
        {danhMucVatTu.map((danhMuc) => (
          <div
            key={danhMuc.iddanhmuc}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <Button
              variant="contained"
              color={
                selectedDanhMuc === danhMuc.iddanhmuc ? "primary" : "default"
              }
              onClick={() => fetchVatTu(danhMuc.iddanhmuc)}
              style={{
                marginRight: "10px",
                width: "500px",
                border: "1px solid #ccc",
                boxShadow: "none",
              }}
            >
              {danhMuc.tendanhmuc}
            </Button>
            <Tooltip title={danhMuc.mota || "Không có mô tả"}>
              <IconButton>
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </div>
        ))}
      </div>

      <h3>Danh sách vật tư</h3>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        <TextField
          placeholder="Tìm kiếm theo tên vật tư..."
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
          color="success"
          onClick={handleOpenAdd}
          style={{ marginRight: "10px" }}
        >
          Thêm vật tư
        </Button>
      </div>

      {vatTu.length > 0 ? (
        <div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tên vật tư</TableCell>
                <TableCell>Đơn vị</TableCell>
                <TableCell>Mô tả</TableCell>
                <TableCell>Ngày hết hạn</TableCell>
                <TableCell>Cách lưu trữ</TableCell>
                <TableCell>Tồn kho hiện tại</TableCell>
                <TableCell>Tồn kho thực tế</TableCell>
                <TableCell>Đơn giá nhập</TableCell>
                <TableCell>Nhà cung cấp</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedVatTu.map((item) => (
                <TableRow key={item.idvattu}>
                  <TableCell>{item.idvattu}</TableCell>
                  <TableCell>{item.tenvattu}</TableCell>
                  <TableCell>{item.donvi}</TableCell>
                  <TableCell>{item.mota}</TableCell>
                  <TableCell>{formatDateToDDMMYYYY(item.ngayhethan)}</TableCell>
                  <TableCell>{item.cachluutru}</TableCell>
                  <TableCell>{item.tonkhohientai}</TableCell>
                  <TableCell>{item.tonkhothucte}</TableCell>
                  <TableCell>{item.dongia}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color={item.hasSuppliers ? "primary" : "default"} // Màu xanh nếu có NCC, xám nếu không
                      onClick={() => fetchSuppliers(item.idvattu)}
                      style={{
                        marginLeft: "10px",
                        backgroundColor: item.hasSuppliers ? "#007bff" : "#ccc", // Xanh hoặc xám
                        color: item.hasSuppliers ? "#fff" : "#000", // Màu chữ
                      }}
                    >
                      Xem
                    </Button>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEdit(item)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteVatTu(item.idvattu)}
                      title="Xóa"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredAndSortedVatTu.length}
            page={currentPage - 1}
            onPageChange={(e, newPage) => setCurrentPage(newPage + 1)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) =>
              setRowsPerPage(parseInt(e.target.value, 10))
            }
            labelRowsPerPage="Số dòng"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
            }
          />
        </div>
      ) : (
        <p>Không có vật tư trong danh mục này.</p>
      )}

      <ChucNangVatTu
        open={openDialog}
        handleClose={handleCloseDialog}
        danhMucList={danhMucVatTu}
        reloadVatTu={reloadVatTu}
        editData={editVatTu}
      />

      {/* show ncc */}
      {viewingSuppliers && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "40px",
            flexDirection: "column",
          }}
        >
          <h3 style={{ margin: 0 }}>
            Nhà cung cấp cho vật tư <strong>{tenVatTu}</strong> (ID{" "}
            {selectedVatTuId})
          </h3>
          <Button
            onClick={() => setViewingSuppliers(false)}
            variant="contained"
            style={{
              marginBottom: "15px",
              background: "#007bff",
              color: "#fff",
              marginTop: "20px",
            }}
          >
            Ẩn danh sách nhà cung cấp
          </Button>
          {suppliers.length === 0 ? (
            <p>Không có nhà cung cấp nào.</p>
          ) : (
            <Table style={{ marginTop: "10px" }}>
              <TableHead>
                <TableRow>
                  <TableCell>Tên NCC</TableCell>
                  <TableCell>Điện thoại</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Địa chỉ</TableCell>
                  <TableCell>STK</TableCell>
                  <TableCell>MST</TableCell>
                  <TableCell>Website</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((ncc, index) => (
                  <TableRow key={index}>
                    <TableCell>{ncc.tenncc}</TableCell>
                    <TableCell>{ncc.sodienthoai}</TableCell>
                    <TableCell>{ncc.email}</TableCell>
                    <TableCell>{ncc.diachi}</TableCell>
                    <TableCell>{ncc.stk}</TableCell>
                    <TableCell>{ncc.mst}</TableCell>
                    <TableCell>
                      {ncc.website ? (
                        <a
                          href={ncc.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#007bff" }}
                        >
                          {ncc.website}
                        </a>
                      ) : (
                        "Không có"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
};

export default DanhMucVatTu;
