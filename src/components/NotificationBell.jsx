'use client';

import { useState, useEffect, useRef } from 'react';
import { HiBell } from 'react-icons/hi';
import api from '@/lib/api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/project/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(res.data || []);
      setUnread(res.data.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };
  console.log(notifications);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Mark notification as read
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/project/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnread((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <HiBell className="text-xl" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-30">
          <div className="p-3 border-b font-semibold text-gray-700 dark:text-gray-200">
            Notifications
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-3 text-sm text-gray-500 text-center">
                No notifications
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n._id}
                  className={`p-3 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    !n.read ? 'font-semibold bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => markAsRead(n._id)}
                >
                  {n.message}
                  <div className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
