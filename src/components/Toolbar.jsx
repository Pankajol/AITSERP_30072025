"use client";

import React from "react";

const Toolbar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-2 flex gap-2 flex-wrap sticky top-0 z-10">
      {/* BOLD */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive("bold")
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-gray-200"
        }`}
      >
        Bold
      </button>

      {/* ITALIC */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive("italic")
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-gray-200"
        }`}
      >
        Italic
      </button>

      {/* STRIKE */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleStrike().run();
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive("strike")
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-gray-200"
        }`}
      >
        Strike
      </button>

      {/* HEADING 2 */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive("heading", { level: 2 })
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-gray-200"
        }`}
      >
        H2
      </button>

      {/* BULLET LIST */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBulletList().run();
        }}
        className={`px-3 py-1 rounded text-sm font-medium ${
          editor.isActive("bulletList")
            ? "bg-black text-white"
            : "bg-white text-black hover:bg-gray-200"
        }`}
      >
        List
      </button>

      {/* UNDO */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().undo().run();
        }}
        className="px-3 py-1 rounded text-sm font-medium bg-white text-black hover:bg-gray-200"
      >
        Undo
      </button>
    </div>
  );
};

export default Toolbar;