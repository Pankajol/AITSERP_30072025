"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FaEllipsisV } from "react-icons/fa";

export default function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calculatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = actions.length * 40;

      // Center horizontally under the button
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      let top = rect.bottom + 8;

      // Horizontal flip if overflowing
      if (left < 8) left = 8; // Keep some margin
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      // Vertical flip if not enough space below
      if (window.innerHeight - rect.bottom < menuHeight) {
        top = rect.top - menuHeight - 8;
      }

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 9999,
      });
    }
  };

  useEffect(() => {
    if (open) {
      calculatePosition();
      window.addEventListener("scroll", calculatePosition, true);
      window.addEventListener("resize", calculatePosition);
    }
    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
      >
        <FaEllipsisV size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={style}
            className="w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${action.color || ""}`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
