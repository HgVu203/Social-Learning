// src/components/common/Modal.jsx
import { useEffect } from "react";

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Không ẩn thanh cuộn để vẫn thấy trang Settings phía sau
      //document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
      <div className="min-h-screen px-4 text-center">
        {/* Backdrop trong suốt, chỉ áp dụng blur */}
        <div
          className="fixed inset-0 backdrop-blur-[1.5px] bg-[rgba(0,0,0,0.15)] pointer-events-auto"
          onClick={onClose}
        ></div>

        <span className="inline-block h-screen align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-[0_0_25px_rgba(0,0,0,0.3)] rounded-lg pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
