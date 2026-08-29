"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/app/_components/ui/button";
import { Code, Menu } from "lucide-react";
import ModeToggle from "./mode-toggle";

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg  bg-primary-button  hover:bg-main-700">
              <Code className="h-4 w-4 text-primary-foreground" />
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-foreground"
            >
              gradeIT
            </motion.span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground">
            <Link
              href="#features"
              className="relative group px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
            >
              <span className="relative z-10">Features</span>
              <motion.div
                className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={false}
                transition={{ duration: 0.2 }}
              />
            </Link>
            <Link
              href="#how-it-works"
              className="relative group px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
            >
              <span className="relative z-10">How It Works</span>
              <motion.div
                className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={false}
                transition={{ duration: 0.2 }}
              />
            </Link>
            <Link
              href="#contact"
              className="relative group px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
            >
              <span className="relative z-10">Contact</span>
              <motion.div
                className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={false}
                transition={{ duration: 0.2 }}
              />
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <div className="hidden sm:flex sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-border text-text hover:bg-muted hover:text-foreground"
              >
                <Link href="/classes">Log in</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="text-white bg-primary-button hover:bg-main-700"
              >
                <Link href="/classes">Sign up</Link>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="sm:hidden border-border"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden bg-background border-t border-border px-6 pb-4 pt-2 space-y-3"
            >
              <div className="flex flex-col gap-1">
                <Link
                  href="#features"
                  className="group relative px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
                >
                  <span className="relative z-10 font-medium">Features</span>
                  <motion.div
                    className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    initial={false}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
                <Link
                  href="#how-it-works"
                  className="group relative px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
                >
                  <span className="relative z-10 font-medium">
                    How It Works
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    initial={false}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
                <Link
                  href="#contact"
                  className="group relative px-3 py-2 rounded-md transition-all duration-200 hover:text-main-600 hover:bg-main-50 dark:hover:bg-main-900/20"
                >
                  <span className="relative z-10 font-medium">Contact</span>
                  <motion.div
                    className="absolute inset-0 bg-main-100 dark:bg-main-800/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    initial={false}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full border-border text-text hover:bg-muted hover:text-foreground"
                  asChild
                >
                  <Link href="/classes">Log in</Link>
                </Button>
                <Button
                  className="w-full text-white  bg-primary-button hover:bg-main-700"
                  asChild
                >
                  <Link href="/classes">Sign up</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
