import React, { useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { formatDateToDDMMYYYY } from "../../utils/utils"; // Import formatDateToDDMMYYYY function
import logo from "../../assets/myicon.png";

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

  // Tính tổng thành tiền
  const total =
    phieuXuatKho?.reduce(
      (sum, item) => sum + (item.soluong * item.dongia || 0),
      0
    ) || 0;

  return (
    <div>
      <div
        ref={pdfRef}
        style={{
          padding: "20px",
          marginBottom: "20px",
          backgroundColor: "#fff",
          fontSize: "18px",
          lineHeight: "1.25",
          minWidth: "800px",
        }}
      >
        {/* Header */}
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 10 }}
        >
          {/* Logo và tên */}
          <div style={{ flex: 1, textAlign: "center" }}>
            <img src={logo} alt="Logo" style={{ width: 70, height: 70 }} />
            <div style={{ fontWeight: "bold", fontSize: 18 }}>KKTL</div>
          </div>
          {/* Tiêu đề */}
          <div style={{ flex: 2, textAlign: "center" }}>
            <div style={{ fontWeight: "bold", fontSize: 28, letterSpacing: 2 }}>
              PHIẾU XUẤT KHO
            </div>
            <div style={{ marginTop: 10, fontSize: 16 }}>
              Ngày xuất: {formatDateToDDMMYYYY(new Date())}
            </div>
            <div style={{ fontSize: 16 }}>
              Mã phiếu: {phieuXuatKho[0]?.idxuatkho || "Không xác định"}
            </div>
          </div>
          <div style={{ flex: 1 }}></div>
        </div>
        {/* Divider */}
        <hr style={{ border: "1px solid #000", margin: "10px 0" }} />

        {/* Thông tin người yêu cầu và người dùng */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: 30,
            marginTop: 30,
          }}
        >
          <div>
            <div>
              <strong>Người yêu cầu:</strong>{" "}
              {phieuXuatKho[0]?.nguoiyeucau || "Không xác định"}
            </div>
            <div>
              <strong>Số điện thoại:</strong>{" "}
              {phieuXuatKho[0]?.phonenguoiyeucau || "Không xác định"}
            </div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}></div>
          <div>
            <div>
              <strong>Người xuất kho:</strong>{" "}
              {phieuXuatKho[0]?.tennguoidung || "Không xác định"}
            </div>
            <div>
              <strong>Mã số:</strong>{" "}
              {phieuXuatKho[0]?.idnguoidung || "Không xác định"}
            </div>
          </div>
        </div>

        {/* Bảng vật tư */}
        <table
          border="1"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "10px",
            fontSize: "16px",
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: "6px" }}>Mã Vật Tư</th>
              <th style={{ padding: "6px" }}>Tên Vật Tư</th>
              <th style={{ padding: "6px" }}>Số Lượng</th>
              <th style={{ padding: "6px" }}>Đơn giá (VNĐ)</th>
              <th style={{ padding: "6px" }}>Thành tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {phieuXuatKho.map((item) => (
              <tr key={item.idvattu}>
                <td style={{ padding: "6px", textAlign: "center" }}>
                  {item.idvattu}
                </td>
                <td style={{ padding: "6px" }}>{item.tenvattu}</td>
                <td style={{ padding: "6px", textAlign: "center" }}>
                  {item.soluong}
                </td>
                <td style={{ padding: "6px", textAlign: "right" }}>
                  {item.dongia?.toLocaleString("vi-VN")}
                </td>
                <td style={{ padding: "6px", textAlign: "right" }}>
                  {(item.soluong * item.dongia)?.toLocaleString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng cộng */}
        <div
          style={{
            textAlign: "right",
            marginTop: 10,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          Tổng cộng: {total.toLocaleString("vi-VN")} VNĐ
        </div>

        {/* Chữ ký */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "100px",
            padding: "0 40px",
          }}
        >
          <div style={{ textAlign: "center", width: "40%" }}>
            <div>
              <strong>Người yêu cầu</strong>
            </div>
            <div>(Ký và ghi rõ họ tên)</div>
          </div>
          <div style={{ textAlign: "center", width: "40%" }}>
            <div>
              <strong>Người xuất kho</strong>
            </div>
            <div>(Ký và ghi rõ họ tên)</div>
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
