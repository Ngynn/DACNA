import React, { useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { formatDateToDDMMYYYY } from "../../utils/utils"; // Import formatDateToDDMMYYYY function

const XuatKhoPdf = ({ phieuXuatKho }) => {
  const pdfRef = useRef(); // Tham chiếu đến nội dung cần in

  const handleExportPdf = async () => {
    const element = pdfRef.current;

    // Tạo canvas từ nội dung HTML
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#fff",
    });
    const imgData = canvas.toDataURL("image/png");

    // Tạo file PDF với lề 2,54 cm (1 inch)
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 15;
    const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, margin, pdfWidth, pdfHeight);
    pdf.save("phieu-xuat-kho.pdf");
  };

  return (
    <div>
      <div
        ref={pdfRef}
        style={{
          padding: "20px",
          marginBottom: "20px",
          backgroundColor: "#fff", 
          fontSize: "20px", 
          lineHeight: "1.25", 
        }}
      >
        {/* Tựa đề */}
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
          Phiếu Xuất Kho
        </h1>

        {/* Thông tin chi tiết */}
        <p>
          <strong>Ngày xuất:</strong> {formatDateToDDMMYYYY(new Date())}
        </p>
        <p>
          <strong>Mã phiếu:</strong>{" "}
          {phieuXuatKho[0]?.idxuatkho || "Không xác định"}
        </p>
        <p>
          <strong>Người yêu cầu:</strong>{" "}
          {phieuXuatKho[0]?.nguoiyeucau || "Không xác định"}
        </p>
        <p>
          <strong>Số điện thoại: </strong>
          {phieuXuatKho[0]?.phoneNguoiYeuCau ??
            phieuXuatKho[0]?.phonenguoiyeucau ??
            phieuXuatKho[0]?.sodienthoai ??
            "Không xác định"}
        </p>
        <p>
          <strong>Mã người dùng:</strong>{" "}
          {phieuXuatKho[0]?.idnguoidung || "Không xác định"}
        </p>
        <p>
          <strong>Tên người dùng:</strong>{" "}
          {phieuXuatKho[0]?.tennguoidung || "Không xác định"}
        </p>

        {/* Bảng dữ liệu */}
        <table
          border="1"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px" }}>Mã Vật Tư</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Tên Vật Tư</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Số Lượng</th>
              <th style={{ textAlign: "left", padding: "8px" }}>Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            {phieuXuatKho.map((item) => (
              <tr key={item.idvattu}>
                <td style={{ padding: "4px" }}>{item.idvattu}</td>
                <td style={{ padding: "8px" }}>{item.tenvattu}</td>
                <td style={{ padding: "8px" }}>{item.soluong}</td>
                <td style={{ padding: "8px" }}>{item.dongia}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Chữ ký */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: "50px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p>
              <strong>Người yêu cầu</strong>
            </p>
            <p>(Ký và ghi rõ họ tên)</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p>
              <strong>Người dùng</strong>
            </p>
            <p>(Ký và ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      {/* Nút xuất PDF */}
      <button
        onClick={handleExportPdf}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          borderRadius: "5px",
        }}
      >
        Xuất PDF
      </button>
    </div>
  );
};

export default XuatKhoPdf;
