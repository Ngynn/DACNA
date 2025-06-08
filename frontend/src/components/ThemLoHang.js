import React, { useState } from "react";
import axios from "axios";
import { Box, Button, Typography, Input, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import * as XLSX from "xlsx";

// Hàm chuyển số serial Excel thành chuỗi ngày/tháng/năm
function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return serial;
    const date = XLSX.SSF.parse_date_code(serial);
    if (!date) return serial;
    const day = String(date.d).padStart(2, "0");
    const month = String(date.m).padStart(2, "0");
    const year = date.y;
    return `${day}/${month}/${year}`;
}

const ThemLoHang = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [excelData, setExcelData] = useState([]);
    const [vatTuInfo, setVatTuInfo] = useState([]); // Thông tin vật tư trong file và tồn kho

    // Lấy số lượng tồn kho hiện tại cho các idvattu trong file Excel
    const fetchVatTuInfo = async (idvattuList, excelRows) => {
    if (!idvattuList.length) {
        setVatTuInfo([]);
        return;
    }
    try {
        const token = localStorage.getItem("token");
        // Lấy toàn bộ tồn kho
        const res = await axios.get("http://localhost:5000/tonkho", {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Lọc các vật tư có trong file Excel
        const info = idvattuList.map((idvattu) => {
            const excelRow = excelRows.find((row) => String(row.idvattu) === String(idvattu));
            const dbRow = res.data.find((row) => String(row.idvattu) === String(idvattu));
            return {
                idvattu,
                tenvattu: dbRow?.tenvattu || "",
                soluong_excel: excelRow?.soluongthucte ?? excelRow?.soluong ?? "",
                tonkhohientai: dbRow?.tonkhohientai ?? "",
            };
        });
        setVatTuInfo(info);
    } catch (error) {
        setVatTuInfo([]);
    }
};

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setMessage("");
        setExcelData([]);
        setVatTuInfo([]);
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                setExcelData(json);

                // Lấy danh sách idvattu duy nhất trong file
                const idvattuList = Array.from(
                    new Set(json.map((row) => row.idvattu).filter((id) => id))
                );
                fetchVatTuInfo(idvattuList, json);
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Vui lòng chọn file Excel.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post("http://localhost:5000/api/lohang/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });
            setMessage(res.data.message);

            // Sau khi upload thành công, cập nhật lại số lượng tồn kho
            if (excelData.length > 0) {
                const idvattuList = Array.from(
                    new Set(excelData.map((row) => row.idvattu).filter((id) => id))
                );
                fetchVatTuInfo(idvattuList, excelData);
            }
        } catch (error) {
            setMessage(error.response?.data?.message || "Có lỗi xảy ra.");
        }
    };

    // Xác định các cột có thể là ngày tháng (tên cột chứa "ngay")
    const isDateColumn = (key) =>
        key.toLowerCase().includes("ngaydukiennhapkho") ||
        key.toLowerCase().includes("ngaythuctenhapkho");

    return (
        <Box sx={{ padding: "20px" }}>
            <h1>Nhập Lô Hàng</h1>
            <Typography variant="body1" sx={{ mb: 2 }}>
                        Upload file Excel để nhập lô hàng. Vui lòng kiểm tra số lượng vật tư trước và sau khi nhập.
                    </Typography>
            <Input type="file" onChange={handleFileChange} />
            <Button variant="contained" color="primary" onClick={handleUpload} sx={{ marginLeft: "10px" }}>
                Upload
            </Button>
            {message && (
                <Typography variant="body1" color="error" sx={{ marginTop: "10px" }}>
                    {message}
                </Typography>
            )}

            {/* Hiển thị dữ liệu Excel nếu có */}
            {excelData.length > 0 && (
                <Box sx={{ marginTop: "30px" }}>
                    <Typography variant="h6" gutterBottom>
                        Xem trước dữ liệu file Excel:
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {Object.keys(excelData[0]).map((key) => (
                                    <TableCell key={key}>{key}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {excelData.map((row, idx) => (
                                <TableRow key={idx}>
                                    {Object.keys(excelData[0]).map((key) => (
                                        <TableCell key={key}>
                                            {isDateColumn(key) && !isNaN(row[key]) && row[key] !== ""
                                                ? excelDateToJSDate(row[key])
                                                : row[key]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* Hiển thị bảng vật tư và số lượng tồn kho */}
            {vatTuInfo.length > 0 && (
                <Box sx={{ marginTop: "30px" }}>
                    <Typography variant="h6" gutterBottom>
                        So sánh số lượng vật tư:
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID Vật Tư</TableCell>
                                <TableCell>Tên Vật Tư</TableCell>
                                <TableCell>Số lượng dự kiến sẽ nhập</TableCell>
                                <TableCell>Số lượng tồn kho hiện tại</TableCell>
                                <TableCell>Số lượng sau khi nhập</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {vatTuInfo.map((row) => {
                                // Chuyển về số nếu có thể, nếu không thì để trống
                                const soLuongNhap = Number(row.soluong_excel) || 0;
                                const tonKhoHienTai = Number(row.tonkhohientai) || 0;
                                const soLuongSauKhiNhap = soLuongNhap + tonKhoHienTai;
                                return (
                                    <TableRow key={row.idvattu}>
                                        <TableCell>{row.idvattu}</TableCell>
                                        <TableCell>{row.tenvattu}</TableCell>
                                        <TableCell sx={{ background: "#fff3cd" }}>{row.soluong_excel}</TableCell>
                                        <TableCell sx={{ background: "#d1ecf1" }}>{row.tonkhohientai}</TableCell>
                                        <TableCell sx={{ background: "#d4edda" }}>{soLuongSauKhiNhap}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
};

export default ThemLoHang;