import React, { useEffect, useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ChiTietAppbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [newTransactions, setNewTransactions] = useState([]);
  const [seenIds, setSeenIds] = useState([]);
  const [isSeenIdsLoaded, setIsSeenIdsLoaded] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false); // Trạng thái có tin mới hay không
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId"); //  lưu userId vào localStorage khi login
  const seenKey = `seenIds_${userId}`; // thông báo đã đọc phải đc ghi nhớ theo từng user

  useEffect(() => {
    if (!isSeenIdsLoaded) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/lichsugiaodich", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = res.data.filter((gd) => !seenIds.includes(gd.idgiaodich)); // Loại bỏ giao dịch đã đọc

        // Gộp các giao dịch cùng idxuat hoặc nhập
        const mergedData = data.reduce((acc, curr) => {
          const key = curr.idxuatkho || curr.idnhapkho; // Gộp theo idxuat kh thì idnhap
          if (!acc[key]) {
            acc[key] = {
              idgiaodich: curr.idgiaodich, // lấy id đầu tiên
              idxuatkho: curr.idxuatkho,
              idnhapkho: curr.idnhapkho,
              tennguoidung: curr.tennguoidung,
              loaigiaodich: curr.loaigiaodich,
              ngaygiaodich: curr.ngaygiaodich,
              inventories: [],
            };
          }

          // Kiểm tra nếu `inventories` tồn tại và có phần tử
          if (Array.isArray(curr.inventories) && curr.inventories.length > 0) {
            curr.inventories.forEach((item) => {
              // Kiểm tra xem vật tư đã tồn tại trong danh sách chưa
              const exists = acc[key].inventories.some(
                (inv) =>
                  inv.tenvattu === item.tenvattu && inv.soluong === item.soluong
              );

              if (!exists) {
                acc[key].inventories.push({
                  tenvattu: item.tenvattu || "Không xác định",
                  soluong: item.soluong || 0,
                });
              }
            });
          }
          return acc;
        }, {});

        const mergedArray = Object.values(mergedData);

        const processedData = mergedArray
          .filter((gd) => !seenIds.includes(gd.idgiaodich)) // Loại bỏ giao dịch đã đọc
          .map((gd) => ({
            ...gd,
            read: seenIds.includes(gd.idgiaodich),
          }))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read - b.read;
            const dateDiff =
              new Date(b.ngaygiaodich) - new Date(a.ngaygiaodich);
            if (dateDiff !== 0) return dateDiff;
            const idA = a.idxuatkho || a.idnhapkho || 0;
            const idB = b.idxuatkho || b.idnhapkho || 0;
            return idB - idA;
          });

        // Cập nhật trạng thái có thông báo mới
        setNewTransactions(processedData);

        // ktr có đọc chưa
        const newOnes = processedData.filter((gd) => !gd.read);
        setHasNewNotifications(newOnes.length > 0);
      } catch (err) {
        console.error("Lỗi lấy giao dịch:", err);
      }
    };

    if (isSeenIdsLoaded) {
      fetchData();
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    }
  }, [seenIds, isSeenIdsLoaded]);

  // Lấy danh sách ID đã xem từ localStorage
  useEffect(() => {
    const stored = localStorage.getItem(seenKey);
    if (stored) {
      const parsedIds = JSON.parse(stored).map((id) => parseInt(id)); // Đảm bảo là số
      setSeenIds(parsedIds);
    } else {
      const emptyIds = [];
      localStorage.setItem(seenKey || "seenIds", JSON.stringify(emptyIds)); // Lưu vào key phù hợp
      setSeenIds(emptyIds);
    }
    setIsSeenIdsLoaded(true); // Đặt thành true ngay cả khi không có dữ liệu
  }, [seenKey]);

  // lưu seenid vào đúng key khi đánh dấu đã đọc
  useEffect(() => {
    if (seenIds.length > 0 && userId) {
      localStorage.setItem(seenKey, JSON.stringify(seenIds));
    }
  }, [seenIds, userId, seenKey]);

  // Đánh dấu giao dịch là đã đọc và điều hướng đến trang chi tiết
  const handleNotificationClick = (idgiaodich, giaoDich) => {
    // Đánh dấu giao dịch là đã xem (đọc)
    setSeenIds((prev) => {
      const updatedSeenIds = Array.from(new Set([...prev, idgiaodich])); // Thêm ID vào danh sách đã xem
      localStorage.setItem(seenKey, JSON.stringify(updatedSeenIds)); // Lưu vào localStorage
      return updatedSeenIds;
    });

    // Loại bỏ giao dịch đã đọc khỏi danh sách hiển thị
    setNewTransactions((prev) =>
      prev.filter((gd) => gd.idgiaodich !== idgiaodich)
    );

    // Điều hướng và truyền state để highlight dòng
    if (giaoDich.idxuatkho) {
      navigate("/dashboard/xuatkho", {
        state: {
          idxuatkho: giaoDich.idxuatkho,
          ngayxuat: giaoDich.ngayxuat
            ? giaoDich.ngayxuat.slice(0, 10)
            : giaoDich.ngaygiaodich?.slice(0, 10),
        },
      });
    } else if (giaoDich.idnhapkho) {
      navigate("/dashboard/lichsugiaodich", {
        state: { idgiaodich: giaoDich.idgiaodich },
      });
    } else {
      alert("Không tìm thấy thông tin giao dịch!");
    }
  };

  // Mở menu thông báo
  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Đóng menu thông báo
  const handleClose = () => setAnchorEl(null);

  return (
    <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
      <IconButton
        color="primary"
        onClick={handleOpen}
        sx={{
          position: "relative",
          border: "1px solid #ccc",
          borderRadius: "40%",
          padding: "8px",
          "&:hover": { borderColor: "#aaa" },
        }}
      >
        <NotificationsIcon />
        {hasNewNotifications && (
          <Box
            sx={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "red",
            }}
          />
        )}
      </IconButton>

      {/* // Menu hiển thị danh sách giao dịch mới */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {newTransactions.length === 0 ? (
          <MenuItem disabled>Không có giao dịch mới</MenuItem>
        ) : (
          newTransactions.map((giaoDich, index) => (
            <Box key={index}>
              <MenuItem
                onClick={() =>
                  handleNotificationClick(giaoDich.idgiaodich, giaoDich)
                }
              >
                <Box sx={{ position: "relative" }}>
                  <Typography variant="body2">
                    ID giao dịch: {giaoDich.idgiaodich}
                  </Typography>
                  <Typography variant="body2">
                    Loại giao dịch: {giaoDich.loaigiaodich}
                  </Typography>
                  <Typography variant="body2">
                    {giaoDich.idxuatkho != null
                      ? `Mã phiếu xuất: ${giaoDich.idxuatkho}`
                      : giaoDich.idnhapkho != null
                        ? `Mã phiếu nhập: ${giaoDich.idnhapkho}`
                        : "Không xác định"}
                  </Typography>

                  <Typography variant="body2">
                    Người thực hiện: {giaoDich.tennguoidung || "Không xác định"}
                  </Typography>
                  <Typography variant="body2">
                    Ngày giao dịch:{" "}
                    {new Date(giaoDich.ngaygiaodich).toLocaleDateString(
                      "vi-VN",
                      {}
                    )}
                  </Typography>

                  {!giaoDich.read && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        backgroundColor: "red",
                        color: "white",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      •
                    </Box>
                  )}
                </Box>
              </MenuItem>

              {/* đường gạch ngang nếu không phải giao dịch cuối cùng */}
              {index < newTransactions.length - 1 && (
                <Divider sx={{ margin: "5px 0" }} />
              )}
            </Box>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default ChiTietAppbar;
