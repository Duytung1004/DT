import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../socket/socket";
import CreateDocumentModal from "../components/documents/CreateDocumentModal";
import EditDocumentModal from "../components/documents/EditDocumentModal";
import { useNavigate } from "react-router-dom";
import { fixVietnameseFileName } from "../utils/fileName";

import {
  getPriorityLabel,
  getPriorityColor,
  getPriorityDotColor,
} from "../utils/priorityColor";

const priorityColor = {
  binh_thuong: "bg-gray-100 text-gray-700",
  khan: "bg-yellow-100 text-yellow-700",
  thuong_khan: "bg-orange-100 text-orange-700",
  hoa_toc: "bg-red-100 text-red-700",
};

const securityColor = {
  cong_khai: "bg-gray-100 text-gray-700",
  noi_bo: "bg-blue-100 text-blue-700",
  mat: "bg-red-100 text-red-700",
  toi_mat: "bg-purple-100 text-purple-700",
};

const getWorkflowStatusLabel = (status) => {
  switch (status) {
    case "draft":
      return "Bản nháp";
    case "waiting_office_review":
      return "Chờ Chánh văn phòng duyệt";
    case "office_rejected":
      return "Chánh văn phòng trả lại";
    case "office_approved":
      return "Đã duyệt văn phòng";
    case "sent_to_leader":
      return "Đã trình lãnh đạo";
    case "task_created":
      return "Đã tạo nhiệm vụ";
    default:
      return status || "Bản nháp";
  }
};

const getWorkflowStatusColor = (status) => {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700";
    case "waiting_office_review":
      return "bg-yellow-100 text-yellow-700";
    case "office_rejected":
      return "bg-red-100 text-red-700";
    case "office_approved":
      return "bg-blue-100 text-blue-700";
    case "sent_to_leader":
      return "bg-purple-100 text-purple-700";
    case "task_created":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};

const formatMonthLabel = (monthValue) => {
  const [year, month] = monthValue.split("-");

  return `Tháng ${Number(month)}/${year}`;
};

const addMonth = (monthValue, amount) => {
  const [year, month] = monthValue
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

export default function Documents() {
  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);

const [documentPage, setDocumentPage] = useState(1);
const [documentPagination, setDocumentPagination] = useState({
  page: 1,
  limit: 3,
  total: 0,
  totalPages: 1,
});

const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [dateMode, setDateMode] = useState("all");

  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );
  const [selectedDocument, setSelectedDocument] =
  useState(null);
  const [documentTasks, setDocumentTasks] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] =
    useState(false);
  const [showEditModal, setShowEditModal] =
    useState(false);
  const [showRelatedTasks, setShowRelatedTasks] =
    useState(false);

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

  const fetchDocuments = async () => {
  try {
    setLoading(true);

    const res = await api.get("/documents", {
      params: {
        t: Date.now(),
        page: documentPage,
        limit: 10,
        ...(dateMode === "month"
          ? { month: selectedMonth }
          : {}),
        ...(searchText.trim()
          ? { keyword: searchText.trim() }
          : {}),
      },
    });

    setDocuments(Array.isArray(res.data?.data) ? res.data.data : []);

    setDocumentPagination(
      res.data?.pagination || {
        page: documentPage,
        limit: 10,
        total: 0,
        totalPages: 1,
      }
    );
  } catch (err) {
    console.log("FETCH DOCUMENTS ERROR:", err);
    setDocuments([]);
  } finally {
    setLoading(false);
  }
};

  const fetchDocumentTasks = async (documentId) => {
    try {
      const res = await api.get(
        `/documents/${documentId}/tasks`
      );

      setDocumentTasks(res.data);
    } catch (err) {
      console.log("FETCH DOCUMENT TASKS ERROR:", err);
      setDocumentTasks([]);
    }
  };

  useEffect(() => {
  fetchDocuments();
}, [dateMode, selectedMonth, documentPage, searchText]);


  useEffect(() => {
  const handleDocumentRealtime = async (payload) => {
    console.log("DOCUMENT REALTIME RECEIVED:", payload);

    await fetchDocuments();

    const isCurrentDocument =
      selectedDocument?.id &&
      Number(payload?.documentId) === Number(selectedDocument.id);

    if (!isCurrentDocument) return;

    if (payload?.action === "deleted") {
      closeDetailModal();
      return;
    }

    try {
      await refreshSelectedDocument(selectedDocument.id);
    } catch (err) {
      console.log("REFRESH SELECTED DOCUMENT ERROR:", err);
    }
  };

  socket.on("document:changed", handleDocumentRealtime);

  return () => {
    socket.off("document:changed", handleDocumentRealtime);
  };
}, [selectedDocument?.id, dateMode, selectedMonth, documentPage, searchText]);


  const closeDetailModal = () => {
    setSelectedDocument(null);
    setDocumentTasks([]);
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    const confirmDelete = window.confirm(
      "Bạn có chắc muốn xóa văn bản này không?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(
        `/documents/${selectedDocument.id}`
      );

      alert("Xóa văn bản thành công");

      closeDetailModal();
      fetchDocuments();
    } catch (err) {
      console.log("DELETE DOCUMENT ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Xóa văn bản thất bại"
      );
    }
  };

  const refreshSelectedDocument = async (documentId) => {
  const res = await api.get(`/documents/${documentId}`);

  setSelectedDocument(res.data);
  await fetchDocumentTasks(documentId);
  await fetchDocuments();
};

