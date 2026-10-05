"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUserProfile } from "@/data/mockData";
import { useSidebar } from "@/components/layout/SidebarContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Courses", href: "/dashboard", icon: BookOpen },
  { name: "Plan Today", href: "/learn", icon: Compass },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "border-r border-zinc-200 bg-white flex flex-col h-screen sticky top-0 shrink-0 z-40 select-none transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-14" : "w-56"
      )}
    >
      {/* Permanent Brand Header: [C] stays fixed, text slides left */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-200 shrink-0 overflow-hidden">
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
          className="flex items-center gap-2.5 p-1 -ml-1 text-left cursor-pointer group focus:outline-none"
        >
          {/* Permanent Single Logo */}
          <div className="w-6 h-6 rounded-sm bg-zinc-900 group-hover:bg-zinc-800 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0 transition-colors">
            C
          </div>

          {/* Smooth sliding & fading Cognix text */}
          <span
            className={cn(
              "font-semibold text-sm tracking-tight text-zinc-900 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden",
              isCollapsed
                ? "w-0 opacity-0 -translate-x-3 pointer-events-none"
                : "w-auto opacity-100 translate-x-0"
            )}
          >
            Cognix
          </span>
        </button>
      </div>

      {/* Sliding Bottom Panel: Navigation + Profile */}
      <div
        className={cn(
          "flex-1 flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden w-56",
          isCollapsed
            ? "-translate-x-full opacity-0 pointer-events-none"
            : "translate-x-0 opacity-100"
        )}
      >
        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 text-[10px] font-mono rounded-xs",
                      isActive
                        ? "bg-zinc-800 text-zinc-200"
                        : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Glance */}
        <div className="p-3 border-t border-zinc-200 bg-zinc-50/50">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-zinc-100 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs border border-zinc-800">
              V
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 group-hover:text-black transition-colors truncate">
                Vitian
              </p>
              <p className="text-[10px] text-zinc-500 truncate font-mono">
                student@vitapstudent.ac.in
              </p>
            </div>
          </Link>
        </div>
      </div>
    </aside>

  );
};
