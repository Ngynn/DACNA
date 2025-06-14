import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  isDarkMode: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>("light");

  // Tải theme từ AsyncStorage khi component được mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme === "dark" || savedTheme === "light") {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error("Lỗi khi tải theme:", error);
      }
    };

    loadTheme();
  }, []);

  // Lưu theme vào AsyncStorage khi thay đổi
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("theme", theme);
      } catch (error) {
        console.error("Lỗi khi lưu theme:", error);
      }
    };

    saveTheme();
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDarkMode: theme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
