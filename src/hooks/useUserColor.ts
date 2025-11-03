import { useState, useEffect } from "react";

export const useUserColor = () => {
  const [userColor, setUserColor] = useState<string>("blue");

  useEffect(() => {
    const savedColor = localStorage.getItem("user-color") || "blue";
    setUserColor(savedColor);
  }, []);

  const updateUserColor = (color: string) => {
    setUserColor(color);
    localStorage.setItem("user-color", color);
  };

  const getColorClass = () => {
    const colorMap: Record<string, string> = {
      blue: "text-blue-600",
      green: "text-green-600",
      purple: "text-purple-600",
      orange: "text-orange-600",
      red: "text-red-600",
      gray: "text-gray-600",
    };
    return colorMap[userColor] || colorMap.blue;
  };

  return { userColor, updateUserColor, getColorClass };
};
