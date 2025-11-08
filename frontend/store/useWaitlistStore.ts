import { create } from "zustand";

interface WaitlistState {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
  setSubmitting: (isSubmitting: boolean) => void;
  setSuccess: (isSuccess: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useWaitlistStore = create<WaitlistState>((set) => ({
  isSubmitting: false,
  isSuccess: false,
  error: null,
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setSuccess: (isSuccess) => set({ isSuccess }),
  setError: (error) => set({ error }),
  reset: () => set({ isSubmitting: false, isSuccess: false, error: null }),
}));
