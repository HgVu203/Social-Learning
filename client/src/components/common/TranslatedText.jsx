import { useTranslation } from "react-i18next";

/**
 * Component to easily translate text using i18next
 * @param {Object} props - Component props
 * @param {string} props.text - The translation key
 * @param {Object} props.params - Optional parameters for the translation
 * @param {string} props.as - HTML element to render as (default: 'span')
 * @param {React.CSSProperties} props.style - Optional style
 * @param {string} props.className - Optional CSS class
 * @param {React.ReactNode} props.children - Optional children
 */
const TranslatedText = ({
  text,
  params = {},
  as: Element = "span",
  style,
  className,
  children,
  ...rest
}) => {
  const { t } = useTranslation();

  return (
    <Element style={style} className={className} {...rest}>
      {t(text, params)}
      {children}
    </Element>
  );
};

export default TranslatedText;