const handleSubmitReview = async () => {
  if (!selectedDocument) return;

  const confirmSubmit = window.confirm(
    "Gửi văn bản này cho Chánh văn phòng duyệt?"
  );

  if (!confirmSubmit) return;

  try {
    await api.put(
      `/documents/${selectedDocument.id}/submit-review`
    );

    alert("Đã gửi văn bản cho Chánh văn phòng duyệt");
    await refreshSelectedDocument(selectedDocument.id);
  } catch (err) {
    console.log("SUBMIT REVIEW ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể gửi duyệt văn bản"
    );
  }
};

const handleOfficeApprove = async () => {
  if (!selectedDocument) return;

  const note = window.prompt(
    "Nhập ghi chú duyệt văn bản:",
    "Văn bản hợp lệ, trình lãnh đạo xem xét"
  );

  if (note === null) return;

  try {
    await api.put(
      `/documents/${selectedDocument.id}/office-approve`,
      {
        note,
      }
    );

    alert("Đã duyệt văn bản");
    await refreshSelectedDocument(selectedDocument.id);
  } catch (err) {
    console.log("OFFICE APPROVE ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể duyệt văn bản"
    );
  }
};

const handleOfficeReject = async () => {
  if (!selectedDocument) return;

  const note = window.prompt(
    "Nhập lý do trả lại văn bản:",
    "Cần chỉnh sửa/bổ sung thông tin văn bản"
  );

  if (note === null) return;

  try {
    await api.put(
      `/documents/${selectedDocument.id}/office-reject`,
      {
        note,
      }
    );

    alert("Đã trả lại văn bản");
    await refreshSelectedDocument(selectedDocument.id);
  } catch (err) {
    console.log("OFFICE REJECT ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể trả lại văn bản"
    );
  }
};

const handleSendToLeader = async () => {
  if (!selectedDocument) return;

  const confirmSend = window.confirm(
    "Gửi văn bản này lên lãnh đạo?"
  );

  if (!confirmSend) return;

  try {
    await api.put(
      `/documents/${selectedDocument.id}/send-to-leader`
    );

    alert("Đã gửi văn bản lên lãnh đạo");
    await refreshSelectedDocument(selectedDocument.id);
  } catch (err) {
    console.log("SEND TO LEADER ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể gửi văn bản lên lãnh đạo"
    );
  }
};

  const handleOpenDocument = (doc) => {
  setSelectedDocument(doc);
  setShowRelatedTasks(true);
  fetchDocumentTasks(doc.id);
};

