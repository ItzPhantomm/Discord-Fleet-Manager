import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Radio, 
  Brain, 
  Settings,
  ChevronLeft,
  Menu,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bots', label: 'Bots', icon: Bot },
  { path: '/monitors', label: 'Monitors', icon: Radio },
  { path: '/intelligence', label: 'Intelligence', icon: Brain },
  { path: '/settings', label: 'Settings', icon: Settings }
] as const;

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-phantom-bg flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-phantom-surface border-r border-phantom-border
          transition-all duration-300 ease-spring
          ${collapsed ? 'w-16' : 'w-64'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b border-phantom-border ${collapsed ? 'justify-center' : ''}`}>
            {!collapsed && (
              <NavLink to="/" className="flex items-center gap-2" aria-label="Phantom Fleet Manager">
                <div className="w-8 h-8 rounded-lg bg-phantom-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-phantom-bg" />
                </div>
                <span className="font-semibold text-phantom-text text-balance">Phantom Fleet</span>
              </NavLink>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn-ghost p-2 lg:hidden"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronLeft className="w-5 h-5 rotate-180" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-150 ease-spring
                    ${isActive 
                      ? 'bg-phantom-primary/10 text-phantom-primary border-l-2 border-phantom-primary' 
                      : 'text-phantom-textMuted hover:bg-phantom-surfaceHover hover:text-phantom-text'}
                    ${collapsed ? 'justify-center' : ''}
                    ${!collapsed ? 'group' : ''}
                  `}
                  title={collapsed ? label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="font-medium text-sm">{label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-phantom-border">
            {!collapsed && (
              <div className="text-xs text-phantom-textDim text-center">
                v0.0.1 • <span className="text-phantom-primary">Phantom</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden h-16 px-4 bg-phantom-surface border-b border-phantom-border flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost p-2"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-phantom-text">Phantom Fleet</span>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}