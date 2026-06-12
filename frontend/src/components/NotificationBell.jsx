import { useEffect, useState } from "react";
import socket from "../socket/socket";

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const userId = 2; // sau này lấy từ login

    socket.emit("join_user", userId);

    socket.on("new_notification", () => {
      setCount((prev) => prev + 1);
    });

    return () => socket.off("new_notification");
  }, []);

  return (
    <div className="relative cursor-pointer">
      🔔
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}