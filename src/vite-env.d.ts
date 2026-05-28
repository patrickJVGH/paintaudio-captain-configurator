/// <reference types="vite/client" />

import type { DesktopBridge } from "@/types/desktop";

declare global {
  interface Window {
    desktopApp?: DesktopBridge;
  }
}
