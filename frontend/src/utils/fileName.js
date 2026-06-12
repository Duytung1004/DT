export const fixVietnameseFileName = (name = "") => {
  if (!name) return "";

  const maybeBroken =
    name.includes("Ã") ||
    name.includes("Â") ||
    name.includes("á»") ||
    name.includes("Ä");

  if (!maybeBroken) return name;

  try {
    return decodeURIComponent(
      Array.from(name)
        .map((char) =>
          `%${char
            .charCodeAt(0)
            .toString(16)
            .padStart(2, "0")}`
        )
        .join("")
    );
  } catch (err) {
    return name;
  }
};