/**
 * EmptyPlaceholder component
 * Used to display a message when there's no data to show
 */
const EmptyPlaceholder = ({ title, description, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-4 text-[var(--color-text-secondary)] opacity-50">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
        {description}
      </p>
    </div>
  );
};

export default EmptyPlaceholder;
