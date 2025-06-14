import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import API_URL from "@/config/api";

type TonKhoItem = {
  id?: string;
  idvattu: number;
  tenvattu: string;
  tonkhohientai: number;
  tonkhothucte: number;
  tonghaohut?: number;
  ngayhethan?: string;
  soluonghaohut?: number;
  noidung?: string;
  checked: boolean;
};

type TabType = "all" | "checked" | "unchecked" | "haohut";

export default function KiemKeDetail() {
  const router = useRouter();
  const { idkiemke, ngaykiem, tennguoidung } = useLocalSearchParams();

  const [tonkhoData, setTonkhoData] = useState<TonKhoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TonKhoItem | null>(null);
  const [formData, setFormData] = useState({
    soluonghaohut: "",
    noidung: "",
  });

  const fetchTonKhoAndKiemKe = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Thông báo",
          "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
        );
        router.replace("/screens/login");
        return;
      }

      const response = await axios.get(`${API_URL}/api/kiemke/${idkiemke}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { vattu } = response.data;

      const mappedData: TonKhoItem[] = vattu.map(
        (item: any, index: number) => ({
          id: `${item.idvattu}-${index}`,
          idvattu: item.idvattu,
          tenvattu: item.tenvattu || "Không có tên",
          // ✅ Chuyển đổi sang number một cách rõ ràng
          tonkhohientai: Number(item.tonkhohientai) || 0,
          tonkhothucte: Number(item.tonkhothucte) || 0,
          tonghaohut: Number(item.tonghaohut) || 0,
          ngayhethan: item.ngayhethan,
          soluonghaohut: Number(item.soluonghaohut) || 0,
          noidung: item.noidung || "",
          checked: item.checked || false,
        })
      );

      const uniqueData = mappedData.filter(
        (item, index, arr) =>
          arr.findIndex((t) => t.idvattu === item.idvattu) === index
      );
      uniqueData.sort((a, b) => a.idvattu - b.idvattu);

      setTonkhoData(uniqueData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu tồn kho");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveLichSuKiemKe = async (item: TonKhoItem) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return false;

      await axios.post(
        `${API_URL}/api/lichsukiemke`,
        {
          idkiemke: parseInt(idkiemke as string),
          idvattu: item.idvattu,
          soluonghaohut: item.soluonghaohut || 0,
          noidung: item.noidung || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTonkhoData((prev) =>
        prev.map((tonkhoItem) =>
          tonkhoItem.idvattu === item.idvattu
            ? {
                ...tonkhoItem,
                checked: true,
                soluonghaohut: item.soluonghaohut,
                noidung: item.noidung,
              }
            : tonkhoItem
        )
      );

      Alert.alert("Thành công", "Đã lưu thông tin kiểm kê");
      return true;
    } catch (error) {
      console.error("Lỗi khi lưu kiểm kê:", error);
      Alert.alert("Lỗi", "Không thể lưu thông tin kiểm kê");
      return false;
    }
  };

  useEffect(() => {
    fetchTonKhoAndKiemKe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTonKhoAndKiemKe();
  };

  const getFilteredData = () => {
    let filtered = [];

    switch (activeTab) {
      case "checked":
        filtered = tonkhoData.filter((item) => item.checked);
        break;
      case "unchecked":
        filtered = tonkhoData.filter((item) => !item.checked);
        break;
      case "haohut":
        filtered = tonkhoData.filter(
          (item) => item.checked && (item.soluonghaohut || 0) > 0
        );
        break;
      default:
        filtered = [...tonkhoData];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.tenvattu.toLowerCase().includes(query) ||
          String(item.idvattu).includes(query)
      );
    }

    return filtered;
  };

  const handleOpenModal = (item: TonKhoItem) => {
    setSelectedItem(item);
    setFormData({
      soluonghaohut: item.soluonghaohut?.toString() || "",
      noidung: item.noidung || "",
    });
    setShowModal(true);
  };

  const handleSaveItem = () => {
    if (!selectedItem) return;

    const soluonghaohut = parseInt(formData.soluonghaohut) || 0;
    // const tonkho = selectedItem.tonkhothucte || selectedItem.tonkhohientai || 0;

    const tonkho = selectedItem.tonkhohientai || 0;

    if (soluonghaohut < 0 || soluonghaohut > tonkho) {
      Alert.alert("Lỗi", `Số lượng hao hụt phải từ 0 đến ${tonkho}`);
      return;
    }

    const updatedItem: TonKhoItem = {
      ...selectedItem,
      soluonghaohut,
      noidung: formData.noidung,
    };

    saveLichSuKiemKe(updatedItem);
    setShowModal(false);
  };

  const renderItem = ({ item }: { item: TonKhoItem }) => {
    // ✅ KHÔNG trừ thêm soluonghaohut vì tonkhothucte đã được tính sẵn
    // tonkhothucte = tonkhohientai - tonghaohut (đã bao gồm soluonghaohut)
    const tonkhoSauKiemKe = item.tonkhothucte;

    return (
      <View style={styles.itemContainer}>
        {/* Header */}
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemName}>{item.tenvattu}</Text>
            <Text style={styles.itemCode}>ID: {item.idvattu}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.checked ? styles.checkedBadge : styles.uncheckedBadge,
            ]}
          >
            <Ionicons
              name={item.checked ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={item.checked ? "#27ae60" : "#95a5a6"}
            />
            <Text
              style={[
                styles.statusText,
                item.checked ? styles.checkedText : styles.uncheckedText,
              ]}
            >
              {item.checked ? "Đã kiểm" : "Chưa kiểm"}
            </Text>
          </View>
        </View>

        {/* ✅ Thông tin tồn kho chi tiết */}
        <View style={styles.stockInfo}>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Tồn kho hiện tại:</Text>
            <Text style={styles.stockValue}>{item.tonkhohientai}</Text>
          </View>

          {/* ✅ Hiển thị tổng hao hụt từ tất cả các lần kiểm kê */}
          {(item.tonghaohut || 0) > 0 && (
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Tổng hao hụt (lịch sử):</Text>
              <Text style={[styles.stockValue, { color: "#e74c3c" }]}>
                {item.tonghaohut}
              </Text>
            </View>
          )}

          {/* ✅ Hiển thị tồn kho thực tế (đã trừ tổng hao hụt) */}
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Tồn kho thực tế:</Text>
            <Text style={[styles.stockValue, { color: "#8e44ad" }]}>
              {item.tonkhothucte}
            </Text>
          </View>

          {item.checked && (
            <>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Hao hụt lần này:</Text>
                <Text
                  style={[
                    styles.stockValue,
                    item.soluonghaohut! > 0
                      ? styles.lossText
                      : styles.normalText,
                  ]}
                >
                  {item.soluonghaohut || 0}
                </Text>
              </View>

              {/* ✅ Sửa logic hiển thị kết quả */}
              <View style={[styles.stockRow, styles.resultRow]}>
                <Text style={styles.resultLabel}>
                  Tồn kho hiện tại (đã kiểm):
                </Text>
                <Text style={styles.resultValue}>{tonkhoSauKiemKe}</Text>
              </View>
            </>
          )}
        </View>

        {/* Ghi chú */}
        {item.checked && item.noidung && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>💬 {item.noidung}</Text>
          </View>
        )}

        {/* Hạn sử dụng */}
        {item.ngayhethan && (
          <View style={styles.expiryContainer}>
            <Text
              style={[
                styles.expiryText,
                new Date(item.ngayhethan) < new Date()
                  ? styles.expiredText
                  : styles.validText,
              ]}
            >
              HSD: {new Date(item.ngayhethan).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        )}

        {/* Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.checked ? styles.editButton : styles.checkButton,
          ]}
          onPress={() => handleOpenModal(item)}
        >
          <Ionicons
            name={item.checked ? "create-outline" : "add-circle-outline"}
            size={18}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {item.checked ? "Chỉnh sửa" : "Kiểm kê"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummaryStats = () => {
    const totalItems = tonkhoData.length;
    const checkedItems = tonkhoData.filter((item) => item.checked).length;

    // ✅ Đảm bảo cộng số, không phải string
    const totalHaoHutLanNay = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.soluonghaohut) || 0),
      0
    );
    const totalHaoHutLichSu = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonghaohut) || 0),
      0
    );
    const totalTonKhoHienTai = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonkhohientai) || 0),
      0
    );
    const totalTonKhoThucTe = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonkhothucte) || 0),
      0
    );

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📊 Tổng quan kiểm kê</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tiến độ</Text>
            <Text style={styles.summaryValue}>
              {checkedItems}/{totalItems}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tồn kho hiện tại</Text>
            <Text style={styles.summaryValue}>{totalTonKhoHienTai}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tồn kho thực tế</Text>
            <Text style={[styles.summaryValue, { color: "#8e44ad" }]}>
              {totalTonKhoThucTe}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Hao hụt lần này</Text>
            <Text style={[styles.summaryValue, { color: "#e74c3c" }]}>
              {totalHaoHutLanNay}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const filteredData = getFilteredData();
  const uncheckedCount = tonkhoData.filter((item) => !item.checked).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Phiếu #{idkiemke}</Text>
          <Text style={styles.headerSubtitle}>
            {new Date(ngaykiem as string).toLocaleDateString("vi-VN")} •{" "}
            {tennguoidung}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowSearchBar(!showSearchBar)}
          style={styles.searchButton}
        >
          <Ionicons name="search-outline" size={20} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm vật tư..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "unchecked", "checked", "haohut"] as TabType[]).map(
            (tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab ? styles.activeTab : styles.inactiveTab,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab
                      ? styles.activeTabText
                      : styles.inactiveTabText,
                  ]}
                >
                  {tab === "all" && "Tất cả"}
                  {tab === "unchecked" && "Chưa kiểm"}
                  {tab === "checked" && "Đã kiểm"}
                  {tab === "haohut" && "Có hao hụt"}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Hiển thị:{" "}
          <Text style={styles.statsNumber}>{filteredData.length}</Text> vật tư
        </Text>
        {uncheckedCount > 0 && (
          <Text style={styles.uncheckedInfo}>Chưa kiểm: {uncheckedCount}</Text>
        )}
      </View>

      {/* Summary Stats */}
      {tonkhoData.length > 0 && renderSummaryStats()}

      {/* List */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || `${item.idvattu}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>Không có vật tư nào</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Kiểm kê: {selectedItem?.tenvattu}
            </Text>
            <TouchableOpacity
              onPress={handleSaveItem}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Thông tin vật tư</Text>
              <Text style={styles.infoText}>ID: {selectedItem?.idvattu}</Text>
              <Text style={styles.infoText}>
                Tồn kho hiện tại: {selectedItem?.tonkhohientai}
              </Text>

              {/* ✅ Hiển thị rõ ràng các loại hao hụt */}
              {(selectedItem?.tonghaohut || 0) > 0 && (
                <Text style={[styles.infoText, { color: "#e74c3c" }]}>
                  Tổng hao hụt (lịch sử): {selectedItem?.tonghaohut}
                </Text>
              )}

              <Text style={styles.infoText}>
                Tồn kho thực tế: {selectedItem?.tonkhothucte}
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Số lượng hao hụt</Text>
              <TextInput
                style={styles.textInput}
                value={formData.soluonghaohut}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, soluonghaohut: text }))
                }
                placeholder="Nhập số lượng hao hụt"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Ghi chú</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={formData.noidung}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, noidung: text }))
                }
                placeholder="Nhập ghi chú (nếu có)"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  searchInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tabContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
    backgroundColor: "#fff",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "#3498db",
  },
  inactiveTab: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  activeTabText: {
    color: "#fff",
  },
  inactiveTabText: {
    color: "#7f8c8d",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  statsText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  statsNumber: {
    fontWeight: "bold",
    color: "#2c3e50",
  },
  uncheckedInfo: {
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "bold",
  },
  listContainer: {
    padding: 20,
  },
  itemContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  checkedBadge: {
    backgroundColor: "#d4edda",
  },
  uncheckedBadge: {
    backgroundColor: "#f8f9fa",
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  checkedText: {
    color: "#155724",
  },
  uncheckedText: {
    color: "#6c757d",
  },
  stockInfo: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  resultRow: {
    backgroundColor: "#e8f5e8",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  stockLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  resultLabel: {
    fontSize: 14,
    color: "#2e7d32",
    fontWeight: "600",
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
  },
  resultValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2e7d32",
  },
  lossText: {
    color: "#dc2626",
  },
  normalText: {
    color: "#059669",
  },
  noteContainer: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: "#856404",
  },
  expiryContainer: {
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 13,
    fontWeight: "500",
  },
  validText: {
    color: "#27ae60",
  },
  expiredText: {
    color: "#e74c3c",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  checkButton: {
    backgroundColor: "#3498db",
  },
  editButton: {
    backgroundColor: "#f39c12",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7f8c8d",
    marginTop: 16,
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
    flex: 1,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
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
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
});
