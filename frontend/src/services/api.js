import axios from "axios";

const api = axios.create({
  baseURL: "https://dt-us.onrender.com/api",
});

export default api;