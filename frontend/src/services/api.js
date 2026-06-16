import axios from "axios";

const api = axios.create({
  baseURL: "https://task-management-backend-0624.onrender.com/api",
});

export default api;