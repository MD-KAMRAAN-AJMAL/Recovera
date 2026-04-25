"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutGrid, ScrollText, Search, MoreHorizontal, GitBranch, GitCommit,
  Plus, ChevronDown, AlignJustify, BarChart2
} from "lucide-react";

const MOCK_PROJECTS = [
  {
    id: 1,
    name: "my-api-service",
    url: "my-api-service.recovera.app",
    repo: "priyanshu8023/my-api-service",
    lastCommit: "Initial commit",
    commitDate: "Jan 25",
    branch: "main",
  },
];

export default function Dashboard() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const name = session?.user?.name ?? "User";

  const filtered = MOCK_PROJECTS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white pt-20 px-8 max-w-6xl mx-auto">

      {/* Top Bar */}
      <div className="flex items-center justify-between py-5 border-b border-white/8 mb-6">
        <h1 className="text-lg font-semibold text-white">All Projects</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64 bg-zinc-900 border border-white/8 text-sm text-white rounded-lg pl-9 pr-4 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>

          {/* View toggles */}
          <button className="p-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
            <AlignJustify className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-2 border rounded-lg transition-colors ${view === "grid" ? "border-white/20 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 border rounded-lg transition-colors ${view === "list" ? "border-white/20 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}
          >
            <ScrollText className="w-4 h-4" />
          </button>

          {/* Add New */}
          <Link
            href="/dashboard/import"
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-all active:scale-95 shadow-sm"
          >
            Add New
            <ChevronDown className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <p className="text-sm font-semibold text-white mb-4">Projects</p>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/60 border border-white/8 rounded-xl p-12 flex flex-col items-center text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Plus className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No projects yet</p>
            <p className="text-xs text-zinc-500 mb-6 max-w-xs">
              Import a Git repository to start monitoring it with Recovera's autonomous SRE engine.
            </p>
            <Link
              href="/dashboard/import"
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-100 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Repository
            </Link>
          </motion.div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-3 gap-3" : "space-y-2"}>
            {filtered.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-zinc-900/60 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-xs font-bold">
                      {project.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{project.name}</p>
                      <p className="text-xs text-zinc-500">{project.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <BarChart2 className="w-2.5 h-2.5 text-zinc-400" />
                    </div>
                    <button className="p-1 hover:bg-white/5 rounded">
                      <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3 h-3" />
                    <span className="truncate">{project.repo}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GitCommit className="w-3 h-3" />
                    <span>{project.lastCommit}</span>
                    <span className="text-zinc-600">·</span>
                    <span>{project.commitDate} on <span className="font-mono">{project.branch}</span></span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add new card */}
            <Link
              href="/dashboard/import"
              className="bg-zinc-900/30 border border-dashed border-white/10 rounded-xl p-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-white/20 hover:bg-white/[0.03] transition-all min-h-[100px]"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add new repo</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
