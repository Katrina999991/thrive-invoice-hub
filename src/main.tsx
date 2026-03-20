import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const savedTheme = localStorage.getItem("app-theme") || "default";
const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";

document.documentElement.setAttribute("data-theme", savedTheme);
if (savedDarkMode === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
