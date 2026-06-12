import {
  useEffect,
  useState,
  useRef,
} from "react";

import api from "../services/api";
import { fixVietnameseFileName } from "../utils/fileName";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

export default function CreateTask() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(
    location.search
  );

  const documentId =
    params.get("document_id");

  const [linkedDocument, setLinkedDocument] =
    useState(null);

  const [theme, setTheme] = useState(
  localStorage.getItem("theme") || "light"
);

const isDark = theme === "dark";

useEffect(() => {
  const syncTheme = () => {
    setTheme(localStorage.getItem("theme") || "light");
  };

  window.addEventListener("theme-updated", syncTheme);
  window.addEventListener("storage", syncTheme);

  return () => {
    window.removeEventListener("theme-updated", syncTheme);
    window.removeEventListener("storage", syncTheme);
  };
}, []);
  
    const [chatCollapsed, setChatCollapsed] =
  useState(true);

  const [chatSidebarOpen, setChatSidebarOpen] =
  useState(false);

const isDesktopScreen = () =>
  window.matchMedia("(min-width: 1280px)").matches;

  const [robotPos, setRobotPos] = useState({
  x: 320,
  y: 190,
});

const [draggingRobot, setDraggingRobot] =
  useState(false);

const [robotMoved, setRobotMoved] =
  useState(false);

const handleRobotMouseDown = (e) => {
  e.preventDefault();

  setDraggingRobot(true);
  setRobotMoved(false);

  const startX = e.clientX;
  const startY = e.clientY;
  const startPos = { ...robotPos };

  const handleMouseMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setRobotMoved(true);
    }

    setRobotPos({
      x: Math.max(
        16,
        Math.min(
          window.innerWidth - 90,
          startPos.x + dx
        )
      ),
      y: Math.max(
        80,
        Math.min(
          window.innerHeight - 90,
          startPos.y + dy
        )
      ),
    });
  };

  const handleMouseUp = () => {
    setDraggingRobot(false);

    window.removeEventListener(
      "mousemove",
      handleMouseMove
    );
    window.removeEventListener(
      "mouseup",
      handleMouseUp
    );
  };

  window.addEventListener(
    "mousemove",
    handleMouseMove
  );
  window.addEventListener(
    "mouseup",
    handleMouseUp
  );
};

  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [messages, setMessages] = useState([]);
  const [inputAI, setInputAI] = useState("");
  const [isTyping, setIsTyping] = useState(false); 
  const [conversations, setConversations] = useState([]);
  
  const [file, setFile] = useState(null);
  const chatRef = useRef();
  const fileInputRef = useRef();
 const [activeConversation, setActiveConversation] = useState(

  sessionStorage.getItem(
    "activeConversation"
  ) || null

);
const user = JSON.parse(
  localStorage.getItem("user")
);

const role =
  user?.role;

  const [form, setForm] = useState({
  tieu_de: "",
  mo_ta: "",
  han_chot: "",
  unit_id: "",
  assignee_user_id: null,
  chu_ky_bao_cao: "hang_thang",
});

const [bulkTasks, setBulkTasks] = useState([
  {
    tieu_de: "",
    mo_ta: "",
    han_chot: "",
    unit_id: "",
    assignee_user_id: null,
    chu_ky_bao_cao: "hang_thang",
  },
]);

  const typeText = async (text, onUpdate) => {
  let current = "";

  for (let i = 0; i < text.length; i++) {
    current += text[i];
    onUpdate(current);
    await new Promise((r) => setTimeout(r, 10));
  }

  setIsTyping(false);
};

useEffect(() => {

  const init = async () => {

    // LOAD SIDEBAR
    await loadConversations();

    // LOAD ACTIVE CHAT
    const savedConversation =
  sessionStorage.getItem(
    "activeConversation"
  );

    if (savedConversation) {

      loadMessages(savedConversation);

    }

  };

  init();

}, []);

  // ====================
  // LOAD DATA
  // =========================
  useEffect(() => {
    api.get("/units").then(res => setUnits(res.data));
  }, []);

useEffect(() => {
  if (documentId) {
    fetchLinkedDocument();
  }
}, [documentId]);

