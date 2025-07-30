"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';

const LogoutButton = () => {
  const [isMounted, setIsMounted] = useState(false); // Ensure the component is mounted

  // Set the state to true once the component has mounted on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle logout logic
  const handleLogout = async () => {
    try {
      const response = await axios.post('/api/logout');

      localStorage.removeItem('token');

      if (response.status === 200) {
        // Redirect to login page after successful logout
        window.location.href = '/';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Ensure that the component renders only on the client side
  if (!isMounted) {
    return null; // Don't render anything during server-side rendering
  }

  return (
    <button onClick={handleLogout} className="logout-button">
      Logout
    </button>
  );
};

export default LogoutButton;
