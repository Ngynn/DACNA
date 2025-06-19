import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Autocomplete,
  Checkbox,
  CircularProgress
} from "@mui/material";

// template co san
function getBaoGiaEmailHTML(materialList) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Báo Giá Vật Tư</title>
</head>
<body style="font-family: 'Lato', Arial, Helvetica, sans-serif; background-color:#f1f1f1;">
  <table width="100%" bgcolor="#f1f1f1" style="max-width:640px;margin:auto;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <img src="https://static.vecteezy.com/system/resources/previews/029/223/957/non_2x/medical-health-circle-logo-element-free-vector.jpg" alt="Logo" width="100" height="100">
      </td>
    </tr>
    <tr>
      <td bgcolor="#fff" style="padding:40px;">
        <h2 style="color:#383e56;">Kính gửi Quý Nhà Cung Cấp,</h2>
        <p>Chúng tôi muốn yêu cầu báo giá cho các vật tư sau:</p>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <thead>
            <tr style="background:#f1f1f1;">
              <th style="text-align:left;">Tên vật tư</th>
              <th style="text-align:right;">Số lượng</th>
            </tr>
          </thead>
          <tbody>
            ${materialList.map(m => `
              <tr>
                <td>${m.tenvattu}</td>
                <td style="text-align:right;">${m.soluong || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p>Trân trọng,<br>Công ty KKTL</p>
        <div style="margin-top:40px;text-align:center;">
          <a href="#" style="background-color: #01c8c8; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Gửi Phản Hồi</a>
        </div>
      </td>
    </tr>
    <tr>
      <td bgcolor="#383e56" style="color:#fff;text-align:center;padding:20px;">
        © 2025 KKTL Company, Inc.
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const BaoGia = () => {
    const [materialQuantities, setMaterialQuantities] = useState({});

  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [loading, setLoading] = useState(false); // Thêm state loading để quản lý trạng thái tải dữ liệu

  // Hàm để cập nhật materialQuantities khi selectedMaterials thay đổi
  useEffect(() => {
    setMaterialQuantities(prev => {
      const newQuantities = {};
      selectedMaterials.forEach(id => {
        newQuantities[id] = prev[id] || "";
      });
      return newQuantities;
    });
  }, [selectedMaterials]);

  // lay vat tu
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/api/vattu", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMaterials(res.data);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách vật tư:", error);
      }
    };
    fetchMaterials();
  }, []);

  // lay ncc khi chon vat tu
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (selectedMaterials.length === 0) {
        setSuppliers([]);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const supplierLists = await Promise.all(
          selectedMaterials.map(async (idvattu) => {
            const res = await axios.get(
              `http://localhost:3000/api/nhacungcap/vattu/${idvattu}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return res.data;
          })
        );
        // Kết hợp tất cả nhà cung cấp từ các vật tư đã chọn
        const allSuppliers = supplierLists.flat();
        const uniqueSuppliers = [];
        const seen = new Set();
        for (const sup of allSuppliers) {
          if (!seen.has(sup.idncc)) {
            uniqueSuppliers.push(sup);
            seen.add(sup.idncc);
          }
        }
        setSuppliers(uniqueSuppliers); // cai nay la de chi hien thi cac ncc co loai vat tu da chon
        setSelectedSuppliers(uniqueSuppliers.map((s) => s.idncc)); // day gia tri vao selectedSuppliers, xiu nua render se check het
      } catch (error) {
        console.error("Lỗi khi lấy danh sách nhà cung cấp:", error);
        setSuppliers([]);
        setSelectedSuppliers([]);
      }
    };
    fetchSuppliers();
  }, [selectedMaterials]);

  // Hàm chọn/bỏ chọn nhà cung cấp
  const handleSupplierCheck = (idncc) => {
    setSelectedSuppliers((prev) =>
      prev.includes(idncc)
        ? prev.filter((id) => id !== idncc)
        : [...prev, idncc]
    );
  };

  // Hàm gửi email yêu cầu báo giá
  const handleSendEmail = async () => {
    if (selectedMaterials.length === 0 || selectedSuppliers.length === 0) {
      alert("Vui lòng chọn vật tư và chọn ít nhất một nhà cung cấp.");
      return;
    }
    // Kiểm tra số lượng đã nhập đủ và hợp lệ
    for (const id of selectedMaterials) {
      if (!materialQuantities[id] || isNaN(materialQuantities[id]) || Number(materialQuantities[id]) <= 0) {
        alert("Vui lòng nhập số lượng hợp lệ cho tất cả vật tư.");
        return;
      }
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        suppliers
          .filter((supplier) => selectedSuppliers.includes(supplier.idncc))
          .map(async (supplier) => {
            const res = await axios.get(
              `http://localhost:3000/api/vattu/nhacungcap/${supplier.idncc}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const supplierMaterialIds = res.data.map((m) => m.idvattu);
            // Lọc ra vật tư đã chọn mà nhà cung cấp này có, kèm số lượng
            const materialForSupplier = materials
              .filter(
                (m) =>
                  selectedMaterials.includes(m.idvattu) &&
                  supplierMaterialIds.includes(m.idvattu)
              )
              .map(m => ({
                ...m,
                soluong: materialQuantities[m.idvattu]
              }));
            if (materialForSupplier.length === 0) return null;

            const emailHtml = getBaoGiaEmailHTML(materialForSupplier);

            return axios.post(
              "http://localhost:3000/api/send-email",
              {
                email: supplier.email,
                subject: "Yêu cầu báo giá vật tư",
                html: emailHtml,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          })
      );
      alert("Email đã được gửi đến các nhà cung cấp đã chọn.");
    } catch (error) {
      console.error("Lỗi khi gửi email:", error);
      alert("Không thể gửi email.");
    }
    setLoading(false);
  };

  return (
    <Box sx={{ padding: "20px" }}>
      <h1>Báo Giá</h1>

      <Autocomplete
        multiple
        options={materials}
        disableCloseOnSelect
        getOptionLabel={(option) => `${option.idvattu} - ${option.tenvattu}`}
        value={materials.filter((m) => selectedMaterials.includes(m.idvattu))}
        onChange={(event, newValue) => {
          setSelectedMaterials(newValue.map((item) => item.idvattu));
        }}
        renderOption={(props, option, { selected }) => {
          const { key, ...rest } = props;
          return (
            <li key={option.idvattu} {...rest}>
              <Checkbox
                checked={selectedMaterials.includes(option.idvattu)}
                style={{ marginRight: 8 }}
              />
              {option.idvattu} - {option.tenvattu}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Tìm kiếm và chọn vật tư"
            placeholder="Nhập tên hoặc mã vật tư"
          />
        )}
        sx={{ width: "100%" }}
      />

      {/* Bảng nhập số lượng cho từng vật tư đã chọn */}
      {selectedMaterials.length > 0 && (
        <Box sx={{ marginTop: 3, marginBottom: 3 }}>
          <h3>Nhập số lượng cần báo giá</h3>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tên vật tư</TableCell>
                <TableCell>Số lượng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedMaterials.map(id => {
                const material = materials.find(m => m.idvattu === id);
                return (
                  <TableRow key={id}>
                    <TableCell>{material ? material.tenvattu : id}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={materialQuantities[id] || ""}
                        onChange={e => {
                          const value = e.target.value;
                          setMaterialQuantities(q => ({
                            ...q,
                            [id]: value
                          }));
                        }}
                        inputProps={{ min: 1 }}
                        required
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Danh sách nhà cung cấp */}
      <Box sx={{ marginBottom: "20px", marginTop: "30px" }}>
        <h3>Nhà Cung Cấp Hỗ Trợ Các Vật Tư Đã Chọn</h3>
        {suppliers.length === 0 ? (
          <p>Không có nhà cung cấp nào phù hợp.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lựa Chọn</TableCell>
                <TableCell>Tên Nhà Cung Cấp</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Số Điện Thoại</TableCell>
                <TableCell>Địa Chỉ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.idncc}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSuppliers.includes(supplier.idncc)} // checkbox se duoc check neu idncc co trong selectedSuppliers
                      onChange={() => handleSupplierCheck(supplier.idncc)}
                    />
                  </TableCell>
                  <TableCell>{supplier.tenncc}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.sodienthoai}</TableCell>
                  <TableCell>{supplier.diachi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* Gửi email */}
      <Box>
        <Button
          variant="contained"
          color="primary"
          disabled={
            loading ||
            selectedMaterials.length === 0 ||
            selectedSuppliers.length === 0
          }
          onClick={handleSendEmail}
          startIcon={
            loading ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {loading ? "Đang gửi..." : "Gửi Yêu Cầu Báo Giá"}
        </Button>
      </Box>
    </Box>
  );
};

export default BaoGia;