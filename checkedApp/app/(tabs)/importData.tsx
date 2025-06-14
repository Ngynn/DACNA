import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API_URL from "../../config/api";

type ImportItem = {
  id: string;
  idncc: string;
  tongtien: number;
  tongtienthucte: number;
  ngaydukiennhapkho: string;
  ngaythuctenhapkho: string;
  vattu: string;
  idvattu: string;
  soluong: string;
  soluongthucte: string;
  dongianhap: string;
};

type VatTu = {
  idvattu: number;
  tenvattu: string;
  tendanhmuc: string;
  donvi: string;
};

export default function ImportData() {
  const [importData, setImportData] = useState<ImportItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ImportItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{
    show: boolean;
    field: "expected" | "actual" | null;
  }>({ show: false, field: null });

  const [vattuList, setVattuList] = useState<VatTu[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVattuPicker, setShowVattuPicker] = useState(false);

  const [formData, setFormData] = useState({
    idncc: "",
    ngaydukiennhapkho: "",
    ngaythuctenhapkho: "",
    vattu: "",
    idvattu: "",
    soluong: "",
    soluongthucte: "",
    dongianhap: "",
  });

  useEffect(() => {
    fetchVattuList();
  }, []);

  const fetchVattuList = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Lỗi", "Phiên làm việc hết hạn, vui lòng đăng nhập lại");
        return;
      }

      // console.log("Fetching vattu list...");
      const response = await axios.get(`${API_URL}/api/vattu`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Vattu list response:", {
        status: response.status,
        dataLength: response.data.length,
        sampleData: response.data.slice(0, 3),
      });

      setVattuList(response.data);
    } catch (error) {
      console.error("Error fetching vattu list:", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      Alert.alert("Lỗi", "Không thể tải danh sách vật tư");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = (soluong: string, dongia: string): number => {
    const sl = parseInt(soluong) || 0;
    const dg = parseInt(dongia) || 0;
    return sl * dg;
  };

  const calculateActualTotalPrice = (
    soluongthucte: string,
    dongia: string
  ): number => {
    const sl = parseInt(soluongthucte) || 0;
    const dg = parseInt(dongia) || 0;
    return sl * dg;
  };

  const generatePhieuNhapId = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const time = now.getTime().toString().slice(-4);
    return `PN${year}${month}${day}${time}`;
  };

  const resetForm = () => {
    setFormData({
      idncc: "",
      ngaydukiennhapkho: "",
      ngaythuctenhapkho: "",
      vattu: "",
      idvattu: "",
      soluong: "",
      soluongthucte: "",
      dongianhap: "",
    });
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (
      !formData.vattu ||
      !formData.idvattu ||
      !formData.soluong ||
      !formData.dongianhap
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    // ✅ Tính toán tự động
    const tongtien = calculateTotalPrice(formData.soluong, formData.dongianhap);
    const tongtienthucte = formData.soluongthucte
      ? calculateActualTotalPrice(formData.soluongthucte, formData.dongianhap)
      : tongtien; // Nếu không có số lượng thực tế, dùng số lượng dự kiến

    const newItem: ImportItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      idncc: formData.idncc || generatePhieuNhapId(), // Auto-generate nếu rỗng
      tongtien,
      tongtienthucte,
      ngaydukiennhapkho: formData.ngaydukiennhapkho,
      ngaythuctenhapkho: formData.ngaythuctenhapkho,
      vattu: formData.vattu,
      idvattu: formData.idvattu,
      soluong: formData.soluong,
      soluongthucte: formData.soluongthucte,
      dongianhap: formData.dongianhap,
    };

    if (editingItem) {
      setImportData((prev) =>
        prev.map((item) => (item.id === editingItem.id ? newItem : item))
      );
    } else {
      setImportData((prev) => [...prev, newItem]);
    }

    resetForm();
    setShowForm(false);
  };

  const handleEditItem = (item: ImportItem) => {
    setFormData({
      idncc: item.idncc,
      ngaydukiennhapkho: item.ngaydukiennhapkho,
      ngaythuctenhapkho: item.ngaythuctenhapkho,
      vattu: item.vattu,
      idvattu: item.idvattu,
      soluong: item.soluong,
      soluongthucte: item.soluongthucte,
      dongianhap: item.dongianhap,
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa mục này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          setImportData((prev) => prev.filter((item) => item.id !== id)),
      },
    ]);
  };

  // ✅ Handle chọn vật tư từ picker
  const handleVattuSelect = (vattu: VatTu) => {
    console.log("🔍 Selected vattu:", vattu);
    setFormData((prev) => ({
      ...prev,
      vattu: vattu.tenvattu,
      idvattu: vattu.idvattu.toString(),
    }));
    setShowVattuPicker(false);
  };

  // ✅ Handle date change với validation
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker({ show: false, field: null });

    if (selectedDate && showDatePicker.field) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time để so sánh chỉ ngày

      // ✅ Kiểm tra ngày không được trong quá khứ
      if (selectedDate < today) {
        Alert.alert(
          "Ngày không hợp lệ",
          "Không thể chọn ngày trong quá khứ. Vui lòng chọn từ ngày hôm nay trở đi."
        );
        return;
      }

      const formattedDate = selectedDate.toLocaleDateString("vi-VN");

      if (showDatePicker.field === "expected") {
        setFormData((prev) => ({ ...prev, ngaydukiennhapkho: formattedDate }));
      } else if (showDatePicker.field === "actual") {
        setFormData((prev) => ({ ...prev, ngaythuctenhapkho: formattedDate }));
      }
    }
  };

  // ✅ Get minimum date (today)
  const getMinimumDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const exportToExcel = async () => {
    if (importData.length === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu để xuất");
      return;
    }

    try {
      const excelData = importData.map((item, index) => ({
        idncc: item.idncc,
        tongtien: item.tongtien,
        tongtienthucte: item.tongtienthucte,
        ngaydukiennhapkho: item.ngaydukiennhapkho || "",
        ngaydukienxuatkho: item.ngaythuctenhapkho || "",
        vattu: item.vattu,
        idvattu: item.idvattu,
        soluong: parseInt(item.soluong) || 0,
        soluongthucte: parseInt(item.soluongthucte) || 0,
        dongianhap: parseInt(item.dongianhap) || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      const columnWidths = [
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
        { wch: 25 },
        { wch: 10 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
      ];
      worksheet["!cols"] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Phiếu nhập kho");

      const wbout = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
      const now = new Date();
      const timestamp = now.toISOString().split("T")[0].replace(/-/g, "");
      const fileName = `PhieuNhapKho_${timestamp}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Xuất file Excel phiếu nhập kho",
      });

      Alert.alert(
        "Thành công",
        `File Excel "${fileName}" đã được tạo và chia sẻ thành công`
      );
    } catch (error) {
      console.error("Lỗi khi xuất Excel:", error);
      Alert.alert("Lỗi", "Không thể xuất file Excel. Vui lòng thử lại.");
    }
  };

  const renderVattuItem = ({ item }: { item: VatTu }) => (
    <TouchableOpacity
      style={styles.vattuPickerItem}
      onPress={() => handleVattuSelect(item)}
    >
      <View style={styles.vattuItemContent}>
        <Text style={styles.vattuItemName}>{item.tenvattu}</Text>
        <Text style={styles.vattuItemInfo}>
          ID: {item.idvattu} • {item.tendanhmuc}
        </Text>
        <Text style={styles.vattuItemUnit}>
          Đơn vị: {item.donvi || "Chưa xác định"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderImportItem = ({ item }: { item: ImportItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.vattu}</Text>
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{item.idncc}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            onPress={() => handleEditItem(item)}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={20} color="#3498db" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>ID vật tư:</Text>
          <Text style={styles.itemValue}>{item.idvattu}</Text>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Số lượng (DK/TT):</Text>
          <Text style={styles.itemValue}>
            {item.soluong}
            {item.soluongthucte ? ` / ${item.soluongthucte}` : ""}
          </Text>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Đơn giá:</Text>
          <Text style={styles.itemValue}>
            {item.dongianhap
              ? `${parseInt(item.dongianhap).toLocaleString("vi-VN")} VNĐ`
              : "Chưa nhập"}
          </Text>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Tổng tiền (DK):</Text>
          <Text
            style={[styles.itemValue, { color: "#27ae60", fontWeight: "bold" }]}
          >
            {item.tongtien.toLocaleString("vi-VN")} VNĐ
          </Text>
        </View>

        {item.tongtienthucte !== item.tongtien && (
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Tổng tiền (TT):</Text>
            <Text
              style={[
                styles.itemValue,
                { color: "#e74c3c", fontWeight: "bold" },
              ]}
            >
              {item.tongtienthucte.toLocaleString("vi-VN")} VNĐ
            </Text>
          </View>
        )}

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Ngày dự kiến:</Text>
          <Text style={styles.itemValue}>
            {item.ngaydukiennhapkho || "Chưa nhập"}
          </Text>
        </View>

        <View style={styles.itemRow}>
          <Text style={styles.itemLabel}>Ngày thực tế:</Text>
          <Text style={styles.itemValue}>
            {item.ngaythuctenhapkho || "Chưa nhập"}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhập kho</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          {importData.length > 0 && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportToExcel}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.exportButtonText}>Xuất Excel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {importData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#bdc3c7" />
          <Text style={styles.emptyTitle}>Chưa có dữ liệu nhập kho</Text>
          <Text style={styles.emptyText}>
            Nhấn nút + để thêm mục nhập kho mới
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Tổng số mục:{" "}
              <Text style={styles.summaryNumber}>{importData.length}</Text>
            </Text>
            <Text style={styles.summaryText}>
              Tổng giá trị:{" "}
              <Text style={styles.summaryNumber}>
                {importData
                  .reduce((total, item) => {
                    return total + (item.tongtien || 0);
                  }, 0)
                  .toLocaleString("vi-VN")}{" "}
                VNĐ
              </Text>
            </Text>
          </View>

          <FlatList
            data={importData}
            renderItem={renderImportItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? "Sửa mục nhập kho" : "Thêm mục nhập kho"}
            </Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn vật tư *</Text>
              <TouchableOpacity
                style={styles.vattuSelector}
                onPress={() => setShowVattuPicker(true)}
              >
                <Text
                  style={
                    formData.vattu
                      ? styles.vattuSelectedText
                      : styles.vattuPlaceholderText
                  }
                >
                  {formData.vattu || "Chọn vật tư từ danh sách"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
              </TouchableOpacity>
              {formData.vattu && (
                <View style={styles.selectedVattuInfo}>
                  <Text style={styles.selectedVattuText}>
                    Đã chọn: {formData.vattu} (ID: {formData.idvattu})
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ngày dự kiến nhập kho *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() =>
                  setShowDatePicker({ show: true, field: "expected" })
                }
              >
                <Text
                  style={
                    formData.ngaydukiennhapkho
                      ? styles.dateText
                      : styles.datePlaceholder
                  }
                >
                  {formData.ngaydukiennhapkho ||
                    "Chọn ngày dự kiến (từ hôm nay)"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ngày thực tế nhập kho *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() =>
                  setShowDatePicker({ show: true, field: "actual" })
                }
              >
                <Text
                  style={
                    formData.ngaythuctenhapkho
                      ? styles.dateText
                      : styles.datePlaceholder
                  }
                >
                  {formData.ngaythuctenhapkho ||
                    "Chọn ngày thực tế (từ hôm nay)"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            {/* Số lượng */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số lượng *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.soluong}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, soluong: text }))
                }
                placeholder="Ví dụ: 5, 10, 20..."
                keyboardType="numeric"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            {/* Số lượng thực tế */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số lượng thực tế *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.soluongthucte}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, soluongthucte: text }))
                }
                placeholder="Ví dụ: 5, 10, 20..."
                keyboardType="numeric"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            {/* Đơn giá nhập */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Đơn giá nhập (VNĐ) *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.dongianhap}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, dongianhap: text }))
                }
                placeholder="Ví dụ: 8000, 12000, 15000..."
                keyboardType="numeric"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formFooter}>
              <Text style={styles.noteText}>* Trường bắt buộc</Text>
              <Text style={styles.noteText}>
                Ngày chỉ được chọn từ hôm nay trở đi
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/*  Vật tư Picker Modal */}
      <Modal
        visible={showVattuPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVattuPicker(false)}>
              <Ionicons name="close" size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn vật tư</Text>
            <TouchableOpacity onPress={fetchVattuList} disabled={loading}>
              <Ionicons
                name="refresh"
                size={24}
                color={loading ? "#bdc3c7" : "#3498db"}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                Đang tải danh sách vật tư...
              </Text>
            </View>
          ) : (
            <FlatList
              data={vattuList}
              renderItem={renderVattuItem}
              keyExtractor={(item) => item.idvattu.toString()}
              contentContainerStyle={styles.vattuListContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>

      {showDatePicker.show && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={getMinimumDate()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#3498db",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27ae60",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  summaryNumber: {
    fontWeight: "bold",
    color: "#2c3e50",
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
  },
  itemBadge: {
    backgroundColor: "#d1e7dd",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 12,
  },
  itemBadgeText: {
    color: "#0f5132",
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  itemDetails: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  itemValue: {
    fontSize: 14,
    color: "#34495e",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  saveButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#2c3e50",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dateText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#bdc3c7",
  },
  formFooter: {
    marginTop: 20,
    marginBottom: 40,
  },
  noteText: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginBottom: 4,
  },

  // ✅ New styles for vật tư picker
  vattuSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  vattuSelectedText: {
    fontSize: 16,
    color: "#2c3e50",
    flex: 1,
  },
  vattuPlaceholderText: {
    fontSize: 16,
    color: "#bdc3c7",
    flex: 1,
  },
  selectedVattuInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#d5edda",
    borderRadius: 6,
  },
  selectedVattuText: {
    fontSize: 14,
    color: "#155724",
    fontWeight: "500",
  },
  vattuListContainer: {
    padding: 16,
  },
  vattuPickerItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vattuItemContent: {
    gap: 4,
  },
  vattuItemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  vattuItemInfo: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  vattuItemUnit: {
    fontSize: 12,
    color: "#95a5a6",
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
  },
});
