import React, { useState, useEffect } from "react";
import axios from "axios";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import EditIcon from "@mui/icons-material/Edit"; // Icon sửa
import DeleteIcon from "@mui/icons-material/Delete"; // Icon xóa
import {
  Modal,
  Box,
  Button,
  TextField,
  FormControl,
  Checkbox,
  Autocomplete,
} from "@mui/material"; // Modal và các thành phần MUI
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
  IconButton,
} from "@mui/material";

const NhaCungCap = () => {
  const [nhaCungCap, setNhaCungCap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [danhSachVatTu, setDanhSachVatTu] = useState([]);

  // khai bao form data
  const [formData, setFormData] = useState({
    idncc: "",
    tenncc: "",
    sodienthoai: "",
    email: "",
    diachi: "",
    stk: "",
    mst: "",
    website: "",
    idvattu: [],
  });
  const [isEditing, setIsEditing] = useState(false); // trang thai chinh sua
  const [isModalOpen, setIsModalOpen] = useState(false); // trang thai mo modal, giong nhu cai dialog

  // lay ds ncc
  const fetchNhaCungCap = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/nhacungcap", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNhaCungCap(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNhaCungCap();
  }, []);

  //lấy ds vattu
  const fetchDanhSachVatTu = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3000/api/vattu", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDanhSachVatTu(response.data);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách vật tư:", err);
    }
  };

  useEffect(() => {
    fetchDanhSachVatTu();
  }, []);

  // xu ly thay doi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // xu ly thay doi hoac them moi nha cung cap
  const handleAddOrUpdate = async () => {
    const token = localStorage.getItem("token");
    try {
      let response;
      if (isEditing) { // neu dang sua => put
        response = await axios.put(
          `http://localhost:3000/api/nhacungcap/${formData.idncc}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else { // neu them moi => post
        response = await axios.post(
          "http://localhost:3000/api/nhacungcap",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      const idncc = isEditing ? formData.idncc : response.data.data.idncc;

      // Gọi API gán vật tư (chỉ sau khi cập nhật thành công)
      await axios.post(
        `http://localhost:3000/api/nhacungcap/${idncc}/vattu`, //gọi riêng để cập nhật vattu_nhacungcap
        { idvattuList: formData.idvattu },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // khi cả 2 thành công
      alert(
        isEditing
          ? "Cập nhật nhà cung cấp thành công!"
          : "Thêm nhà cung cấp thành công!"
      );

      setFormData({
        idncc: "",
        tenncc: "",
        sodienthoai: "",
        email: "",
        diachi: "",
        stk: "",
        mst: "",
        website: "",
        idvattu: [],
      });
      setIsEditing(false);
      setIsModalOpen(false); // Đóng Modal
      fetchNhaCungCap();
    } catch (err) {
      console.error("Error adding/updating nhà cung cấp:", err);
      // Hiển thị thông báo lỗi chi tiết từ server nếu có
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Có lỗi xảy ra!";
      alert(msg);
    }
  };

  // xu ly khi nhan nut Sua
  const handleEdit = async (ncc) => {
    const token = localStorage.getItem("token");
    try {
      // Gọi đúng API để lấy danh sách vật tư của nhà cung cấp
      const res = await axios.get(`http://localhost:3000/api/vattu/nhacungcap/${ncc.idncc}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Lấy danh sách idvattu từ dữ liệu trả về
      const idvattuList = res.data.map(item => item.idvattu);

      // Cập nhật dữ liệu vào form
      setFormData({ ...ncc, idvattu: idvattuList });

      // Mở modal chỉnh sửa
      setIsEditing(true);
      setIsModalOpen(true);

    } catch (err) {
      console.error("Lỗi khi lấy vật tư của nhà cung cấp:", err);
    }
  };

  // xu ly khi nhan nut Xoa
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (window.confirm("Bạn có chắc chắn muốn xóa nhà cung cấp này?")) {
      try {
        await axios.delete(`http://localhost:3000/api/nhacungcap/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert("Xóa nhà cung cấp thành công!");
        fetchNhaCungCap();
      } catch (err) {
        console.error("Error deleting nhà cung cấp:", err);
        alert("Có lỗi xảy ra!");
      }
    }
  };

  if (loading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // loc, sap xep nha cung cap theo ten, mst, sdt
  const filteredNhaCungCap = nhaCungCap.filter((ncc) => {
    const query = searchQuery.toLowerCase();
    return (
      ncc.tenncc.toLowerCase().includes(query) ||
      ncc.mst?.toLowerCase().includes(query) ||
      ncc.sodienthoai?.toLowerCase().includes(query)
    );
  });

  // sap xep theo ten
  const sortedNhaCungCap = filteredNhaCungCap.sort((a, b) => {
    if (sortOrder === "asc") {
      return a.tenncc.localeCompare(b.tenncc);
    } else {
      return b.tenncc.localeCompare(a.tenncc);
    }
  });

  // phan trang
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedNhaCungCap = sortedNhaCungCap.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  return (
    <div>
      <h1>Nhà Cung Cấp</h1>

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
          style={{ marginRight: "10px", background: "#007bff" }}
        >
          <SortByAlphaIcon
            style={{
              transform: sortOrder === "asc" ? "scaleX(1)" : "scaleX(-1)",
            }}
          />
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setFormData({ //reset form data 
              idncc: "",
              tenncc: "",
              sodienthoai: "",
              email: "",
              diachi: "",
              stk: "",
              mst: "",
              website: "",
              idvattu: [],
            });
            setIsEditing(false);
            setIsModalOpen(true);
          }}
          style={{ background: "#28a745" }}
        >
          <AddCircleOutlineIcon style={{ marginRight: "5px" }} />
          Thêm Nhà Cung Cấp
        </Button>
      </div>

      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên Nhà Cung Cấp</TableCell>
              <TableCell>Số Điện Thoại</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Địa Chỉ</TableCell>
              <TableCell>Số tài khoản</TableCell>
              <TableCell>Mã số thuế</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedNhaCungCap.map((ncc) => (
              <TableRow key={ncc.idncc}>
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
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(ncc)}
                    style={{ color: "blue" }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(ncc.idncc)}
                    style={{ color: "purple" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedNhaCungCap.length}
        page={currentPage - 1}
        onPageChange={(e, newPage) => setCurrentPage(newPage + 1)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
        labelRowsPerPage="Số dòng"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
        }
      />

      {/* Modal thêm/sửa nhà cung cấp */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
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
          <h2>{isEditing ? "Sửa Nhà Cung Cấp" : "Thêm Nhà Cung Cấp"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddOrUpdate();
            }}
          >
            <TextField
              fullWidth
              margin="normal"
              label="Tên nhà cung cấp"
              name="tenncc"
              value={formData.tenncc}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Số điện thoại"
              name="sodienthoai"
              value={formData.sodienthoai}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Địa chỉ"
              name="diachi"
              value={formData.diachi}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Số tài khoản"
              name="stk"
              value={formData.stk}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Mã số thuế"
              name="mst"
              value={formData.mst}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              required
            />
            <FormControl fullWidth margin="normal">
              <Autocomplete
                multiple
                options={danhSachVatTu}
                getOptionLabel={(option) => `${option.idvattu} - ${option.tenvattu}`}
                value={danhSachVatTu.filter((vt) =>
                  formData.idvattu.includes(vt.idvattu)
                )}
                onChange={(event, newValue) => {
                  setFormData((prev) => ({
                    ...prev,
                    idvattu: newValue.map((vt) => vt.idvattu),
                  }));
                }}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox
                      checked={formData.idvattu.includes(option.idvattu)}
                      style={{ marginRight: 8 }}
                    />
                    {`${option.idvattu} - ${option.tenvattu}`}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Chọn các vật tư NCC cung cấp"
                    placeholder="Chọn vật tư"
                  />
                )}
              />
            </FormControl>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
            >
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setFormData({
                    idncc: "",
                    tenncc: "",
                    sodienthoai: "",
                    email: "",
                    diachi: "",
                    stk: "",
                    mst: "",
                    website: "",
                    idvattu: [],
                  });
                  setIsEditing(false);
                  setIsModalOpen(false); // Đóng Modal
                }}
              >
                Hủy
              </Button>
              <Button variant="contained" color="primary" type="submit">
                {isEditing ? "Cập Nhật" : "Thêm Mới"}
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </div>
  );
};

export default NhaCungCap;
