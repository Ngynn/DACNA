import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  DialogActions,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const LichSuKiemKe = ({ open, onClose, idVatTu }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !idVatTu) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5000/api/kiemke/${idVatTu}/lichsu`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Lỗi khi lấy lịch sử kiểm kê");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message || "Lỗi không xác định");
      }
      setLoading(false);
    };

    fetchData();
  }, [open, idVatTu]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Lịch sử kiểm kê
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <div style={{ color: "red" }}>{error}</div>
        ) : data.length === 0 ? (
          <div>Không có dữ liệu kiểm kê.</div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ngày kiểm kê</TableCell>
                <TableCell>Người kiểm kê</TableCell>
                <TableCell>Số lượng hao hụt</TableCell>
                <TableCell>Mô tả</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {row.ngaycapnhat
                      ? new Date(row.ngaycapnhat).toLocaleDateString("vi-VN")
                      : ""}
                  </TableCell>
                  <TableCell>{row.tendangnhap || ""}</TableCell>
                  <TableCell>{row.soluonghaohut}</TableCell>
                  <TableCell>{row.noidung}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LichSuKiemKe;