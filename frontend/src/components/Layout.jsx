import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const location = useLocation()

    // Auto-close sidebar on mobile when route changes
    useEffect(() => {
        setIsMobileOpen(false)
    }, [location.pathname])

    // Prevent scrolling when mobile sidebar is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
    }, [isMobileOpen])

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <Sidebar
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onClose={() => setIsMobileOpen(false)}
            />

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} ml-0`}>
                <Header
                    toggleSidebar={() => setIsCollapsed(!isCollapsed)}
                    toggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
                    isSidebarCollapsed={isCollapsed}
                />
                <main className="flex-1 p-4 md:p-8 min-h-screen">
                    <div className="max-w-full mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
