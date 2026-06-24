import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import AdminApp from './admin/AdminApp.tsx'
import { isAdminHost } from './lib/adminHost.ts'
import './index.css'
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/600-italic.css'
import '@fontsource/fraunces/700.css'
import '@fontsource-variable/inter-tight'

// Load saved theme preferences before rendering
const savedTheme = localStorage.getItem("app-theme") || "default";
const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";

document.documentElement.setAttribute("data-theme", savedTheme);
if (savedDarkMode === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

const root = createRoot(document.getElementById("root")!);
const RootComponent = isAdminHost() ? AdminApp : App;
root.render(createElement(HelmetProvider, null, createElement(RootComponent)));
