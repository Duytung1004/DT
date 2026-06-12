import { useMemo, useState } from "react";
import api from "../../services/api";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusLabel = (status) => {
  const map = {
    cho_nhan_viec: "Chờ nhận việc",
    dang_thuc_hien: "Đang thực hiện",
    cho_duyet: "Chờ duyệt",
    yeu_cau_chinh_sua: "Yêu cầu chỉnh sửa",
    hoan_thanh: "Hoàn thành",
  };

  return map[status] || status || "-";
};

const getStatusColor = (status) => {
  const map = {
    cho_nhan_viec: "bg-gray-100 text-gray-700",
    dang_thuc_hien: "bg-blue-100 text-blue-700",
    cho_duyet: "bg-yellow-100 text-yellow-700",
    yeu_cau_chinh_sua: "bg-red-100 text-red-700",
    hoan_thanh: "bg-green-100 text-green-700",
  };

  return map[status] || "bg-gray-100 text-gray-700";
};

export default function EmployeeReportModal({
  reportGroup,
  onClose,
  onSubmitted,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [khoKhan, setKhoKhan] = useState("");
  const [deXuat, setDeXuat] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const items = reportGroup?.items || [];

  const summary = useMemo(() => {
    const total = items.length;

    const done = items.filter(
      (item) => item.subtask_status === "hoan_thanh"
    ).length;

    const doing = items.filter(
      (item) => item.subtask_status === "dang_thuc_hien"
    ).length;

    const pendingReview = items.filter(
      (item) => item.subtask_status === "cho_duyet"
    ).length;

    const overdue = items.filter((item) => {
      if (!item.subtask_deadline) return false;

      return (
        new Date(item.subtask_deadline) < new Date() &&
        item.subtask_status !== "hoan_thanh"
      );
    }).length;

    const averageProgress =
      total > 0
        ? Math.round(
            items.reduce(
              (sum, item) =>
                sum + Number(item.progress_snapshot || 0),
              0
            ) / total
          )
        : 0;

    return {
      total,
      done,
      doing,
      pendingReview,
      overdue,
      averageProgress,
    };
  }, [items]);

  if (!reportGroup) return null;

  const handleChangeNote = (subtaskId, value) => {
    setItemNotes((prev) => ({
      ...prev,
      [subtaskId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!noiDung.trim()) {
      alert("Vui lòng nhập nội dung báo cáo");
      return;
    }

    if (items.length === 0) {
      alert("Không có phần việc để báo cáo");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("noi_dung", noiDung.trim());
      formData.append("kho_khan", khoKhan.trim());
      formData.append("de_xuat", deXuat.trim());

      formData.append(
        "subtask_ids",
        JSON.stringify(items.map((item) => item.subtask_id))
      );

      formData.append("item_notes", JSON.stringify(itemNotes));

      if (file) {
        formData.append("file", file);
      }

      await api.post("/employee-reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Đã gửi báo cáo cá nhân tháng này");

      if (onSubmitted) {
        await onSubmitted();
      }

      onClose();
    } catch (err) {
      console.error("CREATE EMPLOYEE REPORT ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không thể gửi báo cáo cá nhân"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0
        bg-black/50
        backdrop-blur-sm
        flex items-center justify-center
        z-[90]
        px-4
      "
      onClick={onClose}
    >
      <div
        className="
          bg-white
          w-[820px]
          max-w-[96vw]
          max-h-[92vh]
          rounded-3xl
          shadow-2xl
          overflow-hidden
          flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-5 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                  Báo cáo cá nhân hằng tháng
                </span>

                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                  Tháng {reportGroup.period_key || "-"}
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900">
                Gửi báo cáo cá nhân tháng {reportGroup.period_key || ""}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Tổng hợp các phần việc được giao trong tháng để gửi báo cáo
                một lần.
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="
                w-9 h-9
                rounded-full
                flex items-center justify-center
                text-gray-400
                hover:text-red-500
                hover:bg-red-50
                transition
                disabled:opacity-60
              "
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <SummaryBox label="Phần việc" value={summary.total} />
            <SummaryBox label="Hoàn thành" value={summary.done} />
            <SummaryBox label="Đang làm" value={summary.doing} />
            <SummaryBox label="Chờ duyệt" value={summary.pendingReview} />
            <SummaryBox label="Quá hạn" value={summary.overdue} />
            <SummaryBox label="Tiến độ TB" value={`${summary.averageProgress}%`} />
          </div>

          {/* PERIOD INFO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoBox
              label="Tháng báo cáo"
              value={reportGroup.period_key || "-"}
              highlight
            />

            <InfoBox
              label="Từ ngày"
              value={formatDate(reportGroup.period_start)}
            />

            <InfoBox
              label="Đến ngày"
              value={formatDate(reportGroup.period_end)}
            />
          </div>

          {/* SUBTASK LIST */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">
                Phần việc đưa vào báo cáo
              </h3>

              <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">
                {items.length} phần việc
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-500">
                Không có phần việc cần báo cáo trong tháng này.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.subtask_id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 line-clamp-1">
                          {item.subtask_title || "Phần việc"}
                        </p>

                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          Thuộc nhiệm vụ: {item.task_title || "-"}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Hạn chót: {formatDate(item.subtask_deadline)}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 ${getStatusColor(
                          item.subtask_status
                        )}`}
                      >
                        {getStatusLabel(item.subtask_status)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Mức ghi nhận tự động</span>
                        <span>{item.progress_snapshot || 0}%</span>
                      </div>

                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${item.progress_snapshot || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <textarea
                      value={itemNotes[item.subtask_id] || ""}
                      onChange={(e) =>
                        handleChangeNote(item.subtask_id, e.target.value)
                      }
                      rows={2}
                      placeholder="Ghi chú riêng cho phần việc này nếu có..."
                      className="
                        mt-3
                        w-full
                        border border-gray-200
                        rounded-2xl
                        px-4 py-3
                        text-sm
                        resize-none
                        outline-none
                        bg-white
                        focus:ring-2
                        focus:ring-purple-400
                      "
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FORM */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nội dung đã thực hiện{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                value={noiDung}
                onChange={(e) => setNoiDung(e.target.value)}
                rows={5}
                placeholder="Nhập nội dung công việc đã thực hiện trong tháng..."
                className="
                  mt-2
                  w-full
                  border border-gray-200
                  rounded-2xl
                  px-4 py-3
                  resize-none
                  outline-none
                  focus:ring-2
                  focus:ring-purple-400
                "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Khó khăn, vướng mắc
              </label>

              <textarea
                value={khoKhan}
                onChange={(e) => setKhoKhan(e.target.value)}
                rows={3}
                placeholder="Nhập khó khăn, vướng mắc nếu có..."
                className="
                  mt-2
                  w-full
                  border border-gray-200
                  rounded-2xl
                  px-4 py-3
                  resize-none
                  outline-none
                  focus:ring-2
                  focus:ring-purple-400
                "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Đề xuất, kiến nghị
              </label>

              <textarea
                value={deXuat}
                onChange={(e) => setDeXuat(e.target.value)}
                rows={3}
                placeholder="Nhập đề xuất, kiến nghị nếu có..."
                className="
                  mt-2
                  w-full
                  border border-gray-200
                  rounded-2xl
                  px-4 py-3
                  resize-none
                  outline-none
                  focus:ring-2
                  focus:ring-purple-400
                "
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                File minh chứng nếu có
              </label>

              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="
                  mt-2
                  w-full
                  rounded-2xl
                  border border-gray-200
                  bg-white
                  px-4 py-3
                  text-sm
                "
              />

              {file && (
                <p className="text-xs text-gray-500 mt-2">
                  Đã chọn: {file.name}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4">
              <p className="text-sm text-yellow-700 leading-relaxed">
                Tỷ lệ hoàn thành được hệ thống tự ghi nhận theo trạng thái
                phần việc. Bạn chỉ cần bổ sung nội dung thực hiện, khó khăn
                và đề xuất nếu có.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4 py-2
              rounded-xl
              bg-gray-100
              text-gray-700
              hover:bg-gray-200
              transition
              disabled:opacity-60
            "
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="
              px-5 py-2
              rounded-xl
              bg-purple-600
              text-white
              hover:bg-purple-700
              transition
              disabled:bg-gray-300
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Đang gửi..." : "Gửi báo cáo tháng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
      <p className="text-xs text-purple-500 font-medium">{label}</p>

      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function InfoBox({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "bg-purple-50 border-purple-100"
          : "bg-gray-50 border-gray-100"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          highlight ? "text-purple-500" : "text-gray-400"
        }`}
      >
        {label}
      </p>

      <p className="text-sm font-bold text-gray-800 mt-1">
        {value || "-"}
      </p>
    </div>
  );
}