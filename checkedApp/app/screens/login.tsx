import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API_URL from "../../config/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(
        "Thông báo",
        "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"
      );
      return;
    }

    setIsLoading(true);
    console.log(`Đang kết nối tới: ${API_URL}/api/dangnhap`);
    console.log("Dữ liệu đăng nhập:", {
      tendangnhap: username,
      matkhau: password,
    });

    try {
      const response = await axios.post(`${API_URL}/api/dangnhap`, {
        tendangnhap: username,
        matkhau: password,
      });

      console.log("Phản hồi server:", response.data);

      const { token, user } = response.data;
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Chi tiết lỗi:", error);

      let errorMessage = "Có lỗi xảy ra khi đăng nhập";

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Lỗi server:", error.response.data);
          console.error("Mã lỗi:", error.response.status);
          errorMessage = error.response.data.message || errorMessage;
        } else if (error.request) {
          console.error("Lỗi kết nối:", error.request);
          errorMessage =
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
        }
      }

      Alert.alert("Đăng nhập thất bại", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Kiểm tra trạng thái đăng nhập với Expo Router
  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const user = await AsyncStorage.getItem("user");

      if (token && user) {
        router.replace("/(tabs)/home");
      }
    } catch (error) {
      console.log("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
    }
  };

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>Quản Lý Nhập Xuất Kho</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Đăng nhập</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tên đăng nhập"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ứng dụng quản lý kho KKTL</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    color: "#555",
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  loginButton: {
    backgroundColor: "#3498db",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPasswordLink: {
    marginTop: 15,
    alignItems: "center",
  },
  forgotPasswordText: {
    color: "#3498db",
    fontSize: 14,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#999",
    fontSize: 12,
  },
});
