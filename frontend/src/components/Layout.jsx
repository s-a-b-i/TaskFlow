import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * Main app layout: fixed sidebar + scrollable content area.
 * All authenticated pages are rendered inside the <Outlet />.
 */
export default function Layout() {
    return (
        <div className="flex min-h-screen bg-[#F9FAFB]">
            <Sidebar />
            <main className="flex-1 ml-64 p-6 min-h-screen">
                <Outlet />
            </main>
        </div>
    )
}
