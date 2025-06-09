import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem,
  Box
} from "@mui/material";
import axios from "axios";

const ChucNangVatTu = ({
  open, handleClose, danhMucList, reloadVatTu, editData
}) => {
  const [form, setForm] = useState({
    tenvattu: "",
    iddanhmuc: "",
    donvi: "",
    mota: "",
    ngayhethan: "",
    cachluutru: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      setForm({
        tenvattu: editData.tenvattu || "",
        iddanhmuc: Number(editData.iddanhmuc) || "",
        donvi: editData.donvi || "",
        mota: editData.mota || "",
        ngayhethan: editData.ngayhethan ? editData.ngayhethan.slice(0, 10) : "",
        cachluutru: editData.cachluutru || "",
      });
    } else {
      setForm({
        tenvattu: "",
        iddanhmuc: "",
        donvi: "",
        mota: "",
        ngayhethan: "",
        cachluutru: "",
      });
    }
  }, [editData, open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      if (editData) {
        await axios.put(
          `http://localhost:5000/api/vattu/${editData.idvattu}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/vattu",
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      reloadVatTu();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thao tác vật tư");
    }
    setLoading(false);
  };

  // check coi form co hop le khong
  const isFormValid =
    form.tenvattu.trim() !== "" &&
    form.iddanhmuc !== "" &&
    form.donvi.trim() !== "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editData ? "Sửa vật tư" : "Thêm vật tư mới"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Tên vật tư"
          name="tenvattu"
          value={form.tenvattu}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        {editData && editData.tendanhmuc && (
          <Box sx={{ mb: 1, color: "text.secondary" }}>
            Danh mục hiện tại: <b>{editData.tendanhmuc}</b>
          </Box>
        )}
        <TextField
          select
          label="Danh mục"
          name="iddanhmuc"
          value={form.iddanhmuc}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          {danhMucList.map((dm) => (
            <MenuItem key={dm.iddanhmuc} value={dm.iddanhmuc}>
              {dm.tendanhmuc}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Đơn vị"
          name="donvi"
          value={form.donvi}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Mô tả"
          name="mota"
          value={form.mota}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Ngày hết hạn"
          name="ngayhethan"
          type="date"
          value={form.ngayhethan}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Cách lưu trữ"
          name="cachluutru"
          value={form.cachluutru}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 2,
            width: "100%",
          }}
        >
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          {/* Hiển thị thông báo lỗi bên trong form */}
          {error && (
            <p
              style={{
                color: "red",
                marginTop: "10px",
                marginBottom: 0,
                textAlign: "center",
                flex: 1,
              }}
            >
              {error}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !isFormValid}
          >
            {editData ? "Lưu" : "Thêm"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ChucNangVatTu;