const fetchLinkedDocument = async () => {
  try {
    const res = await api.get(
      `/documents/${documentId}`
    );

    setLinkedDocument(res.data);

    setForm((prev) => ({
      ...prev,
      tieu_de:
        prev.tieu_de ||
        `Xử lý văn bản: ${res.data.tieu_de}`,
      mo_ta:
        prev.mo_ta ||
        res.data.trich_yeu ||
        "",
    }));
    setBulkTasks([
  {
    tieu_de: `Xử lý văn bản: ${res.data.tieu_de}`,
    mo_ta: res.data.trich_yeu || "",
    han_chot: "",
    unit_id: "",
    assignee_user_id: null,
    chu_ky_bao_cao: "hang_thang",
  },
]);
  } catch (err) {
    console.log(
      "FETCH LINKED DOCUMENT ERROR:",
      err
    );
  }
};

  useEffect(() => {

  // LEADER
  if (
    role === "lanh_dao" &&
    form.unit_id
  ) {

    api
      .get(
        `/users?unit_id=${form.unit_id}`
      )
      .then((res) =>
        setUsers(res.data)
      );

  }

  // MANAGER
  if (
    role === "truong_phong"
  ) {

    api
      .get(
        `/users?unit_id=${user.unit_id}`
      )
      .then((res) =>
        setUsers(res.data)
      );

  }

}, [
  form.unit_id,
  role
]);
  useEffect(() => {
  chatRef.current?.scrollTo({
    top: chatRef.current.scrollHeight,
    behavior: "smooth",
  });
}, [messages]);

const [filePreviewUrl, setFilePreviewUrl] =
  useState("");
const [creating, setCreating] = useState(false);

const loadConversations = async () => {

  try {

    const res = await api.get(
      "/ai/conversations"
    );

    setConversations(res.data);

  } catch (err) {

    console.error(err);

  }

};
const createConversation = async () => {

  try {

    const res =
      await api.post("/ai/conversation");

    const newConversation = res.data;

    setConversations((prev) => [
      newConversation,
      ...prev,
    ]);

    setActiveConversation(newConversation.id);

sessionStorage.setItem(
  "activeConversation",
  newConversation.id
);

    setMessages([]);

  } catch (err) {

    console.error(err);

  }
};
const loadMessages = async (conversationId) => {

  try {

    const res =
      await api.get(
        `/ai/messages/${conversationId}`
      );

    const formattedMessages =
  res.data.map((msg) => ({

    role: msg.role,

    content: msg.content,

    file:
      msg.file_url
        ? {

            name: msg.file_name,

            url: msg.file_url,

            type: msg.file_type,

          }
        : null,

  }));

    setMessages(formattedMessages);

    setActiveConversation(conversationId);

sessionStorage.setItem(
  "activeConversation",
  conversationId
);

  } catch (err) {

    console.error(err);

  }
};
  // =========================
  // HANDLE CHANGE
  // =========================
  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

const handleBulkTaskChange = (index, key, value) => {
  setBulkTasks((prev) =>
    prev.map((task, i) =>
      i === index
        ? {
            ...task,
            [key]: value,
          }
        : task
    )
  );
};

const addBulkTask = () => {
  setBulkTasks((prev) => [
    ...prev,
    {
      tieu_de: linkedDocument
        ? `Xử lý văn bản: ${linkedDocument.tieu_de}`
        : "",
      mo_ta: linkedDocument?.trich_yeu || "",
      han_chot: "",
      unit_id: "",
      assignee_user_id: null,
      chu_ky_bao_cao: "hang_thang",
    },
  ]);
};

