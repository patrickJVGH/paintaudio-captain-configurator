import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isElectron = navigator.userAgent.toLowerCase().includes("electron");

if (import.meta.env.PROD && !isElectron && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
