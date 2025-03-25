// src/components/common/Input.jsx
const Input = ({
  label,
  error,
  type = 'text',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-gray-700 text-sm font-medium">
          {label}
        </label>
      )}
      <input
        type={type}
        className={`
          w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
          ${error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
        `}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default Input;