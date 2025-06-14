import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import API_URL from "../../config/api";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  type User = {
    tendangnhap?: string;
    vaitro?: string;
    email?: string;
  };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [appVersion, setAppVersion] = useState("1.0.0");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userJson = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");

      if (userJson && token) {
        const userObj = JSON.parse(userJson);
        setUser(userObj);

        const savedSettings = await AsyncStorage.getItem("userSettings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
        }
      } else {
        router.replace("/screens/login");
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu người dùng:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    // Kiểm tra form
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không khớp với xác nhận mật khẩu");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Lỗi", "Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    try {
      setChangingPassword(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        router.replace("/screens/login");
        return;
      }

      // Gọi API đổi mật khẩu
      const response = await axios.put(
        `${API_URL}/api/doimatkhau`,
        {
          matkhauCu: currentPassword,
          matkhauMoi: newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Xử lý kết quả
      if (response.status === 200) {
        // Thông báo thành công với nút OK
        Alert.alert("Thành công", "Đổi mật khẩu thành công", [
          {
            text: "OK",
            onPress: () => {
              // Đóng modal sau khi người dùng nhấn OK
              setPasswordModalVisible(false);

              // Reset form
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Lỗi khi đổi mật khẩu:", error);

      // Xử lý lỗi với TypeScript
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;

          if (status === 401) {
            Alert.alert("Lỗi", "Mật khẩu hiện tại không đúng");
          } else if (status === 404) {
            Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
          } else {
            Alert.alert(
              "Lỗi",
              error.response.data?.message || "Có lỗi xảy ra khi đổi mật khẩu"
            );
          }
        } else if (error.request) {
          Alert.alert("Lỗi kết nối", "Không nhận được phản hồi từ máy chủ");
        } else {
          Alert.alert("Lỗi", "Có lỗi xảy ra khi gửi yêu cầu");
        }
      } else {
        Alert.alert("Lỗi không xác định", "Có lỗi xảy ra khi đổi mật khẩu");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      // Hiển thị xác nhận
      Alert.alert(
        "Xác nhận đăng xuất",
        "Bạn có chắc chắn muốn đăng xuất không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng xuất",
            style: "destructive",
            onPress: async () => {
              // Xóa dữ liệu đăng nhập
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("user");

              // Chuyển hướng đến màn hình đăng nhập
              router.replace("/screens/login");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  // Hiển thị loading khi đang tải dữ liệu
  if (loading) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["right", "left"]}>
      <Stack.Screen
        options={{
          title: "Cài đặt",
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498db"]}
          />
        }
      >
        {/* Phần thông tin người dùng */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.tendangnhap || "Người dùng"}
            </Text>
            <Text style={styles.userRole}>
              {user?.vaitro || "Không xác định"}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || "Email chưa cung cấp"}
            </Text>
          </View>
        </View>

        {/* Phần cài đặt tài khoản */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#3498db" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Đổi mật khẩu</Text>
              <Text style={styles.settingDescription}>
                Cập nhật mật khẩu đăng nhập
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
          </TouchableOpacity>
        </View>

        {/* Phần cài đặt ứng dụng */}
        <View style={styles.settingSection}>
          <Text style={styles.sectionTitle}>Ứng dụng</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert(
                "Thông tin",
                "Ứng dụng Quản Lý Kho\nPhiên bản " + appVersion
              )
            }
          >
            <View style={styles.settingIconContainer}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#3498db"
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Thông tin ứng dụng</Text>
              <Text style={styles.settingDescription}>
                Phiên bản {appVersion}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
          </TouchableOpacity>
        </View>

        {/* Nút đăng xuất */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>

        {/* Modal đổi mật khẩu */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={passwordModalVisible}
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandleContainer}>
                <View style={styles.modalHandle} />
              </View>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <TouchableOpacity
                  onPress={() => setPasswordModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#7f8c8d" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mật khẩu hiện tại</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.formInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Nhập mật khẩu hiện tại"
                      secureTextEntry={true}
                    />
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color="#95a5a6"
                      style={styles.inputIcon}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mật khẩu mới</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.formInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Nhập mật khẩu mới"
                      secureTextEntry={true}
                    />
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color="#95a5a6"
                      style={styles.inputIcon}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Xác nhận mật khẩu mới</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.formInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Nhập lại mật khẩu mới"
                      secureTextEntry={true}
                    />
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color="#95a5a6"
                      style={styles.inputIcon}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        Cập nhật mật khẩu
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    // paddingTop: 30,
    marginTop: 50,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7f8c8d",
  },

  // User Section
  userSection: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "500",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#7f8c8d",
  },

  // Setting Sections
  settingSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecf0f1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: "#34495e",
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: "#7f8c8d",
  },

  // Logout Button
  logoutButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHandleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#34495e",
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  formInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ecf0f1",
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  submitButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
