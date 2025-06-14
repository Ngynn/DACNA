import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import API_URL from "@/config/api";

type PhieuKiemKe = {
  idkiemke: number;
  ngaykiem: string;
  idnguoidung: number;
  tennguoidung: string;
  trangthai: "dang_kiem" | "hoan_thanh";
  tongsoluongvattu: number;
  soluongdakiem: number;
};

export default function Checked() {
  const [phieuKiemKe, setPhieuKiemKe] = useState<PhieuKiemKe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  // Lấy danh sách phiếu kiểm kê
  const fetchPhieuKiemKe = async () => {
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

      const response = await axios.get(`${API_URL}/api/kiemke`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPhieuKiemKe(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách phiếu kiểm kê:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách phiếu kiểm kê");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tạo phiếu kiểm kê mới
  const createPhieuKiemKe = async () => {
    console.log("🚀 CREATE PHIEU CALLED");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert(
          "Thông báo",
          "Phiên làm việc hết hạn, vui lòng đăng nhập lại"
        );
        return;
      }

      const today = new Date();
      const todayLocal = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      console.log("📅 Creating for date (local):", todayLocal);
      console.log(
        "📅 Creating for date (UTC):",
        new Date().toISOString().split("T")[0]
      );

      console.log("📊 Current phieuKiemKe state:", phieuKiemKe);
      console.log("📊 State length:", phieuKiemKe.length);

      const existingPhieuToday = phieuKiemKe.find((phieu, index) => {
        const phieuDateUTC = new Date(phieu.ngaykiem)
          .toISOString()
          .split("T")[0];
        const phieuDateLocal = new Date(phieu.ngaykiem).toLocaleDateString(
          "en-CA"
        );

        const isTodayUTC =
          phieuDateUTC === new Date().toISOString().split("T")[0];
        const isTodayLocal = phieuDateLocal === todayLocal;
        const isMatch = isTodayUTC || isTodayLocal;

        console.log(`🔍 Checking phieu ${index + 1}:`, {
          id: phieu.idkiemke,
          originalDate: phieu.ngaykiem,
          phieuDateUTC: phieuDateUTC,
          phieuDateLocal: phieuDateLocal,
          todayUTC: new Date().toISOString().split("T")[0],
          todayLocal: todayLocal,
          isMatch: isMatch,
        });

        return isMatch;
      });

      console.log("🔍 Existing phieu today:", existingPhieuToday);

      if (existingPhieuToday) {
        // console.log("BLOCKED: Found existing phieu");

        Alert.alert(
          "Không thể tạo phiếu",
          `Hôm nay đã có phiếu kiểm kê (Phiếu #${existingPhieuToday.idkiemke})\n\nMỗi ngày chỉ được tạo 1 phiếu kiểm kê.`,
          [
            {
              text: "Mở phiếu có sẵn",
              onPress: () => {
                setShowCreateModal(false);
                openPhieuDetail(existingPhieuToday);
              },
            },
            {
              text: "Đóng",
              style: "cancel",
              onPress: () => setShowCreateModal(false),
            },
          ]
        );
        return;
      }

      // console.log(" Validation passed, calling API...");

      const response = await axios.post(
        `${API_URL}/api/kiemke`,
        { ngaykiem: todayLocal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // console.log("API response:", response.data);

      setShowCreateModal(false);
      await fetchPhieuKiemKe();

      Alert.alert("Thành công", "Đã tạo phiếu kiểm kê mới", [
        {
          text: "Mở phiếu ngay",
          onPress: () => {
            openPhieuDetail({
              idkiemke: response.data.data.idkiemke,
              ngaykiem: response.data.data.ngaykiem,
              tennguoidung: "Bạn",
              trangthai: "dang_kiem",
              tongsoluongvattu: 0,
              soluongdakiem: 0,
              idnguoidung: response.data.data.idnguoidung,
            });
          },
        },
        { text: "OK" },
      ]);
    } catch (error) {
      // console.error(" Error in createPhieuKiemKe:", error);

      if (axios.isAxiosError(error)) {
        // console.log("Axios error status:", error.response?.status);
        // console.log("Axios error data:", error.response?.data);

        if (error.response?.status === 409) {
          Alert.alert(
            "Không thể tạo phiếu",
            "Hôm nay đã có phiếu kiểm kê rồi!"
          );
          await fetchPhieuKiemKe();
        } else {
          Alert.alert(
            "Lỗi",
            `Không thể tạo phiếu kiểm kê: ${error.response?.status}`
          );
        }
      } else {
        Alert.alert("Lỗi", "Không thể tạo phiếu kiểm kê");
      }

      setShowCreateModal(false);
    }
  };

  // Mở chi tiết phiếu kiểm kê
  const openPhieuDetail = (phieu: PhieuKiemKe) => {
    router.push({
      pathname: "/kiemke/[id]",
      params: {
        id: phieu.idkiemke.toString(),
        idkiemke: phieu.idkiemke.toString(),
        ngaykiem: phieu.ngaykiem,
        tennguoidung: phieu.tennguoidung,
      },
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPhieuKiemKe();
    }, [])
  );

  // Thêm hàm deletePhieuKiemKe vào component Checked
  const deletePhieuKiemKe = async (phieu: PhieuKiemKe) => {
    try {
      const phieuDateString = new Date(phieu.ngaykiem).toLocaleDateString(
        "vi-VN"
      );
      const isToday =
        new Date(phieu.ngaykiem).toISOString().split("T")[0] ===
        new Date().toISOString().split("T")[0];

      Alert.alert(
        "Xác nhận xóa phiếu",
        `Bạn có chắc chắn muốn xóa phiếu kiểm kê này?\n\n` +
          `Phiếu #${phieu.idkiemke}\n` +
          `Ngày: ${phieuDateString}\n` +
          `Người tạo: ${phieu.tennguoidung}\n` +
          `Trạng thái: ${
            phieu.trangthai === "hoan_thanh" ? "Hoàn thành" : "Đang kiểm"
          }\n` +
          `Tiến độ: ${phieu.soluongdakiem}/${phieu.tongsoluongvattu} vật tư\n\n` +
          `${isToday ? "Phiếu hôm nay" : "Phiếu ngày trước"}\n\n` +
          `CẢNH BÁO: Tất cả dữ liệu kiểm kê trong phiếu này sẽ bị mất vĩnh viễn!`,
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Xóa phiếu",
            style: "destructive",
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem("token");
                if (!token) {
                  Alert.alert("Lỗi", "Phiên làm việc hết hạn");
                  return;
                }

                // console.log(
                //   `Deleting phieu ${phieu.idkiemke} (${phieuDateString})`
                // );

                const response = await axios.delete(
                  `${API_URL}/api/kiemke/${phieu.idkiemke}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                // console.log(" Delete response:", response.data);

                setPhieuKiemKe((prevPhieus) =>
                  prevPhieus.filter((p) => p.idkiemke !== phieu.idkiemke)
                );

                Alert.alert(
                  "Thành công",
                  `Đã xóa phiếu kiểm kê #${phieu.idkiemke} (${phieuDateString}) thành công`
                );
              } catch (error) {
                // console.error(" Error deleting phieu:", error);

                if (axios.isAxiosError(error)) {
                  const errorMessage =
                    error.response?.data?.error ||
                    "Không thể xóa phiếu kiểm kê";
                  Alert.alert("Lỗi", errorMessage);
                } else {
                  Alert.alert("Lỗi", "Không thể xóa phiếu kiểm kê");
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      // console.error("Error in deletePhieuKiemKe:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa phiếu");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhieuKiemKe();
  };

  const getLocalDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
  };

  const getUTCDateString = () => {
    return new Date().toISOString().split("T")[0];
  };

  const isPhieuToday = (phieu: PhieuKiemKe) => {
    const todayLocal = getLocalDateString();
    const todayUTC = getUTCDateString();

    const phieuDateUTC = new Date(phieu.ngaykiem).toISOString().split("T")[0];
    const phieuDateLocal = new Date(phieu.ngaykiem).toLocaleDateString("en-CA");

    return phieuDateUTC === todayUTC || phieuDateLocal === todayLocal;
  };

  const findTodayPhieu = () => {
    return phieuKiemKe.find((phieu) => isPhieuToday(phieu));
  };

  // Sửa lại canCreateTodayPhieu đơn giản hơn
  const canCreateTodayPhieu = () => {
    // console.log("=== DEBUG CAN CREATE TODAY ===");
    // console.log("Today (local):", getLocalDateString());
    // console.log("Today (UTC):", getUTCDateString());
    // console.log("Total phieus:", phieuKiemKe.length);

    if (phieuKiemKe.length === 0) {
      // console.log("Không có phiếu tìm thấy, có thể tạo phiếu mới");
      return true;
    }

    const todayPhieu = findTodayPhieu();
    const hasPhieuToday = !!todayPhieu;

    if (todayPhieu) {
      // console.log("Found existing phieu for today:", todayPhieu);
    }

    // console.log("🔍 Has phieu today:", hasPhieuToday);
    // console.log("🔍 Can create:", !hasPhieuToday);
    // console.log("=== END DEBUG ===");

    return !hasPhieuToday;
  };

  // Cập nhật renderPhieuItem để hiển thị nút xóa cho tất cả phiếu
  const renderPhieuItem = ({ item }: { item: PhieuKiemKe }) => {
    const progressPercent =
      item.tongsoluongvattu > 0
        ? Math.round((item.soluongdakiem / item.tongsoluongvattu) * 100)
        : 0;

    const phieuDate = new Date(item.ngaykiem).toISOString().split("T")[0];
    const todayDate = new Date().toISOString().split("T")[0];
    const isToday = phieuDate === todayDate;

    return (
      <TouchableOpacity
        style={styles.phieuContainer}
        onPress={() => openPhieuDetail(item)}
      >
        <View style={styles.phieuHeader}>
          <View style={styles.phieuInfo}>
            <View style={styles.phieuTitleRow}>
              <Text style={styles.phieuTitle}>
                Phiếu kiểm kê #{item.idkiemke}
              </Text>
              {isToday && (
                <View style={styles.todayIndicator}>
                  <Text style={styles.todayIndicatorText}>Hôm nay</Text>
                </View>
              )}
            </View>
            <Text style={styles.phieuDate}>
              <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />{" "}
              {new Date(item.ngaykiem).toLocaleDateString("vi-VN")}
            </Text>
            <Text style={styles.phieuUser}>
              <Ionicons name="person-outline" size={14} color="#7f8c8d" />{" "}
              {item.tennguoidung}
            </Text>
          </View>

          <View style={styles.phieuActions}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                isToday ? styles.deleteButtonToday : styles.deleteButtonOld,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                deletePhieuKiemKe(item);
              }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={isToday ? "#e74c3c" : "#95a5a6"}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.statusBadge,
                item.trangthai === "hoan_thanh"
                  ? styles.completedBadge
                  : styles.inProgressBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.trangthai === "hoan_thanh"
                    ? styles.completedText
                    : styles.inProgressText,
                ]}
              >
                {item.trangthai === "hoan_thanh" ? "Hoàn thành" : "Đang kiểm"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Tiến độ: {item.soluongdakiem}/{item.tongsoluongvattu} vật tư
            </Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Nhấn để mở phiếu</Text>
          <Ionicons name="chevron-forward" size={20} color="#3498db" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Phiếu kiểm kê</Text>

        <View style={styles.headerActions}>
          {canCreateTodayPhieu() ? (
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={styles.createButton}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Tạo phiếu hôm nay</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const todayPhieu = findTodayPhieu();
                if (todayPhieu) {
                  openPhieuDetail(todayPhieu);
                } else {
                  Alert.alert(
                    "Thông báo",
                    "Không tìm thấy phiếu kiểm kê hôm nay"
                  );
                }
              }}
              style={styles.todayPhieuButton}
            >
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
              <Text style={styles.todayPhieuText}>Mở phiếu hôm nay</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{phieuKiemKe.length}</Text>
          <Text style={styles.statLabel}>Tổng phiếu</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {phieuKiemKe.filter((p) => p.trangthai === "dang_kiem").length}
          </Text>
          <Text style={styles.statLabel}>Đang kiểm</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {phieuKiemKe.filter((p) => p.trangthai === "hoan_thanh").length}
          </Text>
          <Text style={styles.statLabel}>Hoàn thành</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={phieuKiemKe}
        renderItem={renderPhieuItem}
        keyExtractor={(item) => item.idkiemke.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>Chưa có phiếu kiểm kê nào</Text>
            <Text style={styles.emptySubText}>
              {canCreateTodayPhieu()
                ? 'Nhấn "Tạo phiếu" để bắt đầu'
                : "Hôm nay đã có phiếu kiểm kê"}
            </Text>

            {canCreateTodayPhieu() && (
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={styles.emptyCreateButton}
              >
                <Ionicons name="add-circle-outline" size={24} color="#3498db" />
                <Text style={styles.emptyCreateText}>Tạo phiếu hôm nay</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {canCreateTodayPhieu()
                  ? "Tạo phiếu kiểm kê hôm nay"
                  : "Không thể tạo phiếu"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#7f8c8d" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#3498db" />
                <Text style={styles.infoText}>
                  Ngày kiểm: {new Date().toLocaleDateString("vi-VN")}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#3498db" />
                <Text style={styles.infoText}>Người kiểm: Bạn</Text>
              </View>

              <View style={styles.validationSection}>
                {canCreateTodayPhieu() ? (
                  <View style={styles.validationSuccessRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#27ae60"
                    />
                    <View style={styles.validationTextContainer}>
                      <Text style={styles.validationTextSuccess}>
                        Có thể tạo phiếu kiểm kê
                      </Text>
                      <Text style={styles.validationSubText}>
                        Hôm nay chưa có phiếu kiểm kê nào
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.validationErrorRow}>
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                    <View style={styles.validationTextContainer}>
                      <Text style={styles.validationTextError}>
                        Không thể tạo phiếu mới
                      </Text>
                      <Text style={styles.validationSubText}>
                        Hôm nay đã có phiếu kiểm kê rồi
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Warning luôn hiển thị */}
              <View style={styles.warningSection}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#f39c12"
                />
                <Text style={styles.warningText}>
                  Quy định: Mỗi ngày chỉ được tạo 1 phiếu kiểm kê
                </Text>
              </View>

              {canCreateTodayPhieu() ? (
                <Text style={styles.confirmText}>
                  Phiếu kiểm kê sẽ bao gồm tất cả vật tư hiện có trong kho để
                  bạn thực hiện kiểm kê.
                </Text>
              ) : (
                <Text style={styles.blockText}>
                  Bạn có thể mở phiếu kiểm kê có sẵn để tiếp tục công việc hoặc
                  đợi đến ngày mai để tạo phiếu mới.
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {canCreateTodayPhieu() ? "Hủy" : "Đóng"}
                </Text>
              </TouchableOpacity>

              {canCreateTodayPhieu() ? (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={createPhieuKiemKe}
                >
                  <Text style={styles.confirmButtonText}>
                    Tạo phiếu hôm nay
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.openExistingButton}
                  onPress={() => {
                    const todayPhieu = findTodayPhieu();
                    if (todayPhieu) {
                      setShowCreateModal(false);
                      openPhieuDetail(todayPhieu);
                    } else {
                      Alert.alert(
                        "Thông báo",
                        "Không tìm thấy phiếu kiểm kê hôm nay"
                      );
                    }
                  }}
                >
                  <Text style={styles.openExistingButtonText}>
                    Mở phiếu có sẵn
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  phieuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  todayPhieuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1e7dd",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  todayPhieuText: {
    color: "#155724",
    fontWeight: "600",
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3498db",
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingTop: 16,
  },
  phieuContainer: {
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
  phieuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  phieuInfo: {
    flex: 1,
  },
  phieuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 6,
  },
  phieuDate: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  phieuUser: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  phieuActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    marginRight: 4,
  },
  deleteButtonToday: {
    backgroundColor: "#ffebee", // Đỏ nhạt cho phiếu hôm nay
  },
  deleteButtonOld: {
    backgroundColor: "#f5f5f5", // Xám nhạt cho phiếu cũ
  },
  phieuStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadge: {
    backgroundColor: "#d5f4e6",
  },
  inProgressBadge: {
    backgroundColor: "#fff3cd",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  completedText: {
    color: "#155724",
  },
  inProgressText: {
    color: "#856404",
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3498db",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#ecf0f1",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7f8c8d",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#95a5a6",
    marginBottom: 24,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3498db",
    borderStyle: "dashed",
  },
  emptyCreateText: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  modalContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: "#2c3e50",
    marginLeft: 12,
  },
  confirmText: {
    fontSize: 14,
    color: "#7f8c8d",
    lineHeight: 20,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  todayPhieuInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1e7dd",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  warningSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffeaa7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: "#e74c3c",
    marginLeft: 8,
    flex: 1,
    fontWeight: "bold",
  },
  validationSection: {
    marginBottom: 16,
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  validationTextSuccess: {
    fontSize: 14,
    color: "#27ae60",
    marginLeft: 8,
  },
  validationTextError: {
    fontSize: 14,
    color: "#e74c3c",
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
  },
  disabledButtonText: {
    color: "#fff",
    opacity: 0.7,
  },
  validationSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d4edda",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  validationErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  validationTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  validationSubText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  blockText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 8,
    lineHeight: 20,
  },
  openExistingButton: {
    flex: 1,
    backgroundColor: "#e1f5fe",
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  openExistingButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#01579b",
  },
  todayIndicator: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  todayIndicatorText: {
    fontSize: 10,
    color: "#1976d2",
    fontWeight: "600",
  },
});
