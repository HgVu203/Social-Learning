import { useState } from "react";
import { FaSearch, FaTimesCircle } from "react-icons/fa";
import Select from "../ui/Select";
import { useTranslation } from "react-i18next";

/**
 * Component tìm kiếm nâng cao có thể tùy chỉnh cho các trang quản lý
 *
 * @param {Object} props - Props của component
 * @param {Array} props.fields - Mảng các trường có thể tìm kiếm, cấu trúc: [{ value: 'name', label: 'Tên' }]
 * @param {Function} props.onSearch - Callback được gọi khi thực hiện tìm kiếm
 * @param {boolean} props.loading - Trạng thái loading
 */
const AdvancedSearch = ({
  fields,
  onSearch,
  loading = false,
  className = "",
}) => {
  const { t } = useTranslation();
  const [searchField, setSearchField] = useState(fields[0]?.value || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Nếu xóa hết, trở về dữ liệu ban đầu
    if (newValue === "") {
      onSearch({ field: searchField, term: "" });
    }
  };

  const handleSearch = () => {
    onSearch({
      field: searchField,
      term: searchTerm.trim(),
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch({
      field: searchField,
      term: "",
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleFieldChange = (e) => {
    const newField = e.target.value;
    setSearchField(newField);
  };

  return (
    <div
      className={`bg-[var(--color-bg-secondary)] rounded-xl p-3 shadow-sm border border-[var(--color-border)] ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        {/* Field selector */}
        <div className="w-full md:w-48">
          <Select
            value={searchField}
            onChange={handleFieldChange}
            options={fields}
            className="h-full"
            disabled={loading}
          />
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder={t("admin.search")}
            className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-[var(--color-bg-primary)] border ${
              isFocused
                ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
                : "border-[var(--color-border)]"
            } text-[var(--color-text-primary)] focus:outline-none transition-all`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]" />

          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
              disabled={loading}
            >
              <FaTimesCircle />
            </button>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg flex items-center justify-center font-medium transition-all ${
            loading
              ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed"
              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
              {t("common.loading")}
            </>
          ) : (
            t("common.search")
          )}
        </button>
      </div>
    </div>
  );
};

export default AdvancedSearch;
