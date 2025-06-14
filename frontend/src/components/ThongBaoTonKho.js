import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const ThongBaoTonKho = ({ onWarningsUpdate }) => {
  const [tonKhoData, setTonKhoData] = useState([]);

  useEffect(() => {
    const fetchTonKho = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:3000/tonkho", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTonKhoData(response.data);
      } catch (err) {
        console.error("Error fetching inventory data:", err);
      }
    };

    fetchTonKho();
  }, []);

  // kiem tra ngay sap het han
  const getExpiringSoon = (ngayHetHan) => {
    if (!ngayHetHan) return false;
    const today = new Date();
    const expiryDate = new Date(ngayHetHan);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14 && diffDays >= 0;
  };

  // kiem tra ngay da het han
  const getExpired = (ngayHetHan) => {
    if (!ngayHetHan) return false;
    const today = new Date();
    const expiryDate = new Date(ngayHetHan);
    return expiryDate < today;
  };

  // Tính cảnh báo với useMemo (chỉ chạy lại khi tonKhoData thay đổi) k chạy nhiều dẫn đến chậm ứng dụng
  const canhBao = useMemo(() => {
    if (tonKhoData.length === 0) return null;

    const soLuongIt = tonKhoData.filter(
      (item) => Number(item.tonkhothucte) > 0 && Number(item.tonkhothucte) < 30
    );

    const sapHetHan = tonKhoData.filter((item) =>
      getExpiringSoon(item.ngayhethan)
    );

    const daHetHan = tonKhoData.filter((item) => getExpired(item.ngayhethan));

    const hetVatTu = tonKhoData.filter(
      (item) => Number(item.tonkhothucte) === 0
    );

    return {
      soLuongIt,
      sapHetHan,
      daHetHan,
      hetVatTu,
    };
  }, [tonKhoData]);

  // Gửi dữ liệu cảnh báo khi đã có kết quả
  useEffect(() => {
    if (canhBao) {
      onWarningsUpdate(canhBao);
    }
  }, [canhBao, onWarningsUpdate]);



  return null; // Không hiển thị gì
};

export default ThongBaoTonKho;