const filteredDocuments = documents.filter((doc) => {
  const keyword = searchText.trim().toLowerCase();

  if (!keyword) return true;

  return (
    doc.tieu_de?.toLowerCase().includes(keyword) ||
    doc.so_ky_hieu?.toLowerCase().includes(keyword) ||
    doc.trich_yeu?.toLowerCase().includes(keyword) ||
    doc.loai_van_ban_name?.toLowerCase().includes(keyword) ||
    doc.cap_ban_hanh_name?.toLowerCase().includes(keyword) ||
    doc.don_vi_ban_hanh?.toLowerCase().includes(keyword) ||
    doc.nguoi_ky?.toLowerCase().includes(keyword) ||
    doc.created_by_name?.toLowerCase().includes(keyword)
  );
});
const getViewUrl = (filePath, fileName) => {
  return `http://localhost:3000/api/files/view?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "file")
  )}`;
};

return (
    <div
  className={`
    p-4 md:p-6
    min-h-screen
    transition-colors
    ${
      isDark
        ? "bg-slate-950 text-gray-100"
        : "bg-gray-50 text-gray-900"
    }
  `}
>
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1
  className={`text-xl font-bold flex items-center gap-2 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  <img
    src="/icons/file-text-svgrepo-com.svg"
    alt="File icon"
    className="w-6 h-6 object-contain opacity-80"
  />
  Danh sách văn bản
</h1>

          <p
  className={`text-sm mt-1 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
            Danh sách văn bản đến, văn bản nội bộ và tài liệu liên quan
          </p>
        </div>

        <div className="flex items-center gap-3">
  {/* SEARCH */}
<div
  className={`
    relative
    flex
    items-center
    transition-all
    duration-500
    ease-in-out
    ${
      showSearch
        ? "w-[280px]"
        : "w-11"
    }
  `}
>
  <div
  className={`
  flex
  items-center
  border
  shadow-sm
  overflow-hidden
  transition-all
  duration-500
  ease-in-out
  ${
    isDark
      ? "bg-slate-900 border-slate-700"
      : "bg-white border-gray-200"
  }
  ${
    showSearch
      ? "w-[280px] rounded-full pl-4 pr-2"
      : isDark
      ? "w-11 h-11 rounded-full justify-center bg-slate-100 border-slate-600"
      : "w-11 h-11 rounded-full justify-center"
  }
`}
  >
    {showSearch && (
      <input
        autoFocus
        value={searchText}
        onChange={(e) => {
  setDocumentPage(1);
  setSearchText(e.target.value);
}}
        placeholder="Tìm văn bản..."
        className={`
  flex-1
  h-11
  bg-transparent
  outline-none
  text-sm
  ${
    isDark
      ? "text-gray-100 placeholder:text-gray-500"
      : "text-gray-700 placeholder:text-gray-400"
  }
`}
      />
    )}

    <button
      type="button"
      onClick={() => {
        if (!showSearch) {
          setShowSearch(true);
        } else if (searchText) {
          setSearchText("");
        } else {
          setShowSearch(false);
        }
      }}
      className={`
  w-9 h-9
  rounded-full
  flex
  items-center
  justify-center
  transition
  ${
    showSearch
      ? isDark
        ? "bg-slate-800 text-white hover:bg-slate-700"
        : "bg-gray-900 text-white hover:bg-black"
      : isDark
      ? "bg-slate-100 text-slate-900 hover:bg-white"
      : "text-gray-900 hover:bg-gray-100"
  }
`}
      title="Tìm kiếm"
    >
      {showSearch && searchText ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      )}
    </button>
  </div>
</div>

  {user?.permissions?.includes("document:create") && (
    <button
      onClick={() => setShowCreateModal(true)}
      className="bg-blue-500 text-white px-4 py-2.5 rounded-xl hover:bg-blue-600"
    >
      + Tiếp nhận văn bản
    </button>
  )}
</div>
      </div>

      {/* DOCUMENT DATE FILTER */}
<div className="mb-5">
  <div
  className={`
    inline-flex
    items-center
    gap-2
    border
    rounded-2xl
    p-1.5
    shadow-sm
    ${
      isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-white border-gray-200"
    }
  `}
>
    <button
      type="button"
      onClick={() => {
  setDocumentPage(1);
  setDateMode("all");
  setSearchText("");
}}
      className={`
        px-4 py-2
        rounded-xl
        text-sm
        font-semibold
        transition
        ${
  dateMode === "month"
    ? "bg-blue-600 text-white"
    : isDark
    ? "text-gray-300 hover:bg-slate-800"
    : "text-gray-600 hover:bg-gray-100"
}
      `}
    >
      Tất cả
    </button>

    <button
      type="button"
      onClick={() => {
  setDocumentPage(1);
  setDateMode("month");
}}
      className={`
        px-4 py-2
        rounded-xl
        text-sm
        font-semibold
        transition
        ${
          dateMode === "month"
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }
      `}
    >
      Theo tháng
    </button>

    {dateMode === "month" && (
      <>
        <button
          type="button"
          onClick={() => {
  setDocumentPage(1);
  setSelectedMonth((prev) =>
    addMonth(prev, -1)
  );
}}
          className={`
            w-9 h-9
            rounded-xl
            flex
            items-center
            justify-center
            transition
            ${
              isDark
                ? "text-gray-300 hover:bg-slate-800"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          ‹
        </button>

        <div
          className={`
            min-w-[150px]
            text-center
            px-4 py-2
            rounded-xl
            text-sm
            font-bold
            ${
              isDark
                ? "bg-blue-950/40 text-blue-300"
                : "bg-blue-50 text-blue-700"
            }
          `}
        >
          {formatMonthLabel(selectedMonth)}
        </div>

        <button
          type="button"
          onClick={() => {
  setDocumentPage(1);
  setSelectedMonth((prev) =>
    addMonth(prev, 1)
  );
}}
          className={`
  w-9 h-9
  rounded-xl
  flex
  items-center
  justify-center
  transition
  ${
    isDark
      ? "text-gray-300 hover:bg-slate-800"
      : "text-gray-600 hover:bg-gray-100"
  }
`}
        >
          ›
        </button>

        {selectedMonth !== getCurrentMonth() && (
          <button
            type="button"
            onClick={() => {
  setDocumentPage(1);
  setSelectedMonth(getCurrentMonth());
}}
            className={`
              px-3 py-2
              rounded-xl
              text-sm
              font-semibold
              transition
              ${
                isDark
                  ? "text-gray-300 hover:bg-slate-800"
                  : "text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            Tháng hiện tại
          </button>
        )}
      </>
    )}
  </div>
</div>

      {/* TABLE */}
      <div
  className={`
    rounded-2xl
    shadow-md
    border
    overflow-hidden
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-200"
    }
  `}
>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse table-fixed">
            <thead
              className={`
                border-b
                ${
                  isDark
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-200"
                }
              `}
            >
              <tr>
                <th className="w-[23%] px-5 py-4 text-left text-sm font-semibold text-gray-600">
                  Văn bản
                </th>

                <th className="w-[13%] px-4 py-4 text-left text-sm font-semibold text-gray-600">
                  Loại
                </th>

                <th className="w-[14%] px-4 py-4 text-left text-sm font-semibold text-gray-600">
                  Cấp ban hành
                </th>

                <th className="w-[12%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
                  Ưu tiên
                </th>

                <th className="w-[12%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
                  Bảo mật
                </th>

                <th className="w-[12%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
                  Ngày nhận
                </th>

                <th className="w-[13%] px-4 py-4 text-left text-sm font-semibold text-gray-600">
                  Người nhập
                </th>

                <th className="w-[12%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
                  Trạng thái
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-12 text-gray-400"
                  >
                    Đang tải danh sách văn bản...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-12 text-gray-400"
                  >
                    {searchText
                      ? "Không tìm thấy văn bản phù hợp"
                      : dateMode === "month"
                      ? `Chưa có văn bản trong ${formatMonthLabel(selectedMonth)}`
                      : "Chưa có văn bản"}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() =>
                      handleOpenDocument(doc)
                    }
                    className={`
                      border-b
                      last:border-b-0
                      cursor-pointer
                      transition
                      ${
                        isDark
                          ? "border-slate-800 hover:bg-blue-950/20"
                          : "border-gray-100 hover:bg-blue-50/50"
                      }
                    `}
                  >
                    <td className="px-5 py-4">
                      <div
  className={`font-semibold line-clamp-1 ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
                        {doc.tieu_de}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        {doc.so_ky_hieu ||
                          "Chưa có số ký hiệu"}
                      </div>

                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {doc.trich_yeu ||
                          "Không có trích yếu"}
                      </div>
                    </td>

                    <td
  className={`px-4 py-4 text-sm ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
                      {doc.loai_van_ban_name || "-"}
                    </td>

                    <td
  className={`px-4 py-4 text-sm ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
                      {doc.cap_ban_hanh_name || "-"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`
                          inline-flex items-center justify-center
                          px-3 py-1 rounded-full
                          text-xs font-semibold
                          whitespace-nowrap
                          ${
                            priorityColor[
                              doc.muc_do_uu_tien
                            ] ||
                            "bg-gray-100 text-gray-700"
                          }
                        `}
                      >
                        {doc.muc_do_uu_tien_name || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`
                          inline-flex items-center justify-center
                          px-3 py-1 rounded-full
                          text-xs font-semibold
                          whitespace-nowrap
                          ${
                            securityColor[
                              doc.muc_do_bao_mat
                            ] ||
                            "bg-gray-100 text-gray-700"
                          }
                        `}
                      >
                        {doc.muc_do_bao_mat_name || "-"}
                      </span>
                    </td>

                    <td
  className={`px-4 py-4 text-sm text-center whitespace-nowrap ${
    isDark ? "text-gray-300" : "text-gray-600"
  }`}
>
                      {doc.ngay_nhan
                        ? new Date(
                            doc.ngay_nhan
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td
  className={`px-4 py-4 text-sm ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
                      {doc.created_by_name || "-"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
  className={`
    inline-flex items-center justify-center
    px-3 py-1
    rounded-full
    text-xs
    font-semibold
    whitespace-nowrap
    ${getWorkflowStatusColor(doc.workflow_status)}
  `}
>
  {getWorkflowStatusLabel(doc.workflow_status)}
</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

           {documentPagination.totalPages > 1 && (
        <div
          className={`
            mt-4
            px-4 py-3
            rounded-2xl
            border
            flex
            items-center
            justify-between
            gap-3
            ${
              isDark
                ? "bg-slate-900 border-slate-800 text-gray-300"
                : "bg-white border-gray-200 text-gray-600"
            }
          `}
        >
          <button
            type="button"
            disabled={documentPage <= 1}
            onClick={() =>
              setDocumentPage((prev) => Math.max(prev - 1, 1))
            }
            className={`
              px-4 py-2
              rounded-xl
              text-sm
              font-semibold
              transition
              disabled:opacity-40
              disabled:cursor-not-allowed
              ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700"
                  : "bg-gray-100 hover:bg-gray-200"
              }
            `}
          >
            ‹ Trước
          </button>

          <div className="text-sm font-semibold text-center">
            Trang {documentPagination.page}/{documentPagination.totalPages}
            <span className="ml-2 text-xs opacity-70">
              ({documentPagination.total} văn bản)
            </span>
          </div>

          <button
            type="button"
            disabled={documentPage >= documentPagination.totalPages}
            onClick={() =>
              setDocumentPage((prev) =>
                Math.min(prev + 1, documentPagination.totalPages)
              )
            }
            className={`
              px-4 py-2
              rounded-xl
              text-sm
              font-semibold
              transition
              disabled:opacity-40
              disabled:cursor-not-allowed
              ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700"
                  : "bg-gray-100 hover:bg-gray-200"
              }
            `}
          >
            Sau ›
          </button>
        </div>
      )}         

     {/* DETAIL MODAL */}
{selectedDocument && (
  <div
    className="
      fixed inset-0
      bg-black/50
      backdrop-blur-sm
      flex
      items-center
      justify-center
      z-[10000]
      px-4
    "
    onClick={closeDetailModal}
  >
    <div
      className={`
        w-[760px]
        max-w-[96vw]
        max-h-[90vh]
        rounded-[28px]
        shadow-2xl
        overflow-hidden
        flex
        flex-col
        ${
          isDark
            ? "bg-slate-900 text-gray-100"
            : "bg-white text-gray-900"
        }
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* MODAL HEADER */}
      <div
        className={`
  px-6
  py-4
  rounded-t-[28px]
  shrink-0
  relative
  after:content-['']
  after:absolute
  after:left-6
  after:right-6
  after:bottom-0
  after:h-px
  after:bg-gradient-to-r
  after:from-transparent
  ${
    isDark
      ? "bg-slate-900 after:via-slate-700 after:to-transparent"
      : "bg-white after:via-gray-200 after:to-transparent"
  }
`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10
                  rounded-2xl
                  bg-purple-50
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >
                📄
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                  {selectedDocument.tieu_de}
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  {selectedDocument.so_ky_hieu || "Chưa có số ký hiệu"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className={`
                  inline-flex
                  items-center
                  px-3 py-1
                  rounded-full
                  text-xs
                  font-semibold
                  ${getWorkflowStatusColor(selectedDocument.workflow_status)}
                `}
              >
                {getWorkflowStatusLabel(selectedDocument.workflow_status)}
              </span>

              <span
                className={`
                  inline-flex
                  items-center
                  px-3 py-1
                  rounded-full
                  text-xs
                  font-semibold
                  ${
                    priorityColor[
                      selectedDocument.muc_do_uu_tien
                    ] || "bg-gray-100 text-gray-700"
                  }
                `}
              >
                {selectedDocument.muc_do_uu_tien_name || "-"}
              </span>

              <span
                className={`
                  inline-flex
                  items-center
                  px-3 py-1
                  rounded-full
                  text-xs
                  font-semibold
                  ${
                    securityColor[
                      selectedDocument.muc_do_bao_mat
                    ] || "bg-gray-100 text-gray-700"
                  }
                `}
              >
                {selectedDocument.muc_do_bao_mat_name || "-"}
              </span>
            </div>
          </div>

          <button
            onClick={closeDetailModal}
            className="
              w-10 h-10
              rounded-full
              flex
              items-center
              justify-center
              text-gray-400
              hover:text-red-500
              hover:bg-red-50
              transition
              shrink-0
              text-xl
            "
          >
            ✕
          </button>
        </div>
      </div>

      {/* MODAL BODY */}
      <div
  className={`
    px-6 py-5
    overflow-y-auto
    space-y-5
    ${
      isDark ? "bg-slate-900" : "bg-white"
    }
  `}
>
        {/* THÔNG TIN VĂN BẢN */}
        <div
  className={`
    rounded-3xl
    border
    p-5
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-white border-gray-200"
    }
  `}
>
          <h3
  className={`text-base font-bold mb-4 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
            Thông tin văn bản
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">
                Loại văn bản
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.loai_van_ban_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Cấp ban hành
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.cap_ban_hanh_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Đơn vị ban hành
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.don_vi_ban_hanh || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Người ký
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.nguoi_ky || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Ngày ban hành
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.ngay_ban_hanh
                  ? new Date(
                      selectedDocument.ngay_ban_hanh
                    ).toLocaleDateString()
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Ngày nhận
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.ngay_nhan
                  ? new Date(
                      selectedDocument.ngay_nhan
                    ).toLocaleDateString()
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Người nhập
              </p>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                {selectedDocument.created_by_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1">
                Trạng thái xử lý
              </p>
              <span
                className={`
                  inline-flex
                  items-center
                  px-3 py-1
                  rounded-full
                  text-xs
                  font-semibold
                  ${getWorkflowStatusColor(selectedDocument.workflow_status)}
                `}
              >
                {getWorkflowStatusLabel(selectedDocument.workflow_status)}
              </span>
            </div>
          </div>
        </div>

        {/* TRÍCH YẾU */}
        <div
  className={`
    rounded-3xl
    border
    p-5
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-white border-gray-200"
    }
  `}
>
          <h3
  className={`text-base font-bold mb-3 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
            Trích yếu
          </h3>

          <p
  className={`text-sm leading-7 whitespace-pre-line ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
            {selectedDocument.trich_yeu || "-"}
          </p>
        </div>

        {/* FILE */}
        {selectedDocument.file_path && (
          <div
  className={`
    rounded-3xl
    border
    px-5
    py-4
    ${
      isDark
        ? "bg-blue-950/30 border-blue-900/50"
        : "bg-blue-50 border-blue-100"
    }
  `}
>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p
  className={`text-sm font-bold ${
    isDark ? "text-blue-300" : "text-blue-800"
  }`}
>
                  File văn bản đính kèm
                </p>

                <p
  className={`text-sm mt-1 truncate ${
    isDark ? "text-blue-400" : "text-blue-600"
  }`}
>
                  {fixVietnameseFileName(
                    selectedDocument.file_name || "Xem file"
                  )}
                </p>
              </div>

              <a
                href={getViewUrl(
                  selectedDocument.file_path,
                  selectedDocument.file_name
                )}
                target="_blank"
                rel="noreferrer"
                className="
                  px-4 py-2
                  rounded-xl
                  bg-blue-500
                  text-white
                  text-sm
                  font-semibold
                  hover:bg-blue-600
                  transition
                  shrink-0
                "
              >
                Xem file
              </a>
            </div>
          </div>
        )}

        {/* NHIỆM VỤ LIÊN QUAN */}
        <div
  className={`
    rounded-3xl
    border
    overflow-hidden
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-white border-gray-200"
    }
  `}
>
          <button
            type="button"
            onClick={() =>
              setShowRelatedTasks((prev) => !prev)
            }
            className={`
  w-full
  px-5
  py-4
  flex
  items-center
  justify-between
  transition
  ${
    isDark ? "hover:bg-slate-900" : "hover:bg-gray-50"
  }
`}
          >
            <div className="flex items-center gap-2">
              <span>📋</span>

              <div className="text-left">
                <h3
  className={`text-base font-bold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                  Nhiệm vụ liên quan
                </h3>

                <p className="text-xs text-gray-400 mt-0.5">
                  {documentTasks.length} nhiệm vụ
                </p>
              </div>
            </div>

            <div
  className={`flex items-center gap-2 text-sm ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
              <span>
                {showRelatedTasks ? "Ẩn" : "Hiện"}
              </span>

              <span
                className={`
                  inline-block
                  transition-transform
                  duration-300
                  ${showRelatedTasks ? "rotate-180" : ""}
                `}
              >
                ▼
              </span>
            </div>
          </button>

          <div
            className={`
              overflow-hidden
              transition-all
              duration-300
              ease-in-out
              ${
                showRelatedTasks
                  ? "max-h-[700px] opacity-100"
                  : "max-h-0 opacity-0"
              }
            `}
          >
            <div className="px-5 pb-5 space-y-3">
              {documentTasks.length === 0 ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-gray-200
                    bg-gray-50
                    px-4
                    py-5
                    text-center
                    text-sm
                    text-gray-400
                  "
                >
                  Chưa có nhiệm vụ liên quan
                </div>
              ) : (
                documentTasks.map((task) => (
                  <div
  key={task.id}
  className={`
    rounded-2xl
    border
    px-4
    py-4
    transition
    ${
      isDark
        ? "bg-slate-900 border-slate-700 hover:bg-blue-950/20 hover:border-blue-800"
        : "bg-gray-50 border-gray-200 hover:bg-blue-50/50 hover:border-blue-200"
    }
  `}
>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p
  className={`text-sm font-bold line-clamp-1 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                          {task.tieu_de}
                        </p>

                        <div
  className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
                          <span>
                            Phòng ban: {task.unit_name || "-"}
                          </span>

                          <span>
                            Trạng thái: {task.status_name || "-"}
                          </span>

                          <span>
                            Hạn chót:{" "}
                            {task.han_chot
                              ? new Date(
                                  task.han_chot
                                ).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                      </div>

                      <span
                        title={
                          task.priority_reason ||
                          "Chưa có lý do ưu tiên"
                        }
                        className={`
                          inline-flex
                          items-center
                          gap-2
                          px-3 py-1
                          rounded-full
                          border
                          text-xs
                          font-semibold
                          whitespace-nowrap
                          shrink-0
                          ${getPriorityColor(task.priority_level)}
                        `}
                      >
                        <span
                          className={`
                            w-2 h-2
                            rounded-full
                            ${getPriorityDotColor(task.priority_level)}
                          `}
                        />

                        {getPriorityLabel(task.priority_level)}
                      </span>
                    </div>

                    {task.priority_reason && (
                      <div
  className={`
    mt-3
    rounded-xl
    border
    px-3
    py-2
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-white border-gray-100"
    }
  `}
>
                        <p className="text-[11px] text-gray-400 mb-1">
                          Lý do ưu tiên
                        </p>

                        <p
  className={`text-xs ${
    isDark ? "text-gray-300" : "text-gray-600"
  }`}
>
                          {task.priority_reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACTION */}
      <div
  className={`
  px-6
  py-4
  backdrop-blur
  rounded-b-[28px]
  shrink-0
  flex
  flex-col
  sm:flex-row
  sm:items-center
  sm:justify-between
  gap-3
  relative
  before:content-['']
  before:absolute
  before:left-6
  before:right-6
  before:top-0
  before:h-px
  before:bg-gradient-to-r
  before:from-transparent
  ${
    isDark
      ? "bg-slate-950/95 before:via-slate-700 before:to-transparent"
      : "bg-white/95 before:via-gray-200 before:to-transparent"
  }
`}
>
        <div className="flex gap-2 flex-wrap">
          {user?.permissions?.includes("document:update") &&
  ["draft", "office_rejected"].includes(
    selectedDocument.workflow_status
  ) && (
    <button
      onClick={() => setShowEditModal(true)}
      className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200"
    >
      Chỉnh sửa
    </button>
  )}

          {user?.permissions?.includes(
            "document:delete"
          ) && (
            <button
              onClick={handleDeleteDocument}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
            >
              Xóa
            </button>
          )}

          {user?.permissions?.includes(
            "document:submit_for_review"
          ) &&
            ["draft", "office_rejected"].includes(
              selectedDocument.workflow_status
            ) && (
              <button
                onClick={handleSubmitReview}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200"
              >
                Gửi Chánh văn phòng duyệt
              </button>
            )}

          {user?.permissions?.includes(
            "document:office_review"
          ) &&
            selectedDocument.workflow_status ===
              "waiting_office_review" && (
              <>
                <button
                  onClick={handleOfficeApprove}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200"
                >
                  Duyệt văn bản
                </button>

                <button
                  onClick={handleOfficeReject}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                >
                  Trả lại
                </button>
              </>
            )}

          {user?.permissions?.includes(
            "document:send_to_leader"
          ) &&
            selectedDocument.workflow_status ===
              "office_approved" && (
              <button
                onClick={handleSendToLeader}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200"
              >
                Gửi lãnh đạo
              </button>
            )}

          {user?.permissions?.includes(
            "document:create_task"
          ) &&
            selectedDocument.workflow_status ===
              "sent_to_leader" && (
              <button
                onClick={() =>
                  navigate(
                    `/app/tasks/create?document_id=${selectedDocument.id}`
                  )
                }
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
              >
                Tạo nhiệm vụ từ văn bản
              </button>
            )}
        </div>

        <button
  onClick={closeDetailModal}
  className={`
    px-4 py-2
    rounded-xl
    transition
    ${
      isDark
        ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  `}
>
          Đóng
        </button>
      </div>
    </div>
  </div>
)}

      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchDocuments}
        />
      )}

      {showEditModal && selectedDocument && (
        <EditDocumentModal
          document={selectedDocument}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            fetchDocuments();
            closeDetailModal();
          }}
        />
      )}
    </div>
  );
}