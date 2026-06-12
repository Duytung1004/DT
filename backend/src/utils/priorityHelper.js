// =======================
// PRIORITY HELPER
// Tính độ ưu tiên nhiệm vụ theo hạn chót + loại văn bản
// =======================

const getDaysLeft = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  const dueDate = new Date(deadline);

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - today.getTime();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getDeadlineScore = (deadline) => {
  const daysLeft = getDaysLeft(deadline);

  if (daysLeft === null) {
    return {
      score: 0,
      reason: "Chưa có hạn chót",
    };
  }

  if (daysLeft < 0) {
    return {
      score: 60,
      reason: "Nhiệm vụ đã quá hạn",
    };
  }

  if (daysLeft <= 1) {
    return {
      score: 50,
      reason: "Hạn chót trong vòng 1 ngày",
    };
  }

  if (daysLeft <= 3) {
    return {
      score: 40,
      reason: "Hạn chót trong vòng 3 ngày",
    };
  }

  if (daysLeft <= 7) {
    return {
      score: 30,
      reason: "Hạn chót trong vòng 7 ngày",
    };
  }

  if (daysLeft <= 14) {
    return {
      score: 20,
      reason: "Hạn chót trong vòng 14 ngày",
    };
  }

  return {
    score: 10,
    reason: "Hạn chót còn dài",
  };
};

const getPriorityLevel = (score) => {
  if (score >= 90) {
    return "rat_cao";
  }

  if (score >= 70) {
    return "cao";
  }

  if (score >= 45) {
    return "trung_binh";
  }

  return "binh_thuong";
};

const getPriorityLabel = (level) => {
  switch (level) {
    case "rat_cao":
      return "Rất cao";
    case "cao":
      return "Cao";
    case "trung_binh":
      return "Trung bình";
    case "binh_thuong":
      return "Bình thường";
    default:
      return "Bình thường";
  }
};

exports.calculateTaskPriority = ({
  deadline,
  documentTypeName,
  documentTypeWeight,
}) => {
  const deadlineResult = getDeadlineScore(deadline);

  const typeScore = Number(documentTypeWeight || 10);

  const totalScore = deadlineResult.score + typeScore;

  const level = getPriorityLevel(totalScore);

  const reasonParts = [
    deadlineResult.reason,
    documentTypeName
      ? `Loại văn bản: ${documentTypeName} (+${typeScore} điểm)`
      : `Không có loại văn bản cụ thể (+${typeScore} điểm)`,
  ];

  return {
    priority_score: totalScore,
    priority_level: level,
    priority_label: getPriorityLabel(level),
    priority_reason: reasonParts.join("; "),
  };
};