const removeBulkTask = (index) => {
  if (bulkTasks.length === 1) {
    alert("Cần ít nhất 1 nhiệm vụ");
    return;
  }

  setBulkTasks((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

const deleteConversation = async (
  conversationId
) => {

  try {

    await api.delete(
      `/ai/conversation/${conversationId}`
    );

    // REMOVE UI
    setConversations((prev) =>
      prev.filter(
        (c) => c.id !== conversationId
      )
    );

    // RESET ACTIVE
    if (
      activeConversation ===
      conversationId
    ) {

      setActiveConversation(null);

      setMessages([]);

    }
    sessionStorage.removeItem(
  "activeConversation"
);

  } catch (err) {

    console.error(err);

  }

};
  // =========================
  // SUBMIT
  // =========================
const handleSubmit = async () => {
  if (creating) return;

  try {
    setCreating(true);

    // =========================
    // TẠO NHIỀU NHIỆM VỤ TỪ VĂN BẢN
    // =========================
    if (documentId) {
      const invalidTask = bulkTasks.find((task) => {
        if (!task.tieu_de || !task.han_chot) {
          return true;
        }

        if (
          role === "lanh_dao" &&
          !task.unit_id
        ) {
          return true;
        }

        return false;
      });

      if (invalidTask) {
        alert(
          "Vui lòng nhập đầy đủ tiêu đề, hạn chót và phòng ban cho từng nhiệm vụ"
        );
        return;
      }

      await api.post(
        "/tasks/bulk-from-document",
        {
          document_id: Number(documentId),
          tasks: bulkTasks.map((task) => ({
            ...task,
            unit_id: task.unit_id ? Number(task.unit_id) : null,
            assignee_user_id: task.assignee_user_id
              ? Number(task.assignee_user_id)
              : null,
          })),
        }
      );

      alert("Tạo nhiệm vụ từ văn bản thành công");

      navigate("/app/documents", {
        replace: true,
      });

      return;
    }

    // =========================
    // TẠO 1 NHIỆM VỤ BÌNH THƯỜNG
    // =========================
    if (!form.tieu_de || !form.han_chot) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (role === "lanh_dao" && !form.unit_id) {
      alert("Chọn phòng ban");
      return;
    }

    if (role === "truong_phong" && !form.assignee_user_id) {
      alert("Chọn người thực hiện");
      return;
    }

    await api.post(
      "/tasks",
      {
        ...form,
        document_id: null,
      }
    );

    alert("Tạo nhiệm vụ thành công");

    navigate("/app/tasks", {
      replace: true,
    });
  } catch (err) {
    console.error("CREATE TASK ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Tạo nhiệm vụ thất bại"
    );
  } finally {
    setCreating(false);
  }
};
const handleAskAI = async () => {

  try {

    if (!inputAI.trim() && !file) return;

    // AUTO CREATE CHAT
let conversationId = activeConversation;

if (!conversationId) {
  const res = await api.post("/ai/conversation");

  conversationId = res.data.id;

  setActiveConversation(conversationId);

  sessionStorage.setItem(
    "activeConversation",
    conversationId
  );

  await loadConversations();
}

    setIsTyping(true);

    // =========================
    // FILE + PROMPT
    // =========================
if (file) {
  const userMessage = inputAI.trim() || "Tóm tắt tài liệu này";

  const formData = new FormData();

  formData.append("file", file);
  formData.append("message", userMessage);
  formData.append("conversationId", conversationId);

  // SHOW USER MESSAGE
  setMessages((prev) => [
    ...prev,
    {
      role: "user",
      content: userMessage,
      file: {
        name: file.name,
        url: filePreviewUrl,
        type: file.type,
      },
    },
  ]);

  setInputAI("");

  // SHOW THINKING
  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: "🤖 AI đang suy nghĩ...",
    },
  ]);

  const res = await api.post(
    "/ai/from-file",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // REPLACE THINKING
  setMessages((prev) => {
    const updated = [...prev];

    // Cập nhật file user từ blob URL sang URL thật của backend
    for (let i = updated.length - 1; i >= 0; i--) {
      if (updated[i].role === "user" && updated[i].file) {
        updated[i] = {
          ...updated[i],
          file: res.data.file,
        };
        break;
      }
    }

    updated[updated.length - 1] = {
  role: "assistant",
  content: res.data.result,
};

    return updated;
  });

  await loadConversations();

  // RESET FILE
  setFile(null);
  setFilePreviewUrl("");

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}

    // =========================
    // CHAT THƯỜNG
    // =========================
    else {

      // SHOW USER MESSAGE
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: inputAI,
        },
      ]);

      const userMessage = inputAI;

      setInputAI("");

      // SHOW THINKING
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "🤖 AI đang suy nghĩ...",
        },
      ]);

      const res = await api.post(
        "/ai/chat",
        {
          message: userMessage,
          conversationId:
            conversationId,
        }
      );

      // REPLACE THINKING
      setMessages((prev) => {

        const updated = [...prev];

        updated[updated.length - 1] = {
  role: "assistant",
  content: res.data.reply,
  sources: res.data.sources,
  isAnswered: res.data.isAnswered,
};

        return updated;

      });
      await loadConversations();
    }

    setInputAI("");

    setIsTyping(false);

  } catch (err) {
  console.error(err);

  setIsTyping(false);

  if (err.response?.status === 403) {
    sessionStorage.removeItem("activeConversation");
    setActiveConversation(null);

    alert(
      "Cuộc trò chuyện AI cũ không hợp lệ. Bạn hãy bấm gửi lại để tạo cuộc trò chuyện mới."
    );

    return;
  }

  alert("AI lỗi");
}

};

const handleFileChange = (e) => {

  const selectedFile = e.target.files[0];

  if (!selectedFile) return;

  setFile(selectedFile);

const url =
  URL.createObjectURL(selectedFile);

setFilePreviewUrl(url);

};
  // =========================
  // AI GỢI Ý (mock)
  // =========================
  const handleAISuggest = () => {
    const suggestions = [
      "Chuẩn bị tài liệu",
      "Phân công nhân sự",
      "Theo dõi tiến độ",
      "Báo cáo kết quả"
    ];

    setForm({
      ...form,
      mo_ta: suggestions.join("\n")
    });
  };

