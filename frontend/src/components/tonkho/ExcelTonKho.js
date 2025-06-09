import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@mui/material";

// xuat ten dua theo view
const getFileName = (view) => {
  switch (view) {
    case "tonKhoDu": return "TonKho_OnDinh.xlsx";
    case "soLuongIt": return "TonKho_It.xlsx";
    case "sapHetHan": return "TonKho_SapHetHan.xlsx";
    case "daHetHan": return "TonKho_DaHetHan.xlsx";
    case "hetVatTu": return "TonKho_HetVatTu.xlsx";
    default: return "TonKho_ToanBo.xlsx";
  }
};

// đẩy dữ liệu vào excel
const ExcelTonKho = ({ data, view }) => {
  const handleExport = () => {
    if (!data || data.length === 0) return;
    const exportData = data.map(item => ({
      "ID Vật Tư": item.idvattu,
      "Tên Vật Tư": item.tenvattu,
      "Danh Mục": item.tendanhmuc || "Không xác định",
      "Ngày Hết Hạn": item.ngayhethan,
      "Tổng Nhập": item.tongnhap,
      "Tổng Xuất": item.tongxuat,
      "Tồn Kho Hiện Tại": item.tonkhohientai,
      "Tồn kho thực tế": item.tonkhothucte,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TonKho");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), getFileName(view));
  };

  return (
    <Button
      variant="contained"
      color="success"
      onClick={handleExport}
      style={{ marginBottom: 10, marginLeft: 10 }}
    >
      Xuất Excel
    </Button>
  );
};

export default ExcelTonKho;