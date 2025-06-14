import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#673ab7",
        tabBarInactiveTintColor: "#000",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#ccc",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checked"
        options={{
          tabBarLabel: "Kiểm tra",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="check-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="importData"
        options={{
          tabBarLabel: "Nhập kho",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="plus-circle" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="setting"
        options={{
          tabBarLabel: "Cài đặt",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="cog" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
