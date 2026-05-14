import { Menu } from "@headlessui/react";
import { MoreVertical } from "lucide-react"; // 3 dots icon

export default function ActionsMenu({ p, openModal, handleDelete }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="p-2 rounded hover:bg-gray-100">
        <MoreVertical className="w-5 h-5" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-10">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => openModal(p)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  active ? "bg-blue-500 text-white" : "text-gray-700"
                }`}
              >
                Edit
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => alert(JSON.stringify(p, null, 2))}
                className={`w-full text-left px-3 py-2 text-sm ${
                  active ? "bg-green-500 text-white" : "text-gray-700"
                }`}
              >
                View
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => handleDelete(p._id)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  active ? "bg-red-500 text-white" : "text-gray-700"
                }`}
              >
                Delete
              </button>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Menu>
  );
}