const getFileOpenUrl = (url) => {
  if (!url) return "";

  if (url.startsWith("blob:")) {
    return url;
  }

  if (url.startsWith("http")) {
    return url;
  }

  return `http://localhost:3000${url}`;
};

const getFileDownloadUrl = (file) => {
  if (!file?.url) return "#";

  if (file.url.startsWith("blob:")) {
    return file.url;
  }

  const fileName = file.url.split("/").pop();

  return `http://localhost:3000/api/ai/download/${encodeURIComponent(
    fileName
  )}`;
};
const getDocumentViewUrl = (filePath, fileName) => {
  if (!filePath) return "#";

  return `http://localhost:3000/api/files/view?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "van-ban")
  )}`;
};
const getDocumentDownloadUrl = (filePath, fileName) => {
  if (!filePath) return "#";

  return `http://localhost:3000/api/files/download?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "van-ban")
  )}`;
};

const inputClass = `
  w-full
  px-4 py-3
  border
  rounded-2xl
  focus:outline-none
  focus:ring-2
  focus:ring-blue-400
  focus:border-blue-300
  transition
  text-sm
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`;

const smallInputClass = `
  w-full
  p-3
  border
  rounded-2xl
  focus:outline-none
  focus:ring-2
  focus:ring-blue-400
  focus:border-blue-300
  transition
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`;

