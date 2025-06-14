import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaProvider } from "react-native-safe-area-context";
import API_URL from "@/config/api";

type ProductDetail = {
  idvattu: number;
  tenvattu: string;
  iddanhmuc: number;
  tendanhmuc: string;
  donvi: string;
  mota: string;
  ngayhethan: string | null;
  cachluutru: string;
  tongnhap: number;
  tongxuat: number;
  tonkhohientai: number;
  tonkhothucte: number;
};

type Category = {
  iddanhmuc: number;
  tendanhmuc: string;
};

const windowWidth = Dimensions.get("window").width;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State cho modal chỉnh sửa
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedProduct, setEditedProduct] = useState<ProductDetail | null>(
    null
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // State cho tab lịch sử
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
  const [historyData, setHistoryData] = useState<{ nhap: any[]; xuat: any[] }>({
    nhap: [],
    xuat: [],
  });
  // Cập nhật state để tracking loading riêng
  const [historyLoading, setHistoryLoading] = useState({
    nhap: false,
    xuat: false,
  });
  const [activeHistoryTab, setActiveHistoryTab] = useState<"nhap" | "xuat">(
    "nhap"
  );

  // Fetch chi tiết sản phẩm
  const fetchProductDetail = async () => {
    try {
      console.log(`Đang tải chi tiết sản phẩm ID: ${id}`);

      // Lấy token từ AsyncStorage
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Thông báo",
          "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
        );
        router.replace("/screens/login");
        return;
      }

      // Gửi request lấy chi tiết sản phẩm
      const response = await axios.get(`${API_URL}/tonkho/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Dữ liệu chi tiết sản phẩm:", response.data);
      setProduct(response.data);
      setEditedProduct(response.data);
    } catch (error: any) {
      console.error("Lỗi khi lấy chi tiết sản phẩm:", error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setError("Không tìm thấy sản phẩm với ID này");
        } else if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          Alert.alert(
            "Thông báo",
            "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
          );
          router.replace("/screens/login");
        } else {
          setError(
            `Lỗi: ${
              error.response?.data?.message || "Không thể tải dữ liệu sản phẩm"
            }`
          );
        }
      } else {
        setError("Đã xảy ra lỗi khi tải dữ liệu sản phẩm");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch lịch sử nhập xuất
  const fetchHistory = async (type: "nhap" | "xuat") => {
    if (!id) return;

    try {
      setHistoryLoading((prev) => ({ ...prev, [type]: true }));
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      console.log(`🔍 Fetching ${type} history for product ${id}`);

      const response = await axios.get(`${API_URL}/api/tonkho/${id}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`${type} history response:`, response.data.slice(0, 2));

      setHistoryData((prev) => ({
        ...prev,
        [type]: response.data,
      }));
    } catch (error) {
      console.error(`Lỗi khi tải lịch sử ${type}:`, error);
      Alert.alert("Lỗi", `Không thể tải lịch sử ${type}`);
    } finally {
      setHistoryLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Fetch danh mục cho modal chỉnh sửa
  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/danhmuc`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
    }
  };

  useEffect(() => {
    fetchProductDetail();
    fetchCategories();
  }, [id]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory("nhap");
      fetchHistory("xuat");
    }
  }, [activeTab]);

  // Thêm useEffect riêng cho activeHistoryTab
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory(activeHistoryTab);
    }
  }, [activeHistoryTab]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Không có";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Không hợp lệ";

    return date.toLocaleDateString("vi-VN");
  };

  // Tính trạng thái tồn kho
  const getStockStatus = () => {
    if (!product) return { text: "", color: "" };

    const tonkho = Number(product.tonkhohientai);

    if (tonkho === 0) {
      return { text: "Hết hàng", color: "#e74c3c" };
    } else if (tonkho > 0 && tonkho <= 30) {
      return { text: "Sắp hết", color: "#f39c12" };
    } else {
      return { text: "Còn hàng", color: "#2ecc71" };
    }
  };

  // Tính trạng thái hết hạn
  const getExpiryStatus = () => {
    if (!product || !product.ngayhethan)
      return { text: "Không có HSD", color: "#7f8c8d" };

    const today = new Date();
    const expiryDate = new Date(product.ngayhethan);

    if (isNaN(expiryDate.getTime()))
      return { text: "Không hợp lệ", color: "#7f8c8d" };

    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Hết hạn ${Math.abs(diffDays)} ngày`, color: "#e74c3c" };
    } else if (diffDays <= 30) {
      return { text: `Còn ${diffDays} ngày`, color: "#f39c12" };
    } else {
      return { text: "Còn hạn", color: "#2ecc71" };
    }
  };

  // Hàm xử lý thay đổi ngày hết hạn
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate && editedProduct) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time để so sánh chỉ ngày

      const selectedDateOnly = new Date(selectedDate);
      selectedDateOnly.setHours(0, 0, 0, 0);

      if (selectedDateOnly < today) {
        Alert.alert(
          "Ngày không hợp lệ",
          `Bạn đã chọn ngày ${selectedDateOnly.toLocaleDateString(
            "vi-VN"
          )} trong quá khứ.\n\nVui lòng chọn từ ngày ${today.toLocaleDateString(
            "vi-VN"
          )} (hôm nay) trở đi.`,
          [
            {
              text: "Chọn lại",
              style: "default",
              onPress: () => setShowDatePicker(true),
            },
            {
              text: "OK",
              style: "cancel",
            },
          ]
        );
        return;
      }

      // Kiểm tra cảnh báo ngày gần hết hạn
      if (checkExpiryWarning(selectedDateOnly)) {
        setEditedProduct({
          ...editedProduct,
          ngayhethan: selectedDate.toISOString().split("T")[0],
        });
      }
    }
  };

  // Hàm kiểm tra và cảnh báo ngày gần hết hạn (giống importData)
  const checkExpiryWarning = (selectedDate: Date) => {
    const today = new Date();
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Cảnh báo nếu chọn ngày trong vòng 30 ngày
    if (diffDays <= 30 && diffDays > 0) {
      Alert.alert(
        "Cảnh báo",
        `Bạn đã chọn ngày hết hạn chỉ còn ${diffDays} ngày. Bạn có chắc chắn không?`,
        [
          {
            text: "Chọn lại",
            style: "cancel",
            onPress: () => setShowDatePicker(true),
          },
          {
            text: "Xác nhận",
            style: "default",
            onPress: () => {
              if (editedProduct) {
                setEditedProduct({
                  ...editedProduct,
                  ngayhethan: selectedDate.toISOString().split("T")[0],
                });
              }
            },
          },
        ]
      );
      return false; // Không cập nhật ngay
    }

    return true; // Cho phép cập nhật
  };

  // Lấy ngày tối đa
  const getMaximumDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 5); // Tối đa 5 năm tới
    return maxDate;
  };

  const getMinimumDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const validateEditForm = () => {
    if (!editedProduct) return false;

    // Kiểm tra tên sản phẩm
    if (!editedProduct.tenvattu || editedProduct.tenvattu.trim() === "") {
      Alert.alert("Lỗi", "Vui lòng nhập tên sản phẩm");
      return false;
    }

    // Kiểm tra danh mục
    if (!editedProduct.iddanhmuc || editedProduct.iddanhmuc === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn danh mục");
      return false;
    }

    if (editedProduct.ngayhethan) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiryDate = new Date(editedProduct.ngayhethan);
      expiryDate.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        Alert.alert(
          "Lỗi ngày hết hạn",
          `Ngày hết hạn (${expiryDate.toLocaleDateString(
            "vi-VN"
          )}) không thể là ngày trong quá khứ.\n\nHôm nay là: ${today.toLocaleDateString(
            "vi-VN"
          )}\n\nVui lòng chọn từ ngày hôm nay trở đi.`
        );
        return false;
      }
    }

    return true;
  };

  // Hàm lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editedProduct || !editedProduct.tenvattu || !editedProduct.iddanhmuc) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tên sản phẩm và danh mục");
      return;
    }

    // Kiểm tra dữ liệu trước khi lưu
    const isValid = validateEditForm();
    if (!isValid) return;

    setSaving(true);
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

      const productData = {
        tenvattu: editedProduct.tenvattu,
        iddanhmuc: editedProduct.iddanhmuc,
        donvi: editedProduct.donvi || "",
        mota: editedProduct.mota || "",
        ngayhethan: editedProduct.ngayhethan,
        cachluutru: editedProduct.cachluutru || "",
      };

      await axios.put(`${API_URL}/api/vattu/${id}`, productData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Thành công", "Cập nhật thông tin sản phẩm thành công");
      setEditModalVisible(false);
      fetchProductDetail(); // Tải lại thông tin sản phẩm
    } catch (error) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      Alert.alert("Lỗi", "Không thể cập nhật thông tin sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  // Hàm xác nhận xóa sản phẩm
  const confirmDelete = () => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa sản phẩm này không?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: handleDelete },
      ]
    );
  };

  // Hàm xóa sản phẩm
  const handleDelete = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Thông báo",
          "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
        );
        return;
      }

      await axios.delete(`${API_URL}/api/vattu/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Thành công", "Đã xóa sản phẩm thành công", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.message || "Không thể xóa sản phẩm";
      Alert.alert("Lỗi", errorMessage);
    }
  };

  // Hàm chia sẻ thông tin sản phẩm
  const handleShare = async () => {
    if (!product) return;

    const stockStatus = getStockStatus();
    const expiryStatus = getExpiryStatus();

    try {
      await Share.share({
        message:
          `Thông tin sản phẩm: ${product.tenvattu}\n` +
          `Mã: ${product.idvattu}\n` +
          `Danh mục: ${product.tendanhmuc || "N/A"}\n` +
          `Tồn kho: ${product.tonkhohientai} ${product.donvi || ""} (${
            stockStatus.text
          })\n` +
          `Hạn sử dụng: ${formatDate(product.ngayhethan)} (${
            expiryStatus.text
          })\n` +
          `Tổng nhập: ${product.tongnhap}\n` +
          `Tổng xuất: ${product.tongxuat}`,
      });
    } catch (error) {
      console.error("Lỗi khi chia sẻ:", error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Đang tải thông tin sản phẩm...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Not found state
  if (!product) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="search" size={60} color="#7f8c8d" />
        <Text style={styles.errorTitle}>Không tìm thấy sản phẩm</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stockStatus = getStockStatus();
  const expiryStatus = getExpiryStatus();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Chi tiết sản phẩm",
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                style={{ marginRight: 16 }}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color="#3498db" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditModalVisible(true)}>
                <Ionicons name="create-outline" size={24} color="#3498db" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Tab Navigation */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#7f8c8d" />
        </TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "info" && styles.activeTab]}
          onPress={() => setActiveTab("info")}
        >
          <Ionicons
            name="information-circle"
            size={20}
            color={activeTab === "info" ? "#3498db" : "#7f8c8d"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "info" && styles.activeTabText,
            ]}
          >
            Thông tin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => {
            setActiveTab("history");
            fetchHistory(activeHistoryTab);
          }}
        >
          <Ionicons
            name="time"
            size={20}
            color={activeTab === "history" ? "#3498db" : "#7f8c8d"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>
      <SafeAreaProvider>
        <ScrollView style={styles.container}>
          {/* Info Tab Content */}
          {activeTab === "info" && (
            <>
              {/* Thẻ sản phẩm */}
              <View style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productNameContainer}>
                    <Text style={styles.productName}>{product.tenvattu}</Text>
                    <Text style={styles.productCode}>
                      Mã: {product.idvattu}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: stockStatus.color },
                    ]}
                  >
                    <Text style={styles.badgeText}>{stockStatus.text}</Text>
                  </View>
                </View>

                {product.tendanhmuc && (
                  <View style={styles.categoryContainer}>
                    <Ionicons name="folder-outline" size={18} color="#7f8c8d" />
                    <Text style={styles.categoryText}>
                      {product.tendanhmuc}
                    </Text>
                  </View>
                )}

                <View style={styles.statGrid}>
                  <View
                    style={[
                      styles.statItem,
                      { borderColor: stockStatus.color },
                    ]}
                  >
                    <Text
                      style={[styles.statValue, { color: stockStatus.color }]}
                    >
                      {product.tonkhohientai}
                      <Text style={styles.statUnit}> {product.donvi}</Text>
                    </Text>
                    <Text style={styles.statLabel}>Tồn kho hiện tại</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {product.tongnhap}
                      <Ionicons
                        name="arrow-down"
                        size={14}
                        color="#27ae60"
                        style={styles.statIcon}
                      />
                    </Text>
                    <Text style={styles.statLabel}>Tổng nhập</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {product.tongxuat}
                      <Ionicons
                        name="arrow-up"
                        size={14}
                        color="#e74c3c"
                        style={styles.statIcon}
                      />
                    </Text>
                    <Text style={styles.statLabel}>Tổng xuất</Text>
                  </View>
                </View>
              </View>

              {/* Thông tin hạn sử dụng */}
              {product.ngayhethan && (
                <View
                  style={[
                    styles.expirySection,
                    { borderColor: expiryStatus.color },
                  ]}
                >
                  <View style={styles.expiryHeader}>
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={expiryStatus.color}
                    />
                    <Text style={styles.expiryTitle}>Hạn sử dụng</Text>
                  </View>

                  <View style={styles.expiryContent}>
                    <View style={styles.expiryRow}>
                      <Text style={styles.expiryLabel}>Ngày hết hạn:</Text>
                      <Text style={styles.expiryDate}>
                        {formatDate(product.ngayhethan)}
                      </Text>
                    </View>
                    <View style={styles.expiryRow}>
                      <Text style={styles.expiryLabel}>Trạng thái:</Text>
                      <Text
                        style={[
                          styles.expiryStatus,
                          { color: expiryStatus.color },
                        ]}
                      >
                        {expiryStatus.text}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Chi tiết sản phẩm */}
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Chi tiết sản phẩm</Text>

                {product.cachluutru && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons
                        name="thermometer-outline"
                        size={20}
                        color="#3498db"
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Cách lưu trữ:</Text>
                      <Text style={styles.detailValue}>
                        {product.cachluutru}
                      </Text>
                    </View>
                  </View>
                )}

                {product.mota && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color="#3498db"
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Mô tả:</Text>
                      <Text style={styles.detailValue}>{product.mota}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons
                      name="reorder-three-outline"
                      size={20}
                      color="#3498db"
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Đơn vị:</Text>
                    <Text style={styles.detailValue}>
                      {product.donvi || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Nút tác vụ */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setEditModalVisible(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={confirmDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Xóa sản phẩm</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* History Tab Content */}
          {activeTab === "history" && (
            <>
              {/* History Tab Navigation */}
              <View style={styles.historyTabContainer}>
                <TouchableOpacity
                  style={[
                    styles.historyTab,
                    activeHistoryTab === "nhap" && styles.activeHistoryTab,
                  ]}
                  onPress={() => setActiveHistoryTab("nhap")}
                >
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={activeHistoryTab === "nhap" ? "#27ae60" : "#7f8c8d"}
                  />
                  <Text
                    style={[
                      styles.historyTabText,
                      activeHistoryTab === "nhap" &&
                        styles.activeHistoryTabText,
                    ]}
                  >
                    Lịch sử nhập
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.historyTab,
                    activeHistoryTab === "xuat" && styles.activeHistoryTab,
                  ]}
                  onPress={() => setActiveHistoryTab("xuat")}
                >
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={activeHistoryTab === "xuat" ? "#e74c3c" : "#7f8c8d"}
                  />
                  <Text
                    style={[
                      styles.historyTabText,
                      activeHistoryTab === "xuat" &&
                        styles.activeHistoryTabText,
                    ]}
                  >
                    Lịch sử xuất
                  </Text>
                </TouchableOpacity>
              </View>

              {/* History Content */}
              <View style={styles.historyContent}>
                {historyLoading[activeHistoryTab] ? (
                  <View style={styles.historyLoading}>
                    <ActivityIndicator size="small" color="#3498db" />
                    <Text style={styles.historyLoadingText}>
                      Đang tải lịch sử{" "}
                      {activeHistoryTab === "nhap" ? "nhập" : "xuất"}...
                    </Text>
                  </View>
                ) : (
                  <>
                    {activeHistoryTab === "nhap" &&
                      (historyData.nhap.length > 0 ? (
                        historyData.nhap.map((item, index) => (
                          <View
                            key={`nhap-${index}`}
                            style={styles.historyItem}
                          >
                            <View style={styles.historyItemHeader}>
                              <Text style={styles.historyItemDate}>
                                {new Date(item.ngaynhap).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </Text>
                              <View style={styles.historyItemBadge}>
                                <Text style={styles.historyItemBadgeText}>
                                  Nhập
                                </Text>
                              </View>
                            </View>
                            <View style={styles.historyItemDetails}>
                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Số lượng:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.soluong} {product.donvi}
                                </Text>
                              </View>

                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Đơn giá:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.dongia && parseFloat(item.dongia) > 0
                                    ? `${parseFloat(item.dongia).toLocaleString(
                                        "vi-VN"
                                      )} VNĐ`
                                    : "N/A"}
                                </Text>
                              </View>

                              {item.giatrinhap &&
                                parseFloat(item.giatrinhap) > 0 && (
                                  <View style={styles.historyDetailRow}>
                                    <Text style={styles.historyDetailLabel}>
                                      Giá trị nhập:
                                    </Text>
                                    <Text
                                      style={[
                                        styles.historyDetailValue,
                                        {
                                          color: "#27ae60",
                                          fontWeight: "bold",
                                        },
                                      ]}
                                    >
                                      {parseFloat(
                                        item.giatrinhap
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </Text>
                                  </View>
                                )}

                              {/* Người nhập */}
                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Người nhập:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.nguoidung || "N/A"}
                                </Text>
                              </View>

                              {/* Nhà cung cấp */}
                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Nhà cung cấp:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.nhacungcap || "N/A"}
                                </Text>
                              </View>

                              {/* ID Lô hàng */}
                              {item.idlohang && (
                                <View style={styles.historyDetailRow}>
                                  <Text style={styles.historyDetailLabel}>
                                    Lô hàng:
                                  </Text>
                                  <Text
                                    style={[
                                      styles.historyDetailValue,
                                      { color: "#3498db", fontWeight: "500" },
                                    ]}
                                  >
                                    #{item.idlohang}
                                  </Text>
                                </View>
                              )}

                              {item.trangthailohang && (
                                <View style={styles.historyDetailRow}>
                                  <Text style={styles.historyDetailLabel}>
                                    Trạng thái lô:
                                  </Text>
                                  <Text
                                    style={[
                                      styles.historyDetailValue,
                                      item.trangthailohang === "Đã nhập"
                                        ? { color: "#27ae60" }
                                        : item.trangthailohang === "Đã Hủy"
                                        ? { color: "#e74c3c" }
                                        : { color: "#f39c12" },
                                    ]}
                                  >
                                    {item.trangthailohang}
                                  </Text>
                                </View>
                              )}

                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Trạng thái:
                                </Text>
                                <Text
                                  style={[
                                    styles.historyDetailValue,
                                    { color: "#27ae60", fontWeight: "500" },
                                  ]}
                                >
                                  {item.trangthai}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.emptyHistory}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={40}
                            color="#bdc3c7"
                          />
                          <Text style={styles.emptyHistoryText}>
                            Không có dữ liệu nhập kho
                          </Text>
                        </View>
                      ))}

                    {activeHistoryTab === "xuat" &&
                      (historyData.xuat.length > 0 ? (
                        historyData.xuat.map((item, index) => (
                          <View
                            key={`xuat-${index}`}
                            style={styles.historyItem}
                          >
                            <View style={styles.historyItemHeader}>
                              <Text style={styles.historyItemDate}>
                                {new Date(
                                  item.NgayXuat || item.ngayxuat
                                ).toLocaleDateString("vi-VN")}
                              </Text>
                              <View
                                style={[
                                  styles.historyItemBadge,
                                  { backgroundColor: "#e74c3c" },
                                ]}
                              >
                                <Text style={styles.historyItemBadgeText}>
                                  Xuất
                                </Text>
                              </View>
                            </View>
                            <View style={styles.historyItemDetails}>
                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Số lượng:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.SoLuong || item.soluong} {product.donvi}
                                </Text>
                              </View>

                              {(item.DonGia || item.dongia) &&
                                parseFloat(item.DonGia || item.dongia) > 0 && (
                                  <View style={styles.historyDetailRow}>
                                    <Text style={styles.historyDetailLabel}>
                                      Đơn giá:
                                    </Text>
                                    <Text style={styles.historyDetailValue}>
                                      {parseFloat(
                                        item.DonGia || item.dongia
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </Text>
                                  </View>
                                )}

                              {(item.DonGia || item.dongia) &&
                                (item.SoLuong || item.soluong) && (
                                  <View style={styles.historyDetailRow}>
                                    <Text style={styles.historyDetailLabel}>
                                      Giá trị xuất:
                                    </Text>
                                    <Text
                                      style={[
                                        styles.historyDetailValue,
                                        {
                                          color: "#e74c3c",
                                          fontWeight: "bold",
                                        },
                                      ]}
                                    >
                                      {(
                                        parseFloat(item.DonGia || item.dongia) *
                                        parseInt(item.SoLuong || item.soluong)
                                      ).toLocaleString("vi-VN")}{" "}
                                      VNĐ
                                    </Text>
                                  </View>
                                )}

                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Người duyệt:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.NguoiDung || item.nguoidung || "N/A"}
                                </Text>
                              </View>

                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Người yêu cầu:
                                </Text>
                                <Text style={styles.historyDetailValue}>
                                  {item.NguoiYeuCau ||
                                    item.nguoiyeucau ||
                                    "N/A"}
                                </Text>
                              </View>

                              {(item.PhoneNguoiYeuCau ||
                                item.phonenguoiyeucau) && (
                                <View style={styles.historyDetailRow}>
                                  <Text style={styles.historyDetailLabel}>
                                    SĐT:
                                  </Text>
                                  <Text
                                    style={[
                                      styles.historyDetailValue,
                                      { color: "#3498db", fontWeight: "500" },
                                    ]}
                                  >
                                    {item.PhoneNguoiYeuCau ||
                                      item.phonenguoiyeucau}
                                  </Text>
                                </View>
                              )}

                              <View style={styles.historyDetailRow}>
                                <Text style={styles.historyDetailLabel}>
                                  Trạng thái:
                                </Text>
                                <Text
                                  style={[
                                    styles.historyDetailValue,
                                    { color: "#e74c3c", fontWeight: "500" },
                                  ]}
                                >
                                  {item.TrangThai || item.trangthai || "N/A"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.emptyHistory}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={40}
                            color="#bdc3c7"
                          />
                          <Text style={styles.emptyHistoryText}>
                            Không có dữ liệu xuất kho
                          </Text>
                        </View>
                      ))}
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaProvider>

      {/* Modal Chỉnh Sửa Sản Phẩm */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa sản phẩm</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Tên sản phẩm */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên sản phẩm *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedProduct?.tenvattu || ""}
                  onChangeText={(text) =>
                    editedProduct &&
                    setEditedProduct({
                      ...editedProduct,
                      tenvattu: text,
                    })
                  }
                  placeholder="Nhập tên sản phẩm"
                />
              </View>

              {/* Danh mục */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Danh mục *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editedProduct?.iddanhmuc}
                    onValueChange={(itemValue) =>
                      editedProduct &&
                      setEditedProduct({
                        ...editedProduct,
                        iddanhmuc: itemValue,
                      })
                    }
                  >
                    <Picker.Item label="Chọn danh mục" value={0} />
                    {categories.map((category) => (
                      <Picker.Item
                        key={category.iddanhmuc}
                        label={category.tendanhmuc}
                        value={category.iddanhmuc}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Đơn vị */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Đơn vị</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedProduct?.donvi || ""}
                  onChangeText={(text) =>
                    editedProduct &&
                    setEditedProduct({
                      ...editedProduct,
                      donvi: text,
                    })
                  }
                  placeholder="VD: Cái, Kg, Hộp,..."
                />
              </View>

              {/* Ngày hết hạn */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ngày hết hạn</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {editedProduct?.ngayhethan
                      ? formatDate(editedProduct.ngayhethan)
                      : "Chọn ngày hết hạn (từ hôm nay)"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#7f8c8d" />
                </TouchableOpacity>

                {/* ✅ Thêm hint text giống importData */}
                <Text style={styles.hintText}>
                  💡 Chỉ có thể chọn từ ngày{" "}
                  {new Date().toLocaleDateString("vi-VN")} (hôm nay) trở đi
                </Text>

                {editedProduct?.ngayhethan && (
                  <View style={styles.dateStatusContainer}>
                    <Text style={styles.dateStatusText}>
                      Trạng thái: {getExpiryStatus().text}
                    </Text>
                  </View>
                )}

                {showDatePicker && (
                  <DateTimePicker
                    value={
                      editedProduct?.ngayhethan
                        ? new Date(editedProduct.ngayhethan)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={getMinimumDate()}
                    maximumDate={getMaximumDate()}
                    timeZoneOffsetInMinutes={0}
                    locale="vi-VN"
                    textColor="#34495e"
                    accentColor="#3498db"
                  />
                )}
              </View>

              {/* Cách lưu trữ */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cách lưu trữ</Text>
                <TextInput
                  style={styles.formInput}
                  value={editedProduct?.cachluutru || ""}
                  onChangeText={(text) =>
                    editedProduct &&
                    setEditedProduct({
                      ...editedProduct,
                      cachluutru: text,
                    })
                  }
                  placeholder="VD: Nhiệt độ phòng, tủ lạnh,..."
                />
              </View>

              {/* Mô tả */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mô tả</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={editedProduct?.mota || ""}
                  onChangeText={(text) =>
                    editedProduct &&
                    setEditedProduct({
                      ...editedProduct,
                      mota: text,
                    })
                  }
                  placeholder="Mô tả chi tiết về sản phẩm"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const additionalStyles = StyleSheet.create({
  hintText: {
    fontSize: 12,
    color: "#95a5a6",
    fontStyle: "italic",
    marginTop: 4,
    marginLeft: 4,
  },
  dateStatusContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  dateStatusText: {
    fontSize: 13,
    color: "#34495e",
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495e",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7f8c8d",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495e",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  editButton: {
    padding: 8,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
    // paddingTop: 28,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#3498db",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#3498db",
  },

  // Product Card
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  productNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 4,
  },
  productCode: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 16,
    color: "#34495e",
    marginLeft: 8,
  },

  // Stats Grid
  statGrid: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    textAlign: "center",
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#95a5a6",
  },
  statIcon: {
    marginLeft: 2,
  },

  // Expiry Section
  expirySection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expiryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  expiryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#34495e",
    marginLeft: 10,
  },
  expiryContent: {
    padding: 16,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  expiryLabel: {
    fontSize: 15,
    color: "#7f8c8d",
    width: 100,
  },
  expiryDate: {
    fontSize: 15,
    color: "#34495e",
    fontWeight: "500",
  },
  expiryStatus: {
    fontSize: 16,
    fontWeight: "bold",
  },

  // Details Section
  detailsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: "#ecf0f1",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#7f8c8c",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "#34495e",
  },

  // Action Buttons
  actionButtonsContainer: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3498db",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonDanger: {
    backgroundColor: "#e74c3c",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },

  // History Tab
  historyTabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  historyTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  activeHistoryTab: {
    backgroundColor: "#f8f9fa",
  },
  historyTabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#7f8c8d",
  },
  activeHistoryTabText: {
    color: "#34495e",
  },
  historyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  historyLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  historyLoadingText: {
    marginTop: 8,
    color: "#7f8c8d",
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  historyItemDate: {
    fontSize: 15,
    fontWeight: "500",
    color: "#34495e",
  },
  historyItemBadge: {
    backgroundColor: "#27ae60",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  historyItemBadgeExport: {
    backgroundColor: "#e74c3c",
  },
  historyItemBadgeText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 12,
  },
  historyItemDetails: {
    padding: 16,
  },
  historyDetailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  historyDetailLabel: {
    width: 100,
    fontSize: 14,
    color: "#7f8c8d",
  },
  historyDetailValue: {
    fontSize: 14,
    color: "#34495e",
    fontWeight: "500",
    flex: 1,
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyHistoryText: {
    marginTop: 8,
    fontSize: 16,
    color: "#95a5a6",
  },

  // Edit Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
  },
  modalScrollView: {
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: windowWidth > 400 ? 500 : 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#34495e",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    overflow: "hidden",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  datePickerText: {
    fontSize: 16,
    color: "#34495e",
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#ecf0f1",
    marginRight: 8,
  },
  modalSaveButton: {
    backgroundColor: "#3498db",
    marginLeft: 8,
  },
  modalCancelButtonText: {
    color: "#7f8c8d",
    fontWeight: "600",
  },
  modalSaveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  ...additionalStyles,
});
