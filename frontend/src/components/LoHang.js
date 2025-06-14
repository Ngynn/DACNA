import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Box,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    TablePagination,
} from "@mui/material";

const LoHang = () => {
    const [loHangList, setLoHangList] = useState([]);
    const [chiTietLoHang, setChiTietLoHang] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10); // Số dòng hiển thị mỗi trang
    const [currentPage, setCurrentPage] = useState(0); // Trang hiện tại
    const [rowsPerPageDialog, setRowsPerPageDialog] = useState(10); // Số dòng hiển thị mỗi trang trong Dialog
    const [currentPageDialog, setCurrentPageDialog] = useState(0); // Trang hiện tại trong Dialog
    const navigate = useNavigate();

    useEffect(() => {
        fetchLoHang();
    }, []);

    // lay data lo hang
    const fetchLoHang = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:3000/api/lohang", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLoHangList(res.data);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách lô hàng:", error);
        }
    };

    // lay chi tiet cua tung lo hang = id
    const fetchChiTietLoHang = async (idlohang) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `http://localhost:3000/api/lohang/${idlohang}/chitiet`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setChiTietLoHang(res.data);
            setOpenDialog(true);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                alert("Lô hàng này không có chi tiết lô hàng.");
            } else {
                console.error("Lỗi khi lấy chi tiết lô hàng:", error);
                alert("Có lỗi xảy ra khi lấy chi tiết lô hàng.");
            }
        }
    };

    // xu ly xôa lo hang
    const handleDeleteLoHang = async (idlohang) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa lô hàng này?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://localhost:3000/api/lohang/${idlohang}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert("Xóa lô hàng thành công.");
            fetchLoHang(); // refresh ds lo hang sau khi xoa 
        } catch (error) {
            console.error("Lỗi khi xóa lô hàng:", error);
            alert("Có lỗi xảy ra khi xóa lô hàng.");
        }
    };

    // xu ly thay doi trang thai lo hang
    const handleChangeTrangThai = async (idlohang, newTrangThai) => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.put(
                `http://localhost:3000/api/lohang/${idlohang}/trangthai`,
                { trangthai: newTrangThai },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            alert(res.data.message);
            fetchLoHang(); // refresh ds lo hang sau khi update
        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái lô hàng:", error);
            alert("Có lỗi xảy ra khi cập nhật trạng thái lô hàng.");
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setChiTietLoHang([]);
    };

    // dinh dang ngay gio 
    const formatDateTime = (isoString) => {
        if (!isoString) return "N/A"; // Nếu không có giá trị, trả về "N/A"
        const date = new Date(isoString);
        return date.toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    // Phân trang danh sách lô hàng
    const paginatedLoHangList = loHangList.slice(
        currentPage * rowsPerPage,
        currentPage * rowsPerPage + rowsPerPage
    );

    // Phân trang danh sách chi tiết lô hàng
    const paginatedChiTietLoHang = chiTietLoHang.slice(
        currentPageDialog * rowsPerPageDialog,
        currentPageDialog * rowsPerPageDialog + rowsPerPageDialog
    );

    return (
        <Box sx={{ padding: "20px" }}>
            <h1>Danh Sách Lô Hàng</h1>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID Lô Hàng</TableCell>
                        <TableCell>Nhà Cung Cấp</TableCell>
                        <TableCell>Tổng Tiền</TableCell>
                        <TableCell>Trạng Thái</TableCell>
                        <TableCell>Ngày Dự Kiến Nhập Kho</TableCell>
                        <TableCell>Ngày Thực Tế Nhập Kho</TableCell>
                        <TableCell>Hành Động</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedLoHangList.map((loHang) => (
                        <TableRow key={loHang.idlohang}>
                            <TableCell>{loHang.idlohang}</TableCell>
                            <TableCell>{loHang.tenncc}</TableCell>
                            <TableCell>{loHang.tongtien}</TableCell>
                            <TableCell>
                                <Select
                                    value={loHang.trangthai}
                                    onChange={(e) => handleChangeTrangThai(loHang.idlohang, e.target.value)}
                                    displayEmpty
                                    sx={{ width: "150px" }}
                                >
                                    <MenuItem value="Đã nhập">Đã nhập</MenuItem>
                                    <MenuItem value="Đã Hủy">Đã Hủy</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell>{formatDateTime(loHang.ngaydukiennhapkho)}</TableCell>
                            <TableCell>{formatDateTime(loHang.ngaythuctenhapkho)}</TableCell>
                            <TableCell>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => fetchChiTietLoHang(loHang.idlohang)}
                                >
                                    Xem Chi Tiết
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => handleDeleteLoHang(loHang.idlohang)}
                                    sx={{ marginLeft: "10px" }}
                                >
                                    Xóa
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => navigate(`/dashboard/thanh-toan`)}
                                    sx={{ marginLeft: "10px" }}
                                >
                                    Thanh Toán
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Phân trang danh sách lô hàng */}
            <TablePagination
                component="div"
                count={loHangList.length}
                page={currentPage}
                onPageChange={(e, newPage) => setCurrentPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                labelRowsPerPage="Số dòng mỗi trang"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
                }
            />

            {/* Dialog hiển thị chi tiết lô hàng */}
            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>Chi Tiết Lô Hàng</DialogTitle>
                <DialogContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID Vật Tư</TableCell>
                                <TableCell>Tên Vật Tư</TableCell>
                                <TableCell>Số Lượng</TableCell>
                                <TableCell>Đơn Giá Nhập</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedChiTietLoHang.map((chiTiet) => (
                                <TableRow key={chiTiet.idvattu}>
                                    <TableCell>{chiTiet.idvattu}</TableCell>
                                    <TableCell>{chiTiet.tenvattu}</TableCell>
                                    <TableCell>{chiTiet.soluong}</TableCell>
                                    <TableCell>{chiTiet.dongianhap}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={chiTietLoHang.length}
                        page={currentPageDialog}
                        onPageChange={(e, newPage) => setCurrentPageDialog(newPage)}
                        rowsPerPage={rowsPerPageDialog}
                        onRowsPerPageChange={(e) => setRowsPerPageDialog(parseInt(e.target.value, 10))}
                        labelRowsPerPage="Số dòng mỗi trang"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} trên ${count !== -1 ? count : `nhiều hơn ${to}`}`
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LoHang;