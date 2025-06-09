import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Autocomplete
} from "@mui/material";
import axios from "axios";

const ThanhToanLoHang = ({open, onClose, loHang, onSuccess}) => {
  const [soTienThanhToan, setSoTienThanhToan] = useState("");
  const [moTa, setMoTa] = useState("");
  const [summary, setSummary] = useState(null);
  const [displayValue, setDisplayValue] = useState(""); // Chuỗi hiển thị cho input
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && loHang) {
      // Lấy thông tin tổng đã thanh toán, còn lại, tổng tiền, số tài khoản, nhà cung cấp
      const fetchSummary = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(
            `http://localhost:5000/api/lich-su-thanh-toan/${loHang.idlohang}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSummary(res.data.summary || null);
        } catch {
          setSummary(null);
        }
      };
      fetchSummary();
      setSoTienThanhToan("");
      setMoTa("");
    }
  }, [open, loHang]);

  const handleThanhToan = async () => {
    setError("");

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/thanh-toan",
        {
          idlohang: loHang.idlohang,
          sotienthanhtoan: parseInt(soTienThanhToan),
          mota: moTa,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Thanh toán thành công!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Có lỗi xảy ra khi thanh toán.";
      setError(msg);
    }
  };

  // Hàm tạo danh sách số tiền gợi ý dựa trên số người dùng nhập
  const generatePriceSuggestions = (congno, inputValue) => {
    const num = parseInt(congno, 10);
    const inputNum = parseInt(inputValue, 10);
    let suggestions = [];

    if (inputValue && !isNaN(inputNum)) {
      // Gợi ý các mốc nhân lên từ số nhập
      suggestions = [
        inputNum * 1000,
        inputNum * 10000,
        inputNum * 100000,
        inputNum * 1000000,
        inputNum * 100000000,
        inputNum * 1000000000,
      ];
    } else {
      // Nếu chưa nhập gì thì gợi ý các mốc phổ biến và số còn nợ
      suggestions = [100000, 500000, 1000000, 5000000];
    }

    // Luôn thêm số còn nợ vào cuối nếu hợp lệ
    if (num && suggestions.indexOf(num) === -1 && num > 0) {
      suggestions.push(num);
    }

    // Loại trùng, loại số <= 0, lớn hơn số còn nợ
    suggestions = Array.from(new Set(suggestions)).filter(
      (v) => v > 0 && (!num || v <= num)
    );

    return suggestions;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Thanh Toán Lô Hàng #{loHang?.idlohang}</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Nhà cung cấp: {summary?.tenncc || loHang?.tenncc || "Không xác định"}
        </Typography>
        <Typography gutterBottom>
          Số tài khoản: {loHang?.stk || "Không xác định"}
        </Typography>
        <Typography gutterBottom>
          <strong>Tổng chi phí cần thanh toán: </strong>
          {summary
            ? Number(summary.tongtien).toLocaleString("vi-VN")
            : loHang?.tongtien?.toLocaleString("vi-VN") || 0}{" "}
          VNĐ
        </Typography>
        <Typography gutterBottom>
          <strong>Tổng đã thanh toán: </strong>
          {summary
            ? Number(summary.tongthanhtoan).toLocaleString("vi-VN")
            : loHang?.sotienthanhtoan?.toLocaleString("vi-VN") || 0}{" "}
          VNĐ
        </Typography>
        <Typography gutterBottom>
          <strong>Số tiền còn lại: </strong>
          {summary
            ? Number(summary.congno).toLocaleString("vi-VN")
            : loHang?.congno?.toLocaleString("vi-VN") || 0}{" "}
          VNĐ
        </Typography>
        <Autocomplete
          freeSolo // nhap tu do
          options={generatePriceSuggestions(
            summary ? summary.congno : loHang?.congno,
            soTienThanhToan
          ).map(String)}
          getOptionLabel={(option) => Number(option).toLocaleString("vi-VN")}
          inputValue={displayValue}
          onInputChange={(event, newInputValue, reason) => {
            // Nếu chọn từ gợi ý thì format luôn, nếu nhập tay thì giữ nguyên
            if (reason === "reset") {
              setDisplayValue(
                newInputValue
                  ? Number(newInputValue.replace(/[^\d]/g, "")).toLocaleString(
                      "vi-VN"
                    )
                  : ""
              );
              setSoTienThanhToan(newInputValue.replace(/[^\d]/g, ""));
            } else {
              setDisplayValue(newInputValue.replace(/[^\d]/g, ""));
              setSoTienThanhToan(newInputValue.replace(/[^\d]/g, ""));
            }
          }}
          onBlur={() => {
            // Khi mất focus, format lại cho đẹp // là sao?
            setDisplayValue(
              soTienThanhToan
                ? Number(soTienThanhToan).toLocaleString("vi-VN")
                : ""
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Số Tiền Thanh Toán"
              type="text"
              fullWidth
              sx={{ marginBottom: "20px", marginTop: "10px" }}
            />
          )}
        />
        <TextField
          label="Mô Tả"
          multiline
          rows={3}
          fullWidth
          value={moTa}
          onChange={(e) => setMoTa(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Button
            onClick={() => {
              // reset form, dong dialog
              setError(""); 
              setSoTienThanhToan("");
              setMoTa("");
              setDisplayValue(""); 
              onClose();
            }}
          >
            Hủy
          </Button>
          {/* hien thi error */}
          {error && (
            <p
              style={{
                color: "red",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
          <Button variant="contained" color="primary" onClick={handleThanhToan}>
            Thanh Toán
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ThanhToanLoHang;