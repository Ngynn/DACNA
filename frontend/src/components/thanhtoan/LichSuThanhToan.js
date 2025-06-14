import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";
import axios from "axios";

const LichSuThanhToan = ({ open, onClose, idLoHang }) => {
  const [historyData, setHistoryData] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && idLoHang) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(
            `http://localhost:3000/api/lich-su-thanh-toan/${idLoHang}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setHistoryData(res.data.history || []);
          setHistorySummary(res.data.summary || null);
        } catch (err) {
          setHistoryData([]);
          setHistorySummary(null);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [open, idLoHang]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Lịch sử thanh toán lô hàng #{idLoHang}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : (
          <>
            {/* Hiển thị tên nhà cung cấp */}
            <div style={{ marginBottom: 12 }}>
              <strong>Nhà cung cấp: </strong>
              {historySummary?.tenncc || "Không xác định"}
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ngày thanh toán</TableCell>
                  <TableCell>Mô tả</TableCell>
                  <TableCell>Số tiền (VNĐ)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Chưa có lịch sử thanh toán
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData.map((row) => (
                    <TableRow key={row.idthanhtoan}>
                      <TableCell>
                        {new Date(row.ngaythanhtoan).toLocaleDateString(
                          "vi-VN"
                        )}
                      </TableCell>
                      <TableCell>{row.mota || "Không có mô tả"}</TableCell>
                      <TableCell>
                        {Number(row.sotienthanhtoan).toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div style={{ marginTop: 16 }}>
              <strong>Tổng chi phí cần thanh toán: </strong>
              {historySummary
                ? Number(historySummary.tongtien).toLocaleString("vi-VN")
                : 0}{" "}
              VNĐ
              <br />
              <strong>Tổng đã thanh toán: </strong>
              {historySummary
                ? Number(historySummary.tongthanhtoan).toLocaleString("vi-VN")
                : 0}{" "}
              VNĐ
              <br />
              <strong>Số tiền còn lại: </strong>
              {historySummary
                ? Number(historySummary.congno).toLocaleString("vi-VN")
                : 0}{" "}
              VNĐ
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LichSuThanhToan;