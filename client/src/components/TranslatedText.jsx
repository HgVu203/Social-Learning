import { useTranslation } from "react-i18next";

/**
 * Component trợ giúp để dịch văn bản
 *
 * @param {Object} props - Props cho component
 * @param {string} props.textKey - Khóa dịch (i18n key)
 * @param {Object} props.params - Các tham số để truyền vào chuỗi dịch (optional)
 * @param {string} props.defaultText - Văn bản mặc định nếu khóa không tồn tại (optional)
 * @param {string} props.className - Class CSS cho thẻ span (optional)
 * @param {React.Element} props.component - Component để render thay vì span (optional)
 * @returns {React.Element} - Văn bản đã dịch
 */
const TranslatedText = ({
  textKey,
  params,
  defaultText,
  className = "",
  component: Component = "span",
  ...rest
}) => {
  const { t } = useTranslation();

  if (!textKey && !defaultText) {
    console.warn("TranslatedText: textKey hoặc defaultText phải được cung cấp");
    return null;
  }

  const translatedText = textKey
    ? t(textKey, { ...params, defaultValue: defaultText })
    : defaultText;

  return (
    <Component className={className} {...rest}>
      {translatedText}
    </Component>
  );
};

export default TranslatedText;
