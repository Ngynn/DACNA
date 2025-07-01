import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

const SoSanhBaoGia = () => {
    const [companyData, setCompanyData] = useState([]);

    // Xử lý upload file báo giá
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const binaryStr = e.target.result;
            const workbook = XLSX.read(binaryStr, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            setCompanyData((prevData) => [
                ...prevData,
                { companyName: file.name, data: sheetData },
            ]);
        };
        reader.readAsBinaryString(file);
    };

    // Tính tổng tiền cho từng công ty
    const calculateTotalForCompany = (data) => {
        return data.reduce((total, row) => {
            const thanhTien = parseFloat(row["Thành Tiền (VNĐ)"]?.toString().replace(/,/g, "") || 0);
            return total + thanhTien;
        }, 0);
    };

    // Tìm công ty có tổng tiền thấp nhất và so sánh giá từng mặt hàng
    const getBestCompaniesByTotal = (chartData) => {
        if (chartData.length === 0) return [];
        const minTotal = Math.min(...chartData.map(c => c.total));
        return chartData.filter(c => c.total === minTotal);
    };

    // tim cong ty co gia thap nhat cho tung vat tu
    const getBestCompanyByItem = (companyData) => {
        const itemComparison = {};
        companyData.forEach((company) => {
            company.data.forEach((item) => {
                const itemName = item["Tên Vật Tư"];
                const itemPrice = parseFloat(item["Đơn Giá (VNĐ)"]?.toString().replace(/,/g, "") || 0);
                if (!itemComparison[itemName] || itemPrice < itemComparison[itemName].price) {
                    itemComparison[itemName] = {
                        companyName: company.companyName,
                        price: itemPrice,
                    };
                }
            });
        });
        return itemComparison;
    };

    // data cho chart, tinh tong tien cho tung cong ty
    const chartData = companyData.map((company) => ({
        name: company.companyName,
        total: calculateTotalForCompany(company.data),
    }));

    const bestCompaniesByTotal = getBestCompaniesByTotal(chartData);
    const bestCompanyByItem = getBestCompanyByItem(companyData);

    // lay danh sach tat ca mat hang tu tat ca cong ty
    const allItems = Array.from(
        new Set(companyData.flatMap(company =>
            company.data.map(item => item["Tên Vật Tư"])
        ))
    );

    // tao data cho bieu do so sanh gia tung mat hang
    const itemCompareChartData = allItems.map(itemName => {
        const row = { itemName };
        companyData.forEach(company => {
            const found = company.data.find(item => item["Tên Vật Tư"] === itemName);
            row[company.companyName.replace(".xlsx", "")] = found
                ? parseFloat(found["Đơn Giá (VNĐ)"]?.toString().replace(/,/g, "") || 0)
                : null;
        });
        return row;
    });

    return (
        <Box sx={{ padding: "20px" }}>
            <h1>So Sánh Báo Giá</h1>

            {/* Upload file báo giá */}
            <Box sx={{ marginBottom: "20px" }}>
                <h3>Hãy upload file báo giá từ các công ty</h3>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                />
            </Box>

            {/* Hiển thị biểu đồ tổng tiền */}
            <Box sx={{ marginTop: "40px" }}>
                <h3>Biểu Đồ So Sánh Báo Giá</h3>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                        >
                            <XAxis dataKey="name" />
                            <YAxis
                                allowDecimals={false}
                                tickFormatter={(value) => value.toLocaleString("vi-VN")}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" fill="#8884d8" name="Tổng Tiền (VNĐ)" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Typography variant="body1">Vui lòng upload file báo giá để so sánh.</Typography>
                )}
            </Box>

            {/* Hiển thị đánh giá */}
            <Box sx={{ marginTop: "40px" }}>
                <h3>Đánh Giá</h3>
                {bestCompaniesByTotal.length > 0 && (
                    <Typography variant="body1">
                        Công ty có tổng tiền thấp nhất:{" "}
                        <strong>
                            {bestCompaniesByTotal.map(c => c.name.replace(".xlsx", "")).join(", ")}
                        </strong>{" "}
                        với tổng tiền <strong>{bestCompaniesByTotal[0].total.toLocaleString("vi-VN")} VNĐ</strong>.
                    </Typography>
                )}
                <Typography variant="body1" sx={{ marginTop: "20px" }}>
                    So sánh giá từng mặt hàng giữa các công ty:
                </Typography>
                {/* Biểu đồ so sánh giá từng mặt hàng */}
                {itemCompareChartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={itemCompareChartData.length * 60}>
                        <BarChart
                            data={itemCompareChartData}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                        >
                            <XAxis
                                type="number"
                                allowDecimals={false}
                                tickFormatter={(value) => value.toLocaleString("vi-VN")}
                            />
                            <YAxis
                                dataKey="itemName"
                                type="category"
                                width={200}
                            />
                            <Tooltip
                                formatter={(value) =>
                                    value !== null ? value.toLocaleString("vi-VN") + " VNĐ" : "Không báo giá"
                                }
                                labelFormatter={(label) => `Mặt hàng: ${label}`}
                            />
                            <Legend />
                            {companyData.map((company, idx) => (
                                <Bar
                                    key={company.companyName}
                                    dataKey={company.companyName.replace(".xlsx", "")}
                                    fill={["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"][idx % 5]}
                                    name={company.companyName.replace(".xlsx", "")}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}
                <Typography variant="body2" sx={{ marginTop: "16px" }}>
                    <strong>Lưu ý:</strong> Nếu một công ty không báo giá cho mặt hàng nào đó, cột sẽ không hiển thị.
                </Typography>
                <ul>
                    {Object.entries(bestCompanyByItem).map(([itemName, { companyName, price }]) => (
                        <li key={itemName}>
                            {itemName}: <strong>{companyName.replace(".xlsx", "")}</strong> với giá <strong>{price.toLocaleString("vi-VN")} VNĐ</strong>
                        </li>
                    ))}
                </ul>
            </Box>
        </Box>
    );
};

export default SoSanhBaoGia;