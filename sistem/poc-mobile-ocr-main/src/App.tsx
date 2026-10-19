import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-dvh bg-ink-0 text-bone-0 flex flex-col">
      <Outlet />
    </div>
  )
}
