import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ✅ Định nghĩa các type filters
export type PriorityFilter =
  | "all"
  | "critical"
  | "expired"
  | "nearExpiry"
  | "normal";
export type CategoryFilter =
  | "all"
  | "consumable"
  | "equipment"
  | "medicine"
  | "other";
export type StockFilter = "all" | "lowStock" | "highStock";
export type UnitFilter =
  | "all"
  | "hop"
  | "cuon"
  | "bo"
  | "chiec"
  | "lo"
  | "chai"
  | "cai";
export type TabType = "all" | "checked" | "unchecked" | "haohut";

interface AdvancedFiltersProps {
  priorityFilter: PriorityFilter;
  setPriorityFilter: (value: PriorityFilter) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (value: CategoryFilter) => void;
  stockFilter: StockFilter;
  setStockFilter: (value: StockFilter) => void;
  isVisible: boolean;
  onToggle: () => void;
  activeFiltersCount: number;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  isVisible,
  onToggle,
  activeFiltersCount,
}) => {
  const priorityFilters = [
    {
      id: "all" as PriorityFilter,
      name: "Tất cả",
      icon: "grid-outline",
      color: "#95a5a6",
    },
    {
      id: "critical" as PriorityFilter,
      name: "Tồn kho thấp",
      icon: "warning",
      color: "#e67e22",
    },
    {
      id: "expired" as PriorityFilter,
      name: "Đã hết hạn",
      icon: "time",
      color: "#e74c3c",
    },
    {
      id: "nearExpiry" as PriorityFilter,
      name: "Sắp hết hạn (60 ngày)",
      icon: "timer",
      color: "#f39c12",
    },
    {
      id: "normal" as PriorityFilter,
      name: "Ổn định",
      icon: "checkmark-circle",
      color: "#27ae60",
    },
  ];

  const categoryFilters = [
    {
      id: "all" as CategoryFilter,
      name: "Tất cả",
      icon: "apps-outline",
      color: "#95a5a6",
    },
    {
      id: "consumable" as CategoryFilter,
      name: "Vật tư tiêu hao",
      icon: "cube",
      color: "#16a085",
    },
    {
      id: "equipment" as CategoryFilter,
      name: "Thiết bị y tế",
      icon: "hardware-chip",
      color: "#34495e",
    },
    {
      id: "medicine" as CategoryFilter,
      name: "Hóa chất/Sinh phẩm",
      icon: "flask",
      color: "#9b59b6",
    },
    {
      id: "other" as CategoryFilter,
      name: "Khác",
      icon: "ellipsis-horizontal",
      color: "#95a5a6",
    },
  ];

  const stockFilters = [
    {
      id: "all" as StockFilter,
      name: "Tất cả",
      icon: "layers-outline",
      color: "#95a5a6",
    },
    {
      id: "lowStock" as StockFilter,
      name: "Thấp (1-10)",
      icon: "trending-down",
      color: "#f39c12",
    },
    {
      id: "highStock" as StockFilter,
      name: "Cao (>50)",
      icon: "trending-up",
      color: "#27ae60",
    },
  ];

  const clearAllFilters = () => {
    setPriorityFilter("all");
    setCategoryFilter("all");
    setStockFilter("all");
  };

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      <TouchableOpacity style={styles.toggleButton} onPress={onToggle}>
        <View style={styles.toggleLeft}>
          <Ionicons name="options" size={16} color="#3498db" />
          <Text style={styles.toggleText}>Bộ lọc nâng cao</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.toggleRight}>
          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
          <Ionicons
            name={isVisible ? "chevron-up" : "chevron-down"}
            size={16}
            color="#3498db"
          />
        </View>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.filtersContent}>
          {/* Priority Filters */}
          <FilterSection
            title="🚨 Độ ưu tiên"
            filters={priorityFilters}
            activeFilter={priorityFilter}
            onFilterChange={setPriorityFilter}
          />

          {/* Category Filters */}
          <FilterSection
            title="📋 Danh mục"
            filters={categoryFilters}
            activeFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
          />

          {/* Stock Filters */}
          <FilterSection
            title="📦 Tồn kho"
            filters={stockFilters}
            activeFilter={stockFilter}
            onFilterChange={setStockFilter}
          />
        </View>
      )}
    </View>
  );
};

// ✅ Cập nhật FilterSection với generic types
interface FilterSectionProps<T> {
  title: string;
  filters: Array<{
    id: T;
    name: string;
    icon: string;
    color: string;
  }>;
  activeFilter: T;
  onFilterChange: (value: T) => void;
}

function FilterSection<T extends string>({
  title,
  filters,
  activeFilter,
  onFilterChange,
}: FilterSectionProps<T>) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                activeFilter === filter.id && [
                  styles.activeFilterChip,
                  { backgroundColor: filter.color },
                ],
              ]}
              onPress={() => onFilterChange(filter.id)}
            >
              <Ionicons
                name={filter.icon as any}
                size={14}
                color={activeFilter === filter.id ? "#fff" : filter.color}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.id && styles.activeFilterChipText,
                ]}
              >
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    color: "#3498db",
    marginLeft: 8,
    fontWeight: "500",
  },
  filterCountBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 18,
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  clearButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: "#e74c3c",
    fontWeight: "500",
  },
  filtersContent: {
    paddingBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
    marginLeft: 20,
  },
  filterRow: {
    flexDirection: "row",
    paddingLeft: 20,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  activeFilterChip: {
    borderColor: "transparent",
  },
  filterChipText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  activeFilterChipText: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default AdvancedFilters;