return (
  <div
      className={`
        p-6
        min-h-screen
        transition-colors
        ${
          isDark ? "bg-slate-950 text-gray-100" : "bg-gray-100 text-gray-900"
        }
      `}
    >

    {/* HEADER */}
    <div className="mb-6">
      <h1
        className={`text-3xl font-bold ${
          isDark ? "text-gray-100" : "text-gray-900"
        }`}
      >
        Tạo nhiệm vụ
      </h1>

      <p className={isDark ? "text-gray-400" : "text-gray-500"}>
        AI hỗ trợ tạo task thông minh
      </p>
    </div>

    <div
  className={`
    relative
    grid
    min-h-[75vh]
    transition-all
    duration-700
    ease-in-out
    items-stretch

    ${
      chatCollapsed
        ? "grid-cols-1 justify-items-center"
        : "grid-cols-1 xl:grid-cols-[minmax(620px,1.1fr)_minmax(380px,0.9fr)] gap-5"
    }
  `}
>

      {/* ================= COLLAPSED AI BUTTON ================= */}
{chatCollapsed && (
  <button
  onMouseDown={handleRobotMouseDown}
  onClick={() => {
  if (!robotMoved) {
    setChatCollapsed(false);

    // Desktop: mở chat kèm sidebar
    // Mobile: chỉ mở chat, chưa mở sidebar
    setChatSidebarOpen(isDesktopScreen());
  }
}}
  style={{
    left: robotPos.x,
    top: robotPos.y,
  }}
  className={`
  fixed
  w-16
  h-16
  rounded-full
  border
  shadow-lg
  flex
  items-center
  justify-center
  hover:shadow-2xl
  active:scale-95
  transition-shadow
  duration-300
  z-50
  overflow-hidden
  ${
    isDark
      ? "bg-slate-900 border-slate-700 shadow-slate-950/60"
      : "bg-white border-gray-200"
  }
  ${
    draggingRobot
      ? "cursor-grabbing scale-105"
      : "cursor-grab hover:scale-110"
  }
`}
  title="Kéo để di chuyển, bấm để mở AI Chat"
>
  <video
    src="/chatbot.mp4"
    autoPlay
    loop
    muted
    playsInline
    className="
      w-12
      h-12
      object-contain
      pointer-events-none
    "
  />
</button>
)}

{/* ================= LEFT AI WORKSPACE ================= */}
{!chatCollapsed && (
  <div
  className={`
    relative
    w-full
    min-w-0
    rounded-[28px]
    shadow-sm
    border
    overflow-hidden
    animate-[slideInLeft_0.45s_ease-out]
    h-[calc(100vh-150px)]
    xl:h-[80vh]
    min-h-[560px]
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-200"
    }
  `}
>

        <div className="flex h-full">

         {/* ================= SIDEBAR ================= */}
{chatSidebarOpen && (
  <div
  className={`
    hidden
    xl:flex
    w-[230px]
    shrink-0
    border-r
    p-4
    flex-col
    ${
      isDark
        ? "bg-slate-950 border-slate-800"
        : "bg-gray-50 border-gray-100"
    }
  `}
>
    <div className="flex items-center justify-between mb-5">
      <h2
  className={`font-bold text-lg ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
        🤖 AI Chat
      </h2>

      <div className="flex items-center gap-2">
        <button
          onClick={createConversation}
          className={`
  w-10 h-10
  rounded-full
  text-white
  transition
  ${
    isDark
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-black hover:bg-gray-800"
  }
`}
          title="Tạo đoạn chat mới"
        >
          +
        </button>

        <button
          onClick={() => setChatSidebarOpen(false)}
          className={`
  w-10 h-10
  rounded-full
  border
  transition
  ${
    isDark
      ? "bg-slate-900 border-slate-700 text-gray-400 hover:bg-slate-800 hover:text-gray-100"
      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
  }
`}
          title="Ẩn sidebar"
        >
          ‹
        </button>
      </div>
    </div>

    <div className="space-y-2 overflow-y-auto">
      {conversations.map((c) => (
        <div
          key={c.id}
          onClick={() => loadMessages(c.id)}
          className={`
  group
  flex
  items-center
  justify-between
  p-3
  rounded-2xl
  transition
  cursor-pointer
  ${
    activeConversation === c.id
      ? "bg-blue-500 text-white"
      : isDark
      ? "text-gray-300 hover:bg-slate-900"
      : "text-gray-700 hover:bg-white"
  }
`}
        >
          <span className="truncate">
            {c.title || `Chat #${c.id}`}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteConversation(c.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition text-sm"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>
)}

{/* ================= MOBILE SIDEBAR DRAWER ================= */}
{chatSidebarOpen && (
  <div className="xl:hidden absolute inset-0 z-30">
    <div
      onClick={() => setChatSidebarOpen(false)}
      className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
    />

    <div
  className={`
    absolute
    left-0
    top-0
    bottom-0
    w-[280px]
    max-w-[85%]
    border-r
    p-4
    flex
    flex-col
    shadow-2xl
    z-40
    ${
      isDark
        ? "bg-slate-950 border-slate-800"
        : "bg-gray-50 border-gray-100"
    }
  `}
>
      <div className="flex items-center justify-between mb-5">
        <h2
  className={`font-bold text-lg ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
          🤖 AI Chat
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={createConversation}
            className="w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 transition"
          >
            +
          </button>

          <button
            onClick={() => setChatSidebarOpen(false)}
            className={`
  w-10 h-10
  rounded-full
  border
  transition
  ${
    isDark
      ? "bg-slate-900 border-slate-700 text-gray-400 hover:text-red-400 hover:bg-red-950/30"
      : "bg-white border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50"
  }
`}
          >
            ×
          </button>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto">
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => {
              loadMessages(c.id);
              setChatSidebarOpen(false);
            }}
            className={`
  group
  flex
  items-center
  justify-between
  p-3
  rounded-2xl
  transition
  cursor-pointer
  ${
    activeConversation === c.id
      ? "bg-blue-500 text-white"
      : isDark
      ? "text-gray-300 hover:bg-slate-900"
      : "text-gray-700 hover:bg-white"
  }
`}
          >
            <span className="truncate">
              {c.title || `Chat #${c.id}`}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(c.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

          {/* ================= CHAT AREA ================= */}
          <div className="flex-1 min-w-0 flex flex-col">

            {/* TOP */}
<div
  className={`
    p-5
    border-b
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3 min-w-0">
      <button
        onClick={() =>
          setChatSidebarOpen((prev) => !prev)
        }
        className={`
  w-10 h-10
  rounded-full
  border
  transition
  flex
  items-center
  justify-center
  shrink-0
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-400 hover:bg-blue-950/40 hover:text-blue-400"
      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
  }
`}
        title="Mở / đóng danh sách chat"
      >
        ☰
      </button>

      <div className="min-w-0">
        <h2
  className={`font-semibold text-lg ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
          💬 Trò chuyện với AI
        </h2>

       <p
  className={`text-sm ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
          Upload tài liệu hoặc chat để AI hỗ trợ tạo nhiệm vụ
        </p>
      </div>
    </div>

    <button
      onClick={() => {
        setChatCollapsed(true);
        setChatSidebarOpen(false);
      }}
      className={`
        w-9 h-9
        rounded-full
        border
        transition
        flex
        items-center
        justify-center
        shrink-0
        ${
          isDark
            ? "bg-slate-950 border-slate-700 text-gray-400 hover:text-red-400 hover:bg-red-950/30"
            : "bg-gray-50 border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50"
        }
      `}
      title="Thu nhỏ AI Chat"
    >
      ✕
    </button>
  </div>
</div>
            {/* ================= CHAT ================= */}
            <div
  ref={chatRef}
  className={`
    flex-1
    overflow-y-auto
    p-6
    space-y-4
    ${
      isDark ? "bg-slate-950" : "bg-gray-50"
    }
  `}
>
              {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 ${
                  m.role === "user"
                    ? "items-end"
                    : "items-start"
                }`}
              >

                {/* FILE CARD */}
{m.file && (

  <div
    onClick={() =>
      window.open(getFileOpenUrl(m.file.url))
    }
    className="bg-[#2a2a2a] border border-gray-700 rounded-2xl p-3 w-[320px] cursor-pointer hover:bg-[#323232] transition"
  >

    <div className="flex items-center gap-3">

      {/* ICON */}
      <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl">
        📄
      </div>

      {/* INFO */}
      <div className="overflow-hidden">

        <p className="font-semibold text-sm text-white truncate">
          {m.file.name}
        </p>

        <p className="text-xs text-gray-400">
          Tài liệu
        </p>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 mt-3">

          {/* OPEN */}
          <button
            onClick={(e) => {

              e.stopPropagation();

              const openUrl = getFileOpenUrl(m.file.url);

if (m.file.url.startsWith("blob:")) {
  window.open(openUrl);
} else {
  window.open(
    `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(
      openUrl
    )}`
  );
}

            }}
            className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
          >
            👁 Mở
          </button>

          {/* DOWNLOAD */}
          <a
  href={getFileDownloadUrl(m.file)}
  download={m.file.name}
  onClick={(e) => e.stopPropagation()}
  className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
>
  ⬇ Tải
</a>

        </div>

      </div>

    </div>

  </div>

)}
                {/* TEXT MESSAGE */}
                {m.content && (

                  <div
                    className={`
  px-4 py-3
  rounded-2xl
  text-sm
  shadow-sm
  whitespace-pre-wrap
  leading-relaxed
  break-words
  ${
    m.role === "user"
      ? isDark
        ? "bg-blue-600 text-white"
        : "bg-[#2a2a2a] text-white"
      : isDark
      ? "bg-slate-900 border border-slate-700 text-gray-200"
      : "bg-white border border-gray-200 text-gray-800"
  }
`}
                    style={{
                      maxWidth: "75%",
                      width: "fit-content",
                    }}
                  >
                    {m.content}
                  </div>

                )}

              </div>

            ))}
              {/* LOADING */}
              {isTyping && (
                <div className="text-gray-400 italic text-sm">
                  🤖 AI đang suy nghĩ...
                </div>
              )}

            </div>

            {/* ================= INPUT ================= */}
            <div
  className={`
    border-t
    p-4
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
              {file && (
                  <div className="mb-3">
                <div
                  onClick={() =>
                    window.open(filePreviewUrl)
                  }
                  className="bg-[#2a2a2a] border border-gray-700 rounded-2xl p-3 max-w-sm relative cursor-pointer hover:bg-[#323232] transition"
                >

                  {/* REMOVE */}
                  <button
                    onClick={(e) => {

                      e.stopPropagation();

                      setFile(null);

                      setFilePreviewUrl("");

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }

                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-400"
                  >
                    ✕
                  </button>

                  <div className="flex items-center gap-3 min-w-0">

                    {/* ICON */}
                    <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl">
                      📄
                    </div>

                    {/* INFO */}
                    <div className="overflow-hidden">

                      <p className="font-semibold text-sm text-white truncate">
                        {file.name}
                      </p>

                      <p className="text-xs text-gray-400">
                        Tài liệu
                      </p>

                    </div>

                  </div>

                </div>

              </div>

                )}
              <div className="flex items-center gap-3">

                {/* UPLOAD */}
                <label
  className={`
    w-12 h-12
    rounded-2xl
    flex
    items-center
    justify-center
    cursor-pointer
    transition
    ${
      isDark
        ? "bg-slate-950 border border-slate-700 hover:bg-slate-800"
        : "bg-gray-100 hover:bg-gray-200"
    }
  `}
>

                  📎

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={handleFileChange}
                  />

                </label>
                
                {/* INPUT */}
                <div className="flex-1 min-w-0">

  <textarea
    rows={1}
    placeholder="Nhắn AI..."
    value={inputAI}
    onChange={(e) =>
      setInputAI(e.target.value)
    }

    onKeyDown={(e) => {

      // ENTER = SEND
      if (
        e.key === "Enter" &&
        !e.shiftKey
      ) {

        e.preventDefault();

        handleAskAI();

      }

    }}

    className={`
  w-full
  border
  rounded-2xl
  px-4 py-3
  focus:outline-none
  focus:ring-2
  focus:ring-blue-400
  resize-none
  overflow-y-auto
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`}

    style={{
      minHeight: "52px",
      maxHeight: "140px",
    }}
  />

  {/* HINT */}
  <p className="text-[11px] text-gray-400 mt-1 px-1">

    Enter để gửi • Shift + Enter để xuống dòng

  </p>

</div>

{/* SEND */}
<button
  onClick={handleAskAI}
  className={`
  px-5 py-3
  rounded-2xl
  text-white
  transition
  shrink-0
  ${
    isDark
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-black hover:bg-gray-800"
  }
`}
>
  ➤
</button>

              </div>
            </div>

          </div>

        </div>

      </div>
)}
      {/* ================= RIGHT TASK PANEL ================= */}
<div
  className={`
    rounded-[28px]
    border
    p-5
    overflow-visible
    xl:overflow-y-auto
    transition-all
    duration-700
    ease-in-out
    h-fit
    xl:h-[80vh]
    min-w-0
    ${
      isDark
        ? "bg-slate-900 border-slate-800 shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
        : "bg-white border-gray-100 shadow-[0_16px_50px_rgba(15,23,42,0.08)]"
    }
    ${
      chatCollapsed
        ? "w-[560px] max-w-[95vw]"
        : "w-full max-w-full"
    }
  `}
>

  <div className="mb-5">
  <h2
  className={`font-bold text-xl flex items-center gap-2 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  🧾 Preview nhiệm vụ
</h2>

<p
  className={`text-sm mt-1 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
  Kiểm tra thông tin trước khi tạo nhiệm vụ
</p>
</div>

  {/* LINKED DOCUMENT */}
  {linkedDocument && (
    <div
        className={`
          mb-5
          rounded-2xl
          border
          p-4
          ${
            isDark
              ? "bg-blue-950/30 border-blue-900/50"
              : "bg-blue-50 border-blue-100"
          }
        `}
      >
      <h3 className="font-semibold text-blue-700 mb-2">
        📄 Văn bản liên quan
      </h3>

      <p
  className={`font-medium ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
        {linkedDocument.tieu_de}
      </p>

      <p
  className={`text-sm mt-1 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
        Số ký hiệu:{" "}
        {linkedDocument.so_ky_hieu || "-"}
      </p>

      <p
  className={`text-sm mt-1 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
        Loại văn bản:{" "}
        {linkedDocument.loai_van_ban_name || "-"}
      </p>

      <p
  className={`text-sm mt-1 line-clamp-3 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
        Trích yếu:{" "}
        {linkedDocument.trich_yeu || "-"}
      </p>

      {linkedDocument.file_path && (
  <div className="flex items-center gap-3 mt-3">
    <a
      href={getDocumentViewUrl(
        linkedDocument.file_path,
        linkedDocument.file_name
      )}
      target="_blank"
      rel="noreferrer"
      className="inline-block text-sm text-blue-600 hover:underline font-medium"
    >
      Xem file văn bản
    </a>

    <a
      href={getDocumentDownloadUrl(
        linkedDocument.file_path,
        linkedDocument.file_name
      )}
      className={`
  inline-block
  text-sm
  hover:text-blue-600
  hover:underline
  font-medium
  ${
    isDark ? "text-gray-400" : "text-gray-600"
  }
`}
    >
      Tải xuống
    </a>
  </div>
)}
    </div>
  )}
  {documentId ? (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
  Danh sách nhiệm vụ
</h3>

      <button
        type="button"
        onClick={addBulkTask}
        className="
          px-3 py-2
          rounded-xl
          bg-blue-500
          text-white
          text-sm
          hover:bg-blue-600
          transition
        "
      >
        + Thêm nhiệm vụ
      </button>
    </div>

    {bulkTasks.map((task, index) => (
      <div
  key={index}
  className={`
    rounded-3xl
    border
    p-4
    space-y-3
    ${
      isDark
        ? "bg-slate-950/70 border-slate-700"
        : "bg-gray-50/70 border-gray-100"
    }
  `}
>
        <div className="flex items-center justify-between">
          <h4
  className={`font-semibold ${
    isDark ? "text-gray-200" : "text-gray-700"
  }`}
>
            Nhiệm vụ {index + 1}
          </h4>

          <button
            type="button"
            onClick={() => removeBulkTask(index)}
            className="text-sm text-red-500 hover:underline"
          >
            Xóa
          </button>
        </div>

        <input
          placeholder="Tiêu đề nhiệm vụ"
          className={smallInputClass}
          value={task.tieu_de}
          onChange={(e) =>
            handleBulkTaskChange(
              index,
              "tieu_de",
              e.target.value
            )
          }
        />

        <textarea
          placeholder="Mô tả nhiệm vụ"
          className={`${smallInputClass} h-28 resize-none`}
          value={task.mo_ta}
          onChange={(e) =>
            handleBulkTaskChange(
              index,
              "mo_ta",
              e.target.value
            )
          }
        />

        <input
          type="date"
          className={smallInputClass}
          value={task.han_chot}
          onChange={(e) =>
            handleBulkTaskChange(
              index,
              "han_chot",
              e.target.value
            )
          }
        />

        <div
  className={`
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-blue-950/30 border-blue-900/50"
        : "bg-blue-50/70 border-blue-100"
    }
  `}
>
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
      📅
    </div>

    <div>
      <p
  className={`text-sm font-semibold ${
    isDark ? "text-blue-300" : "text-blue-800"
  }`}
>
        Báo cáo định kỳ hằng tháng
      </p>

      <p
  className={`text-xs mt-1 leading-relaxed ${
    isDark ? "text-blue-400" : "text-blue-600"
  }`}
>
        Hệ thống tổng hợp tiến độ mỗi tháng và ưu tiên chốt báo cáo
        trước hạn nhiệm vụ 7 ngày để phục vụ họp, rà soát và chỉ đạo.
      </p>
    </div>
  </div>
</div>

        {role === "lanh_dao" && (
          <select
            className={smallInputClass}
            value={task.unit_id}
            onChange={(e) =>
              handleBulkTaskChange(
                index,
                "unit_id",
                e.target.value
              )
            }
          >
            <option value="">Phòng ban</option>

            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>
    ))}
  </div>
) : (
  <>

  {/* TITLE */}
  <input
    placeholder="Tiêu đề"
    className={`${inputClass} mb-4`}
    value={form.tieu_de}
    onChange={(e) =>
      handleChange("tieu_de", e.target.value)
    }
  />

        {/* DESC */}
        <textarea
  placeholder="Mô tả"
  className={`${inputClass} mb-4 h-32 resize-none`}
  value={form.mo_ta}
  onChange={(e) =>
    handleChange("mo_ta", e.target.value)
  }
/>

        {/* DATE + UNIT */}
        {/* DATE */}
<div className="mb-4">

  <input
  type="date"
  className={inputClass}
  value={form.han_chot}
  onChange={(e) =>
    handleChange(
      "han_chot",
      e.target.value
    )
  }
/>

</div>
{/* REPORT RULE */}
<div
  className={`
    mb-4
    rounded-2xl
    border
    px-3 py-2.5
    ${
      isDark
        ? "bg-blue-950/30 border-blue-900/50"
        : "bg-blue-50/70 border-blue-100"
    }
  `}
>
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-sm">
      📅
    </div>

    <div>
      <p
  className={`text-sm font-semibold ${
    isDark ? "text-blue-300" : "text-blue-800"
  }`}
>
        Báo cáo định kỳ hằng tháng
      </p>

     <p
  className={`text-xs mt-1 leading-relaxed ${
    isDark ? "text-blue-400" : "text-blue-600"
  }`}
>
        Hệ thống tổng hợp tiến độ mỗi tháng và ưu tiên chốt báo cáo
        trước hạn nhiệm vụ 7 ngày để phục vụ họp, rà soát và chỉ đạo.
      </p>
    </div>
  </div>
</div>

{/* UNIT - ONLY LEADER */}
{role === "lanh_dao" && (

  <select
  className={`${inputClass} mb-4`}
  value={form.unit_id}
    onChange={(e) =>
      handleChange(
        "unit_id",
        e.target.value
      )
    }
  >

    <option value="">
      Phòng ban
    </option>

    {units.map((u) => (
      <option
        key={u.id}
        value={u.id}
      >
        {u.name}
      </option>
    ))}

  </select>

)}

{/* USER - ONLY MANAGER */}
{role ===
  "truong_phong" && (

  <select
  className={`${inputClass} mb-5`}
  value={form.assignee_user_id}
    onChange={(e) =>
      handleChange(
        "assignee_user_id",
        e.target.value
      )
    }
  >

    <option value="">
      Người thực hiện
    </option>

    {users.map((u) => (
      <option
        key={u.id}
        value={u.id}
      >
        {u.full_name}
      </option>
    ))}

  </select>

)}
  </>
)}
{/* BUTTON */}
<button
  onClick={handleSubmit}
  disabled={
  creating ||
  (documentId
    ? bulkTasks.some(
        (task) =>
          !task.tieu_de ||
          !task.han_chot ||
          (role === "lanh_dao" &&
            !task.unit_id)
      )
    : !form.tieu_de || !form.han_chot)
}
  className={`
  w-full
  py-4
  rounded-2xl
  font-semibold
  transition
  disabled:cursor-not-allowed
  ${
    isDark
      ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-700 disabled:text-gray-400"
      : "bg-gray-900 text-white hover:bg-black disabled:bg-gray-300 disabled:text-gray-500"
  }
`}
>
  {creating
    ? "Đang tạo nhiệm vụ..."
    : documentId
    ? "Tạo tất cả nhiệm vụ"
    : "Tạo nhiệm vụ"}
</button>

      </div>

    </div>

  </div>
);
}
