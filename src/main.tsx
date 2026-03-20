import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Load saved theme preferences before rendering
const savedTheme = localStorage.getItem("app-theme") || "default";
const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";

document.documentElement.setAttribute("data-theme", savedTheme);
if (savedDarkMode === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

function Root() { return <App />; }
const root = createRoot(document.getElementById("root")!);
root.render(<Root />);
