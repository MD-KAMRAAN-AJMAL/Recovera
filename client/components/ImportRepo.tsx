"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, GitBranch, Star, Lock, Globe, ChevronRight, Check,
  RefreshCw, AlertCircle, BookOpen, Loader2, ArrowLeft
} from "lucide-react";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  stars: number;
  isPrivate: boolean;
  language: string | null;
  updatedAt: string;
  defaultBranch: string;
  htmlUrl: string;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-yellow-300",
  Go: "bg-cyan-400",
  Rust: "bg-orange-500",
  Java: "bg-red-400",
  "C++": "bg-pink-500",
  Ruby: "bg-red-500",
  Dart: "bg-sky-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  return `${mins}m ago`;
}

export default function ImportRepo() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState<number | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/github/repos")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else { setRepos(data); }
      })
      .catch(() => setError("Could not connect to GitHub. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(query.toLowerCase()))
  );

  const handleImport = (id: number) => {
    setImporting(id);
    setTimeout(() => {
      setImporting(null);
      setImported(id);
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full px-6 py-10 flex justify-center">
      <div className="w-full max-w-2xl">

        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Step 1 of 2</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Import Git Repository</h1>
          <p className="text-zinc-400 text-sm">Select a repository to connect it with Recovera's autonomous SRE engine.</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative mb-4"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search repositories…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
          />
        </motion.div>

        {/* Repo List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-zinc-900/60 border border-white/8 rounded-xl overflow-hidden divide-y divide-white/5"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <p className="text-sm">Fetching your repositories from GitHub…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <p className="text-xs text-zinc-600 text-center max-w-xs">Please sign out, then sign back in to grant the required GitHub permissions.</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
              <BookOpen className="w-8 h-8 opacity-40" />
              <p className="text-sm">No repositories found.</p>
            </div>
          )}

          <AnimatePresence>
            {!loading && !error && filtered.map((repo, i) => {
              const isImporting = importing === repo.id;
              const isImported = imported === repo.id;

              return (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.035 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      {repo.isPrivate
                        ? <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        : <Globe className="w-3.5 h-3.5 text-zinc-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-white truncate">{repo.name}</span>
                        {repo.isPrivate && (
                          <span className="text-[10px] font-medium text-zinc-500 border border-white/10 rounded-full px-1.5 py-0.5 leading-none">Private</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${LANG_COLORS[repo.language] ?? "bg-zinc-500"}`} />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{repo.defaultBranch}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars}</span>
                        <span>{timeAgo(repo.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => !isImported && handleImport(repo.id)}
                    disabled={isImporting || isImported || imported !== null}
                    className={`flex-shrink-0 ml-4 flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${
                      isImported
                        ? "bg-green-500/10 text-green-400 border border-green-500/20 cursor-default"
                        : isImporting
                        ? "bg-white/5 text-zinc-400 border border-white/10 cursor-not-allowed"
                        : imported !== null
                        ? "bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed opacity-40"
                        : "bg-white text-black hover:bg-zinc-100 shadow-sm border border-white/20"
                    }`}
                  >
                    {isImported ? <><Check className="w-3 h-3" /> Imported</>
                      : isImporting ? <><RefreshCw className="w-3 h-3 animate-spin" /> Importing…</>
                        : <>Import <ChevronRight className="w-3 h-3" /></>}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Success Banner */}
        <AnimatePresence>
          {imported !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4"
            >
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-300">
                  Successfully imported <span className="text-white">{repos.find(r => r.id === imported)?.name}</span>
                </p>
                <p className="text-xs text-green-500/70 mt-0.5">Recovera is now monitoring this repository for incidents.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && repos.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center gap-1.5 text-xs text-zinc-600"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Showing {repos.length} repositories from your GitHub account.
          </motion.p>
        )}
      </div>
    </div>
  );
}
