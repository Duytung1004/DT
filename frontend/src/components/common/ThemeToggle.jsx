import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={onToggle}
      className={`
        relative
        w-[76px] h-10
        rounded-full
        transition-all duration-300
        border
        flex items-center
        px-1
        shrink-0
        ${
          isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-gray-100 border-gray-200"
        }
      `}
    >
      <span
        className={`
          absolute
          w-8 h-8
          rounded-full
          bg-white
          shadow-md
          flex items-center justify-center
          transition-all duration-300
          ${
            isDark
              ? "translate-x-8 text-slate-700"
              : "translate-x-0 text-yellow-500"
          }
        `}
      >
        {isDark ? <Moon size={17} /> : <Sun size={17} />}
      </span>

      <span className="ml-2 text-yellow-500">
        {!isDark && <Sun size={16} />}
      </span>

      <span className="ml-auto mr-2 text-slate-300">
        {isDark && <Moon size={16} />}
      </span>
    </button>
  );
}