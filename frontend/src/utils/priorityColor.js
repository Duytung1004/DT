export const getPriorityLabel = (level) => {
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

export const getPriorityColor = (level) => {
  switch (level) {
    case "rat_cao":
      return "bg-red-100 text-red-700 border-red-200";
    case "cao":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "trung_binh":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "binh_thuong":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

export const getPriorityDotColor = (level) => {
  switch (level) {
    case "rat_cao":
      return "bg-red-500";
    case "cao":
      return "bg-orange-500";
    case "trung_binh":
      return "bg-yellow-500";
    case "binh_thuong":
      return "bg-green-500";
    default:
      return "bg-gray-400";
  }
};