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
import { formatDateToDDMMYYYY } from "../../utils/utils";

const LichSuXuatKho = ({ open, onClose, idVatTu }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && idVatTu) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `http://localhost:3000/api/tonkho/${idVatTu}/xuat`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setData(response.data);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching export details:", err);
          setError("Không thể tải dữ liệu xuất kho.");
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [open, idVatTu]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Lịch sử xuất kho
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ngày Xuất</TableCell>
                <TableCell>ID Vật Tư</TableCell>
                <TableCell>Tên Vật Tư</TableCell>
                <TableCell>Số Lượng</TableCell>
                <TableCell>Người Xuất</TableCell>
                <TableCell>Người Yêu Cầu</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDateToDDMMYYYY(item.ngayxuat)}</TableCell>
                  <TableCell>{item.idvattu}</TableCell>
                  <TableCell>{item.tenvattu}</TableCell>
                  <TableCell>{item.soluong}</TableCell>
                  <TableCell>{item.nguoidung}</TableCell>
                  <TableCell>{item.nguoiyeucau}</TableCell>
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

export default LichSuXuatKho;