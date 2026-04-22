"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled
        ? "bg-black/80 backdrop-blur-md border-white/10 py-3"
        : "bg-transparent border-transparent py-5"
        }`}
    >
      <div className="w-full mx-auto px-6 max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="font-semibold text-lg text-white tracking-tighter flex items-center gap-2">
            <div className="w-5 h-5 bg-white rounded-[4px] flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
            </div>
            Recovera
          </div>

          <nav className="hidden md:flex gap-6">
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Products</a>
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Enterprise</a>
            <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Customers</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="hidden sm:block text-sm font-medium text-zinc-300 hover:text-white transition-colors pl-2">
            Log in
          </a>
          <a href="#" className="hidden sm:flex items-center justify-center px-4 py-1.5 text-sm font-medium text-black bg-white rounded-md hover:bg-zinc-200 transition-all active:scale-95 shadow-sm">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
