import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL, // Base URL for your API
  timeout: 5000, // Timeout for requests
});

export default axiosInstance;
