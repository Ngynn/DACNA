import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import API_URL from "../../config/api";

type TonKhoItem = {
  idvattu: number;
  tenvattu: string;
  tendanhmuc: string;
  ngayhethan: string;
  tongnhap: number;
  tongxuat: number;
  tonkhohientai: number;
  tonkhothucte: number;
  tonghaohut: number;
};

// Tab hiển thị
type TabType =
  | "all"
  | "inStock"
  | "lowStock"
  | "outOfStock"
  | "expired"
  | "nearExpiry";

// Hàm định dạng số thành dạng ngắn gọn
const formatCompactNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return Math.floor(num / 1000) + "K";
  return (num / 1000000).toFixed(1) + "M";
};

export default function Home() {
  const [tonkho, setTonkho] = useState<TonKhoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [sortBy, setSortBy] = useState<
    "name" | "expiry" | "code" | "stock" | "import" | "export"
  >("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [secondarySortBy, setSecondarySortBy] = useState<"asc" | "desc">("asc");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const router = useRouter();

  // Hàm lấy dữ liệu tồn kho
  const fetchTonKho = async () => {
    try {
      // Lấy token từ AsyncStorage
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        // Nếu không có token, chuyển về trang đăng nhập
        Alert.alert(
          "Thông báo",
          "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
        );
        router.replace("/screens/login");
        return;
      }

      // Gọi API với token xác thực
      const response = await axios.get(`${API_URL}/tonkho`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log("Dữ liệu tồn kho:", response.data);
      setTonkho(response.data);
    } catch (error) {
      // console.error("Lỗi khi lấy dữ liệu tồn kho:", error);

      if (axios.isAxiosError(error)) {
        // Xử lý lỗi 401 (Unauthorized) hoặc 403 (Forbidden)
        if (error.response?.status === 401 || error.response?.status === 403) {
          Alert.alert(
            "Thông báo",
            "Phiên làm việc đã hết hạn hoặc bạn không có quyền truy cập, vui lòng đăng nhập lại"
          );
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          router.replace("/screens/login");
        } else {
          Alert.alert(
            "Lỗi",
            `Không thể tải dữ liệu tồn kho: ${
              error.response?.data?.message || error.message
            }`
          );
        }
      } else {
        Alert.alert("Lỗi", "Không thể tải dữ liệu tồn kho");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Hook useEffect để gọi dữ liệu khi component mount
  useEffect(() => {
    fetchTonKho();
  }, []);

  // Hook useEffect để theo dõi sự thay đổi của activeTab và tonkho
  useEffect(() => {
    const filteredData = getFilteredData();
    console.log(`Tab ${activeTab}: ${filteredData.length} mặt hàng`);
  }, [activeTab, tonkho]);

  // Hàm làm mới dữ liệu khi kéo xuống
  const onRefresh = () => {
    setRefreshing(true);
    fetchTonKho();
  };

  // Lọc dữ liệu theo trạng thái tab đang chọn và từ khóa tìm kiếm
  const getFilteredData = () => {
    const today = new Date();

    // Lọc theo tab đang chọn trước
    let filteredByTab = [];

    switch (activeTab) {
      case "inStock":
        filteredByTab = tonkho.filter((item) => Number(item.tonkhothucte) > 30);
        break;
      case "lowStock":
        filteredByTab = tonkho.filter(
          (item) =>
            Number(item.tonkhothucte) > 0 && Number(item.tonkhothucte) <= 30
        );
        break;
      case "outOfStock":
        filteredByTab = tonkho.filter(
          (item) => Number(item.tonkhothucte) === 0
        );
        break;
      case "expired":
        filteredByTab = tonkho.filter((item) => {
          if (!item.ngayhethan) return false;
          const expiryDate = new Date(item.ngayhethan);
          return !isNaN(expiryDate.getTime()) && expiryDate < today;
        });
        break;
      case "nearExpiry":
        filteredByTab = tonkho.filter((item) => {
          if (!item.ngayhethan) return false;
          const expiryDate = new Date(item.ngayhethan);
          if (isNaN(expiryDate.getTime())) return false;
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 30;
        });
        break;
      default:
        filteredByTab = [...tonkho];
    }

    // Nếu không có từ khóa tìm kiếm, trả về kết quả lọc theo tab
    if (!searchQuery || searchQuery.trim() === "") {
      return filteredByTab;
    }

    // Lọc thêm theo từ khóa tìm kiếm
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return filteredByTab.filter((item) => {
      const tenvattu = (item.tenvattu || "").toLowerCase();
      const idvattu = String(item.idvattu || "").toLowerCase();
      const tendanhmuc = (item.tendanhmuc || "").toLowerCase();

      return (
        tenvattu.includes(normalizedQuery) ||
        idvattu.includes(normalizedQuery) ||
        tendanhmuc.includes(normalizedQuery)
      );
    });
  };

  // Hàm sắp xếp dữ liệu theo ưu tiên dựa trên tab đang chọn và lựa chọn sắp xếp của người dùng
  const getSortedData = (data: TonKhoItem[]) => {
    // Clone mảng để tránh thay đổi mảng gốc
    const clonedData = [...data];

    // Sắp xếp dữ liệu theo tiêu chí người dùng chọn
    const sortData = (items: TonKhoItem[]) => {
      let sortedItems: TonKhoItem[] = [...items]; // Tạo bản sao để sắp xếp

      switch (sortBy) {
        case "name":
          sortedItems = items.sort((a, b) =>
            (a.tenvattu || "").localeCompare(b.tenvattu || "")
          );
          break;

        case "code":
          sortedItems = items.sort((a, b) => {
            const codeA = String(a.idvattu || "");
            const codeB = String(b.idvattu || "");
            return codeA.localeCompare(codeB);
          });
          break;

        case "stock":
          sortedItems = items.sort(
            (a, b) => Number(a.tonkhothucte) - Number(b.tonkhothucte)
          );
          break;

        case "expiry":
          sortedItems = items.sort((a, b) => {
            if (!a.ngayhethan) return 1;
            if (!b.ngayhethan) return -1;
            const dateA = new Date(a.ngayhethan);
            const dateB = new Date(b.ngayhethan);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA.getTime() - dateB.getTime();
          });
          break;

        case "import":
          sortedItems = items.sort(
            (a, b) => Number(a.tongnhap) - Number(b.tongnhap)
          );
          break;

        case "export":
          sortedItems = items.sort(
            (a, b) => Number(a.tongxuat) - Number(b.tongxuat)
          );
          break;
      }

      // Đảo ngược thứ tự nếu secondarySortBy là desc
      return secondarySortBy === "desc" ? sortedItems.reverse() : sortedItems;
    };

    // Áp dụng sắp xếp theo tiêu chí người dùng chọn cho tất cả các tab
    return sortData(clonedData);
  };

  // Hàm lấy icon tương ứng với tiêu chí sắp xếp
  const getSortIcon = ():
    | "list-outline"
    | "barcode-outline"
    | "cube-outline"
    | "calendar-outline"
    | "arrow-down-outline"
    | "arrow-up-outline"
    | "text" => {
    switch (sortBy) {
      case "name":
        return "list-outline";
      case "code":
        return "barcode-outline";
      case "stock":
        return "cube-outline";
      case "expiry":
        return "calendar-outline";
      case "import":
        return "arrow-down-outline";
      case "export":
        return "arrow-up-outline";
      default:
        return "text";
    }
  };

  // Hàm lấy nhãn tương ứng với tiêu chí sắp xếp
  const getSortLabel = (): string => {
    switch (sortBy) {
      case "name":
        return "Theo tên";
      case "code":
        return "Theo mã";
      case "stock":
        return "Theo tồn kho";
      case "expiry":
        return "Theo hạn";
      case "import":
        return "Theo nhập";
      case "export":
        return "Theo xuất";
      default:
        return "Theo tên";
    }
  };

  // Hàm lấy nhãn hiển thị cho tab đang chọn
  const getTabLabel = (): string => {
    switch (activeTab) {
      case "inStock":
        return "Còn hàng";
      case "lowStock":
        return "Sắp hết";
      case "outOfStock":
        return "Hết hàng";
      case "expired":
        return "Hết hạn";
      case "nearExpiry":
        return "Sắp hết hạn";
      default:
        return "Tất cả";
    }
  };

  // Render item trong FlatList với trạng thái
  const renderItem = ({ item }: { item: TonKhoItem }) => {
    // Chuyển đổi giá trị tonkhohientai thành số để so sánh chính xác
    const tonkho = Number(item.tonkhohientai);
    const tonkhothucte = Number(item.tonkhothucte);
    const tonghaohut = Number(item.tonghaohut) || 0;

    // Xác định trạng thái và màu sắc cho tồn kho
    let stockStatus = "";
    let statusColor = "";

    // Sử dụng tonkhothucte để xác định trạng thái hiển thị
    if (tonkhothucte === 0) {
      stockStatus = "Hết hàng";
      statusColor = "#e74c3c"; // đỏ
    } else if (tonkhothucte > 0 && tonkhothucte <= 30) {
      stockStatus = "Sắp hết";
      statusColor = "#f39c12"; // vàng cam
    } else {
      stockStatus = "Còn hàng";
      statusColor = "#2ecc71"; // xanh lá
    }

    // Xử lý ngày hết hạn
    const today = new Date();
    const expiryDate = item.ngayhethan ? new Date(item.ngayhethan) : null;
    let expiryStatus = "";
    let expiryColor = "";
    let diffDays = 0;

    if (expiryDate && !isNaN(expiryDate.getTime())) {
      // Tính số ngày còn lại
      const diffTime = expiryDate.getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expiryStatus = "Đã hết hạn";
        expiryColor = "#e74c3c"; // đỏ
      } else if (diffDays <= 30) {
        expiryStatus = `Còn ${diffDays} ngày`;
        expiryColor = "#f39c12"; // vàng cam
      } else {
        expiryStatus = "Còn hạn";
        expiryColor = "#2ecc71"; // xanh lá
      }
    }

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(`/product/${item.idvattu}`)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.tenvattu || "Không có tên"}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{stockStatus}</Text>
          </View>
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemDetails}>
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color="#7f8c8d" />
              <Text style={styles.itemInfo}>Mã: {item.idvattu || "N/A"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="folder-outline" size={16} color="#7f8c8d" />
              <Text style={styles.itemInfo}>
                Danh mục: {item.tendanhmuc || "N/A"}
              </Text>
            </View>

            {expiryDate && !isNaN(expiryDate.getTime()) && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={expiryColor}
                />
                <Text style={styles.itemInfo}>
                  HSD: {expiryDate.toLocaleDateString("vi-VN")}
                  <Text style={[styles.expiryStatus, { color: expiryColor }]}>
                    {" "}
                    {expiryStatus}
                  </Text>
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.quantityBox, { borderColor: statusColor }]}>
              <Text style={styles.quantityValue}>{tonkhothucte}</Text>
              <Text style={styles.quantityLabel}>Tồn kho</Text>
              <Text style={styles.quantityLabel}>thực tế</Text>

              {/* <Text style={styles.quantityValue}>{tonkho}</Text>
              <Text style={styles.quantityLabel}>Tồn kho</Text> */}
            </View>

            <View style={styles.movementContainer}>
              <View style={styles.movementRow}>
                <Ionicons name="arrow-down" size={12} color="#27ae60" />
                <Text style={styles.movementLabel}>Nhập:</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.movementValue, { color: "#27ae60" }]}
                  ellipsizeMode="tail"
                >
                  {formatCompactNumber(Number(item.tongnhap))}
                </Text>
              </View>
              <View style={styles.movementRow}>
                <Ionicons name="arrow-up" size={12} color="#e74c3c" />
                <Text style={styles.movementLabel}>Xuất:</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.movementValue, { color: "#e74c3c" }]}
                  ellipsizeMode="tail"
                >
                  {formatCompactNumber(Number(item.tongxuat))}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {expiryDate && diffDays <= 30 && diffDays >= 0 && (
          <View style={[styles.warningBar, { backgroundColor: expiryColor }]}>
            <Ionicons name="alert-circle" size={14} color="#fff" />
            <Text style={styles.warningText}>
              {diffDays > 0
                ? `Sản phẩm sẽ hết hạn trong ${diffDays} ngày!`
                : "Sản phẩm hết hạn hôm nay!"}
            </Text>
          </View>
        )}

        {/* Thêm chỉ báo lỗ (loss indicator) */}
        {tonghaohut > 0 && (
          <View style={styles.lossIndicator}>
            <Ionicons name="arrow-down" size={12} color="#e74c3c" />
            <Text style={styles.lossText}>
              Lỗ: {formatCompactNumber(tonghaohut)}{" "}
              {tonghaohut > 1000 ? "M" : "đ"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Hiển thị loading khi đang tải dữ liệu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Đang tải dữ liệu tồn kho...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh sách tồn kho</Text>
        <View style={styles.headerActions}>
          {/* Nút tìm kiếm */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSearchBar(!showSearchBar)}
          >
            <Ionicons
              name={showSearchBar ? "close-outline" : "search-outline"}
              size={24}
              color="#3498db"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              // Luân chuyển giữa các tiêu chí sắp xếp
              const nextSortBy = () => {
                switch (sortBy) {
                  case "name":
                    return "code";
                  case "code":
                    return "stock";
                  case "stock":
                    return "expiry";
                  case "expiry":
                    return "import";
                  case "import":
                    return "export";
                  case "export":
                    return "name";
                  default:
                    return "name";
                }
              };
              setSortBy(nextSortBy());
            }}
          >
            <Ionicons name={getSortIcon()} size={20} color="#3498db" />
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton} onPress={fetchTonKho}>
            <Ionicons name="refresh" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Thanh tìm kiếm */}
      {showSearchBar && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#7f8c8d" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên hoặc mã"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#7f8c8d" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Tab lọc */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => {
              setActiveTab("all");
            }}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={activeTab === "all" ? "#3498db" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.activeTabText,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "inStock" && styles.activeTab]}
            onPress={() => setActiveTab("inStock")}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={activeTab === "inStock" ? "#2ecc71" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "inStock" && styles.activeTabText,
                activeTab === "inStock" && { color: "#2ecc71" },
              ]}
            >
              Còn hàng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "lowStock" && styles.activeTab]}
            onPress={() => setActiveTab("lowStock")}
          >
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={activeTab === "lowStock" ? "#f39c12" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "lowStock" && styles.activeTabText,
                activeTab === "lowStock" && { color: "#f39c12" },
              ]}
            >
              Sắp hết
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "outOfStock" && styles.activeTab]}
            onPress={() => setActiveTab("outOfStock")}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={activeTab === "outOfStock" ? "#e74c3c" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "outOfStock" && styles.activeTabText,
                activeTab === "outOfStock" && { color: "#e74c3c" },
              ]}
            >
              Hết hàng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "expired" && styles.activeTab]}
            onPress={() => setActiveTab("expired")}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={activeTab === "expired" ? "#e74c3c" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "expired" && styles.activeTabText,
                activeTab === "expired" && { color: "#e74c3c" },
              ]}
            >
              Hết hạn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "nearExpiry" && styles.activeTab]}
            onPress={() => setActiveTab("nearExpiry")}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={activeTab === "nearExpiry" ? "#f39c12" : "#7f8c8d"}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "nearExpiry" && styles.activeTabText,
                activeTab === "nearExpiry" && { color: "#f39c12" },
              ]}
            >
              Sắp hết hạn
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {tonkho.length === 0 ? (
        // Hiển thị khi không có dữ liệu
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#95a5a6" />
          <Text style={styles.emptyTitle}>Không có dữ liệu tồn kho</Text>
          <Text style={styles.emptyText}>
            Hãy thêm vật tư vào kho hoặc kéo xuống để tải lại
          </Text>
          <TouchableOpacity
            style={styles.emptyRefreshButton}
            onPress={fetchTonKho}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.emptyRefreshText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Hiển thị danh sách đã được lọc và tìm kiếm
        <>
          <FlatList
            data={getSortedData(getFilteredData())}
            renderItem={renderItem}
            keyExtractor={(item) =>
              item.idvattu?.toString() || Math.random().toString()
            }
            contentContainerStyle={[
              styles.listContainer,
              getFilteredData().length === 0 && styles.emptyListContainer,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={50} color="#bdc3c7" />
                <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? `Không tìm thấy sản phẩm nào khớp với "${searchQuery}"`
                    : "Không có sản phẩm nào thuộc danh mục này"}
                </Text>
                {searchQuery ? (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery("")}
                  >
                    <Text style={styles.clearSearchText}>Xóa tìm kiếm</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          />
        </>
      )}

      {tonkho.length > 0 && (
        <View style={styles.resultsHeader}>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsCount}>
              {getFilteredData().length} kết quả
              {searchQuery ? ` cho "${searchQuery}"` : ""}
              {activeTab !== "all" ? ` (${getTabLabel()})` : ""}
            </Text>
          </View>

          <View style={styles.sortActions}>
            <TouchableOpacity
              style={styles.sortDirectionButton}
              onPress={() =>
                setSecondarySortBy(secondarySortBy === "asc" ? "desc" : "asc")
              }
            >
              <Ionicons
                name={secondarySortBy === "asc" ? "arrow-up" : "arrow-down"}
                size={16}
                color="#3498db"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                const nextSortBy = () => {
                  switch (sortBy) {
                    case "name":
                      return "code";
                    case "code":
                      return "stock";
                    case "stock":
                      return "expiry";
                    case "expiry":
                      return "import";
                    case "import":
                      return "export";
                    case "export":
                      return "name";
                    default:
                      return "name";
                  }
                };
                setSortBy(nextSortBy());
              }}
            >
              <Ionicons name={getSortIcon()} size={16} color="#3498db" />
              <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginBottom: 16,
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
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecf0f1",
    padding: 8,
    borderRadius: 16,
    marginRight: 12,
  },
  sortButtonText: {
    fontSize: 14,
    color: "#3498db",
    marginLeft: 4,
  },
  refreshButton: {
    padding: 8,
  },
  iconButton: {
    padding: 8,
  },

  // Tab styles
  tabContainer: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabScrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#3498db",
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#3498db",
    fontWeight: "bold",
  },

  // Summary stats
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: "70%",
    backgroundColor: "#ecf0f1",
  },

  // Item styles
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#34495e",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#3498db",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  itemInfo: {
    fontSize: 14,
    color: "#7f8c8d",
    marginLeft: 6,
  },
  expiryStatus: {
    fontWeight: "bold",
  },

  // Stats section
  statsContainer: {
    width: 100, // Tăng độ rộng thêm chút
    alignItems: "center",
  },
  quantityBox: {
    borderWidth: 2,
    borderRadius: 8,
    width: 75,
    height: 75,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quantityValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#34495e",
  },
  quantityLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  movementContainer: {
    width: 75,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    padding: 4,
  },
  movementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  movementLabel: {
    fontSize: 11,
    color: "#7f8c8d",
    marginLeft: 2,
  },
  movementValue: {
    fontSize: 11,
    fontWeight: "500",
    maxWidth: 35,
    textAlign: "right",
  },

  // Warning bar
  warningBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  warningText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ecf0f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498db",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyRefreshText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  emptyFilterContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyFilterText: {
    marginTop: 12,
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7f8c8d",
  },

  // Results header
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#34495e",
    fontWeight: "500",
  },
  sortActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortDirectionButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#ecf0f1",
  },

  // Search bar styles
  searchBarContainer: {
    marginBottom: 16,
    marginTop: -8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 6,
    color: "#34495e",
  },
  emptySearchContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#3498db",
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultsInfo: {
    flex: 1,
  },
  lossIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  lossText: {
    fontSize: 10,
    color: "#e74c3c",
    fontWeight: "600",
    marginLeft: 2,
  },
});
