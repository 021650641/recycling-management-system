import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';

interface SettingsState {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  setDateFormat: (fmt: DateFormat) => void;
  setTimeFormat: (fmt: TimeFormat) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      setDateFormat: (fmt) => set({ dateFormat: fmt }),
      setTimeFormat: (fmt) => set({ timeFormat: fmt }),
    }),
    {
      name: 'display-settings',
      partialize: (state) => ({
        dateFormat: state.dateFormat,
        timeFormat: state.timeFormat,
      }),
    }
  )
);
