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
import AdvancedFilters from "@/components/AdvancedFiltersProps";

type TonKhoItem = {
  idvattu: number;
  tenvattu: string;
  tonkhohientai: number; // Tồn kho hiện tại (không đổi)
  tonkhothucte_current: number; // Tồn kho thực tế hiện tại
  tonkhothucte_base: number; // Tồn kho từ phiếu trước
  tonghaohut_history: number; // Tổng hao hụt từ các phiếu trước
  soluonghaohut_current: number; // Hao hụt phiếu hiện tại
  ngayhethan?: string;
  noidung?: string;
  checked: boolean;
};

// ✅ Simplified Tab Types - chỉ giữ những tab chính
type TabType = "all" | "checked" | "unchecked" | "haohut";

// ✅ Enhanced Filter Types cho bộ lọc nâng cao
type PriorityFilter = "all" | "critical" | "expired" | "nearExpiry" | "normal";
type CategoryFilter = "all" | "medicine" | "equipment" | "consumable" | "other";
type StockFilter = "all" | "lowStock" | "highStock" | "outOfStock";

export default function KiemKeDetail() {
  const router = useRouter();
  const { idkiemke, ngaykiem, tennguoidung } = useLocalSearchParams();

  const [tonkhoData, setTonkhoData] = useState<TonKhoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

      // ✅ Gọi endpoint đã được enhance
      const response = await axios.get(`${API_URL}/api/kiemke/${idkiemke}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { vattu } = response.data;

      // ✅ Map data mới với các field từ backend
      const mappedData: TonKhoItem[] = vattu.map((item: any) => ({
        idvattu: item.idvattu,
        tenvattu: item.tenvattu || "Không có tên",
        tonkhohientai: Number(item.tonkhohientai) || 0,
        tonkhothucte_current: Number(item.tonkhothucte_current) || 0,
        tonkhothucte_base: Number(item.tonkhothucte_base) || 0,
        tonghaohut_history: Number(item.tonghaohut_history) || 0,
        soluonghaohut_current: Number(item.soluonghaohut_current) || 0,
        ngayhethan: item.ngayhethan,
        noidung: item.noidung || "",
        checked: !!item.checked,
      }));

      setTonkhoData(mappedData);
      // console.log("✅ Mapped data:", mappedData.slice(0, 3)); // Debug log
    } catch (error) {
      // console.error("Lỗi khi lấy dữ liệu:", error);
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
          soluonghaohut: item.soluonghaohut_current || 0,
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
                soluonghaohut_current: item.soluonghaohut_current,
                tonkhothucte_current: item.tonkhothucte_current,
                noidung: item.noidung,
              }
            : tonkhoItem
        )
      );

      Alert.alert("Thành công", "Đã lưu thông tin kiểm kê");
      return true;
    } catch (error) {
      // console.error("Lỗi khi lưu kiểm kê:", error);
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

  // ✅ Enhanced getFilteredData function dựa trên database thực tế
  const getFilteredData = () => {
    let filtered = [...tonkhoData];

    // 1. Lọc theo tab chính (status)
    switch (activeTab) {
      case "checked":
        filtered = filtered.filter((item) => item.checked);
        break;
      case "unchecked":
        filtered = filtered.filter((item) => !item.checked);
        break;
      case "haohut":
        filtered = filtered.filter(
          (item) => item.checked && (item.soluonghaohut_current || 0) > 0
        );
        break;
      default:
        // "all" - không lọc gì
        break;
    }

    // 2. Lọc theo độ ưu tiên (Priority Filter)
    if (priorityFilter !== "all") {
      switch (priorityFilter) {
        case "critical":
          // Tồn kho thấp (≤ 5 cho vật tư y tế)
          filtered = filtered.filter((item) => {
            const tonkho = item.tonkhothucte_current || item.tonkhohientai;
            return tonkho <= 5;
          });
          break;
        case "expired":
          // Đã hết hạn
          filtered = filtered.filter((item) => {
            if (!item.ngayhethan) return false;
            const today = new Date();
            const expiryDate = new Date(item.ngayhethan);
            return expiryDate < today;
          });
          break;
        case "nearExpiry":
          // Sắp hết hạn trong 60 ngày (vì vật tư y tế cần thời gian dự trữ)
          filtered = filtered.filter((item) => {
            if (!item.ngayhethan) return false;
            const today = new Date();
            const expiryDate = new Date(item.ngayhethan);
            const diffDays = Math.ceil(
              (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            return diffDays >= 0 && diffDays <= 60;
          });
          break;
        case "normal":
          // Còn hạn lâu và tồn kho ổn định
          filtered = filtered.filter((item) => {
            const today = new Date();
            const expiryDate = item.ngayhethan
              ? new Date(item.ngayhethan)
              : null;
            const diffDays = expiryDate
              ? Math.ceil(
                  (expiryDate.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 999;
            const tonkho = item.tonkhothucte_current || item.tonkhohientai;
            return diffDays > 60 && tonkho > 5;
          });
          break;
      }
    }

    // 3. Lọc theo danh mục (Category Filter) - dựa vào category ID
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Giả sử API trả về thêm field category hoặc danhmuc_id
        const categoryId =
          (item as any).danhmuc_id || getCategoryFromName(item.tenvattu);

        switch (categoryFilter) {
          case "consumable": // Vật tư tiêu hao - category 1
            return categoryId === 1;
          case "equipment": // Thiết bị y tế - category 2
            return categoryId === 2;
          case "medicine": // Hóa chất/Sinh phẩm - category 3
            return categoryId === 3;
          case "other":
            return ![1, 2, 3].includes(categoryId);
          default:
            return true;
        }
      });
    }

    // 4. Lọc theo tồn kho (Stock Filter) - phù hợp với vật tư y tế
    if (stockFilter !== "all") {
      filtered = filtered.filter((item) => {
        const tonkho = item.tonkhothucte_current || item.tonkhohientai;

        switch (stockFilter) {
          case "outOfStock":
            return tonkho <= 0;
          case "lowStock":
            // Tồn kho thấp cho vật tư y tế (1-10)
            return tonkho > 0 && tonkho <= 10;
          case "highStock":
            // Tồn kho cao (>50)
            return tonkho > 50;
          default:
            return true;
        }
      });
    }

    // 5. Lọc theo tìm kiếm
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.tenvattu.toLowerCase().includes(query) ||
          String(item.idvattu).includes(query) ||
          ((item as any).donvi || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // ✅ Helper function để xác định category từ tên (fallback)
  const getCategoryFromName = (tenvattu: string): number => {
    const name = tenvattu.toLowerCase();

    // Vật tư tiêu hao (category 1)
    if (
      name.includes("kim") ||
      name.includes("găng") ||
      name.includes("băng") ||
      name.includes("khẩu trang") ||
      name.includes("bông") ||
      name.includes("tấm lót")
    ) {
      return 1;
    }

    // Thiết bị y tế (category 2)
    if (
      name.includes("máy") ||
      name.includes("ống nghe") ||
      name.includes("kéo") ||
      name.includes("dao") ||
      name.includes("kẹp") ||
      name.includes("đèn")
    ) {
      return 2;
    }

    // Hóa chất/Sinh phẩm (category 3)
    if (
      name.includes("hóa chất") ||
      name.includes("test") ||
      name.includes("dung dịch") ||
      name.includes("sinh phẩm")
    ) {
      return 3;
    }

    return 0; // other
  };

  const handleOpenModal = (item: TonKhoItem) => {
    setSelectedItem(item);
    setFormData({
      soluonghaohut: item.soluonghaohut_current?.toString() || "",
      noidung: item.noidung || "",
    });
    setShowModal(true);
  };

  const handleSaveItem = () => {
    if (!selectedItem) return;

    const soluonghaohut = parseInt(formData.soluonghaohut) || 0;
    const tonkhoBase = selectedItem.tonkhothucte_base || 0;

    if (soluonghaohut < 0) {
      Alert.alert("Lỗi", "Số lượng hao hụt không thể âm");
      return;
    }

    if (soluonghaohut > tonkhoBase) {
      Alert.alert(
        "Lỗi",
        `Số lượng hao hụt (${soluonghaohut}) không thể lớn hơn tồn kho từ phiếu trước (${tonkhoBase})\n\n` +
          `📦 Tồn kho hiện tại: ${selectedItem.tonkhohientai}\n` +
          `📋 Tồn kho từ phiếu trước: ${tonkhoBase}\n` +
          `💥 Hao hụt lịch sử: ${selectedItem.tonghaohut_history}\n\n` +
          `💡 Bạn chỉ có thể hao hụt tối đa ${tonkhoBase} từ tồn kho của phiếu trước.`
      );
      return;
    }

    const expectedResult = tonkhoBase - soluonghaohut;

    const updatedItem: TonKhoItem = {
      ...selectedItem,
      soluonghaohut_current: soluonghaohut,
      tonkhothucte_current: expectedResult,
      noidung: formData.noidung,
      checked: true,
    };

    saveLichSuKiemKe(updatedItem);
    setShowModal(false);
  };

  const renderItem = ({ item }: { item: TonKhoItem }) => {
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

        {/* ✅ Enhanced Stock Info với Before/After Logic */}
        <View style={styles.stockInfo}>
          {/* Tồn kho hiện tại (cố định) */}
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>📦 Tồn kho hiện tại:</Text>
            <Text style={styles.stockValue}>{item.tonkhohientai}</Text>
          </View>

          {/* Hao hụt lịch sử */}
          {item.tonghaohut_history > 0 && (
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>💥 Hao hụt lịch sử:</Text>
              <Text style={[styles.stockValue, { color: "#e74c3c" }]}>
                {item.tonghaohut_history}
              </Text>
            </View>
          )}

          {/* ✅ BEFORE/AFTER Comparison */}
          <View style={styles.beforeAfterContainer}>
            <Text style={styles.beforeAfterTitle}>🔄 Luồng kiểm kê:</Text>

            <View style={styles.beforeAfterRow}>
              <View style={styles.beforeSection}>
                <Text style={styles.beforeAfterLabel}>TRƯỚC KIỂM KÊ</Text>
                <Text style={styles.beforeAfterValue}>
                  {item.tonkhothucte_base}
                </Text>
                <Text style={styles.beforeAfterSubtext}>(Từ phiếu trước)</Text>
              </View>

              {item.checked && (
                <>
                  <View style={styles.arrowSection}>
                    <Ionicons name="arrow-forward" size={20} color="#e74c3c" />
                    <Text style={styles.arrowText}>
                      -{item.soluonghaohut_current}
                    </Text>
                  </View>

                  <View style={styles.afterSection}>
                    <Text style={styles.beforeAfterLabel}>SAU KIỂM KÊ</Text>
                    <Text
                      style={[styles.beforeAfterValue, { color: "#e74c3c" }]}
                    >
                      {item.tonkhothucte_current}
                    </Text>
                    <Text style={styles.beforeAfterSubtext}>
                      (Cho phiếu sau)
                    </Text>
                  </View>
                </>
              )}

              {!item.checked && (
                <View style={styles.pendingSection}>
                  <Text style={styles.pendingLabel}>CHƯA KIỂM KÊ</Text>
                  <Text style={styles.pendingValue}>?</Text>
                </View>
              )}
            </View>
          </View>

          {/* Chi tiết hao hụt lần này */}
          {item.checked && (
            <View style={styles.currentLossContainer}>
              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>🔥 Hao hụt lần này:</Text>
                <Text
                  style={[
                    styles.stockValue,
                    item.soluonghaohut_current > 0
                      ? styles.lossText
                      : styles.normalText,
                  ]}
                >
                  {item.soluonghaohut_current}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Ghi chú */}
        {item.checked && item.noidung && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>💬 {item.noidung}</Text>
          </View>
        )}

        {/* Action Button */}
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
      (sum, item) => sum + (Number(item.soluonghaohut_current) || 0),
      0
    );
    const totalHaoHutLichSu = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonghaohut_history) || 0),
      0
    );
    const totalTonKhoHienTai = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonkhohientai) || 0),
      0
    );
    const totalTonKhoThucTe = tonkhoData.reduce(
      (sum, item) => sum + (Number(item.tonkhothucte_current) || 0),
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

  // ✅ Simplified Tab Container - chỉ 4 tab chính
  const renderSimplifiedTabs = () => {
    const tabs = [
      { id: "all", name: "Tất cả", icon: "grid-outline", color: "#3498db" },
      {
        id: "unchecked",
        name: "Chưa kiểm",
        icon: "ellipse-outline",
        color: "#95a5a6",
      },
      {
        id: "checked",
        name: "Đã kiểm",
        icon: "checkmark-circle",
        color: "#27ae60",
      },
      {
        id: "haohut",
        name: "Có hao hụt",
        icon: "alert-circle",
        color: "#e74c3c",
      },
    ];

    return (
      <View style={styles.simplifiedTabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {tabs.map((tab) => {
              const count = getTabCount(tab.id);
              const isActive = activeTab === tab.id;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.simplifiedTab,
                    isActive && { backgroundColor: tab.color },
                  ]}
                  onPress={() => setActiveTab(tab.id as TabType)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={isActive ? "#fff" : tab.color}
                  />
                  <Text
                    style={[
                      styles.simplifiedTabText,
                      isActive && { color: "#fff" },
                    ]}
                  >
                    {tab.name}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.simplifiedTabBadge,
                        isActive
                          ? styles.activeSimplifiedBadge
                          : { backgroundColor: tab.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.simplifiedTabBadgeText,
                          isActive && { color: tab.color },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ✅ Advanced Filters với active filters count */}
        <AdvancedFilters
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          isVisible={showAdvancedFilters}
          onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
          activeFiltersCount={getActiveFiltersCount()}
        />
      </View>
    );
  };

  // ✅ Helper function to count active filters
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (priorityFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (stockFilter !== "all") count++;
    return count;
  };

  // ✅ Update getTabCount helper
  const getTabCount = (tabId: string): number => {
    // Tạm thời set activeTab để đếm
    let count = 0;

    switch (tabId) {
      case "all":
        count = tonkhoData.length;
        break;
      case "checked":
        count = tonkhoData.filter((item) => item.checked).length;
        break;
      case "unchecked":
        count = tonkhoData.filter((item) => !item.checked).length;
        break;
      case "haohut":
        count = tonkhoData.filter(
          (item) => item.checked && (item.soluonghaohut_current || 0) > 0
        ).length;
        break;
    }

    return count;
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

      {/* ✅ Simplified Tabs */}
      {renderSimplifiedTabs()}

      {/* Stats với filter info */}
      <View style={styles.statsContainer}>
        <View style={styles.resultsInfo}>
          <Text style={styles.statsText}>
            Hiển thị:{" "}
            <Text style={styles.statsNumber}>{filteredData.length}</Text> vật tư
          </Text>
          {getActiveFiltersCount() > 0 && (
            <Text style={styles.filterInfo}>
              Đang áp dụng {getActiveFiltersCount()} bộ lọc
            </Text>
          )}
        </View>
        {uncheckedCount > 0 && (
          <Text style={styles.uncheckedInfo}>Chưa kiểm: {uncheckedCount}</Text>
        )}
      </View>

      {/* Summary Stats */}
      {tonkhoData.length > 0 && renderSummaryStats()}

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => `item-${item.idvattu}`}
        renderItem={renderItem}
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
            {/* ✅ Enhanced Modal Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>📋 Thông tin kiểm kê</Text>
              <Text style={styles.infoText}>ID: {selectedItem?.idvattu}</Text>
              <Text style={styles.infoText}>Tên: {selectedItem?.tenvattu}</Text>

              <View style={styles.workflowContainer}>
                <Text style={styles.workflowTitle}>🔄 Luồng kiểm kê:</Text>

                <View style={styles.workflowStep}>
                  <Text style={styles.workflowLabel}>1️⃣ Tồn kho hiện tại:</Text>
                  <Text style={styles.workflowValue}>
                    {selectedItem?.tonkhohientai}
                  </Text>
                </View>

                <View style={styles.workflowStep}>
                  <Text style={styles.workflowLabel}>
                    2️⃣ Tồn kho từ phiếu trước:
                  </Text>
                  <Text style={styles.workflowValue}>
                    {selectedItem?.tonkhothucte_base}
                  </Text>
                </View>

                {selectedItem && selectedItem.tonghaohut_history > 0 && (
                  <View style={styles.workflowStep}>
                    <Text style={styles.workflowLabel}>
                      3️⃣ Hao hụt lịch sử:
                    </Text>
                    <Text style={[styles.workflowValue, { color: "#e74c3c" }]}>
                      {selectedItem.tonghaohut_history}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Số lượng hao hụt</Text>
              <TextInput
                style={styles.textInput}
                value={formData.soluonghaohut}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, soluonghaohut: text }));
                  // ✅ Hiển thị preview kết quả
                  const predicted =
                    (selectedItem?.tonkhothucte_base || 0) -
                    (parseInt(text) || 0);
                  if (predicted < 0 && text) {
                    // Could show a warning here
                  }
                }}
                placeholder="Nhập số lượng hao hụt"
                keyboardType="numeric"
              />

              {/* ✅ Preview kết quả */}
              {formData.soluonghaohut && (
                <Text style={styles.previewText}>
                  Dự kiến tồn kho sau kiểm kê:{" "}
                  {(selectedItem?.tonkhothucte_base || 0) -
                    (parseInt(formData.soluonghaohut) || 0)}
                </Text>
              )}
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
  calculationNote: {
    backgroundColor: "#f0f8ff",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  calculationText: {
    fontSize: 12,
    color: "#2c3e50",
    fontStyle: "italic",
  },
  previewText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
    fontStyle: "italic",
  },
  beforeAfterContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e3e8ff",
  },
  beforeAfterTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  beforeAfterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  beforeSection: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 6,
  },
  afterSection: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 6,
  },
  arrowSection: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  arrowText: {
    fontSize: 11,
    color: "#e74c3c",
    fontWeight: "bold",
    marginTop: 2,
  },
  beforeAfterLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 4,
  },
  beforeAfterValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  beforeAfterSubtext: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 2,
    textAlign: "center",
  },
  pendingSection: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 6,
    opacity: 0.7,
  },
  pendingLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginBottom: 4,
  },
  pendingValue: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "bold",
  },
  workflowContainer: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  workflowTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  workflowStep: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  workflowLabel: {
    fontSize: 12,
    color: "#64748b",
    flex: 1,
  },
  workflowValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  currentLossContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  medicalTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  medicalTabText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    color: "#2c3e50",
  },
  tabBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 18,
  },
  activeBadge: {
    backgroundColor: "#fff",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  simplifiedTabContainer: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  simplifiedTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    minHeight: 44,
  },
  simplifiedTabText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    color: "#2c3e50",
  },
  simplifiedTabBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
    minWidth: 24,
  },
  activeSimplifiedBadge: {
    backgroundColor: "#fff",
  },
  simplifiedTabBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  filterInfo: {
    fontSize: 12,
    color: "#3498db",
    marginTop: 2,
    fontStyle: "italic",
  },
  resultsInfo: {
    flex: 1,
  },
});
