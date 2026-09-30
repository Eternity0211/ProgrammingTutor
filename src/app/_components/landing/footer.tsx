import Link from "next/link";
import { Code, Github } from "lucide-react";

const footerLinkClass =
  "text-muted-foreground hover:text-foreground transition-colors";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="flex justify-center border-t border-border bg-card"
    >
      <div className="container px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-button hover:bg-main-700">
                <Code className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-medium text-foreground">
                gradeIT
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Empowering educators and students with grounded feedback and
              reliable coding evaluation.
            </p>
            <div className="mt-4 flex space-x-4">
              <Link
                href="https://github.com/Eternity0211/ProgrammingTutor"
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground md:text-left">
              &copy; {new Date().getFullYear()} gradeIT. All rights reserved.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Product
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className={footerLinkClass}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className={footerLinkClass}>
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/Eternity0211/ProgrammingTutor#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Project
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#contact" className={footerLinkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/Eternity0211/ProgrammingTutor/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  Report an issue
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLinkClass}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="inset-x-0 mt-20 bg-gradient-to-b from-neutral-50 to-neutral-200 bg-clip-text text-center text-5xl font-bold text-transparent dark:from-neutral-950 dark:to-neutral-800 md:text-9xl lg:text-[12rem] xl:text-[13rem]">
          GradeIt
        </p>
      </div>
    </footer>
  );
}
