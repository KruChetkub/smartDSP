import { create } from 'zustand';

export const useStore = create((set) => ({
  // Data State
  userProfile: null,
  selectedYear: new Date().getFullYear() + 543, // Thai year default
  selectedQuarter: 'Q1',
  
  // Actions
  setUserProfile: (profile) => set({ userProfile: profile }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedQuarter: (quarter) => set({ selectedQuarter: quarter }),
  
  // Auth actions
  clearAuth: () => set({ userProfile: null }),
}));
