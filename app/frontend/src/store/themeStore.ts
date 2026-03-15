import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LIGHT_BG = 0xd8e0ed;
export const DARK_BG = 0x818a99;

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: "nexus-theme",
    }
  )
);
