import { create } from 'zustand'

interface NetworkState {
  online: boolean
  setOnline: (online: boolean) => void
}

export const useNetwork = create<NetworkState>((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (online) => set({ online }),
}))

// Hook listeners (called from App)
export function bindNetworkListeners() {
  const update = () => useNetwork.getState().setOnline(navigator.onLine)
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
  return () => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  }
}
