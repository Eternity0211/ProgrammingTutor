import Link from "next/link";
import { Code, Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card flex justify-center">
      <div className="container py-12 md:py-16 px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg  bg-primary-button  hover:bg-main-700">
                <Code className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-medium text-foreground">
                gradeIT
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Empowering educators and students with intuitive coding education
              tools designed with precision and care.
            </p>
            <div className="mt-4 flex space-x-4">
              <Link
                href="https://twitter.com/habee1_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link
                href="https://github.com/Habeel-Shamsudeen/GradeIt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link
                href="https://www.linkedin.com/in/habeel-shamsudeen/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
              <Link
                href="mailto:habeel8075@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Link>
            </div>
            <p className="text-center text-sm text-muted-foreground md:text-left mt-2">
              &copy; {new Date().getFullYear()} gradeIT. All rights reserved.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Product
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                "Features",
                "Pricing",
                "Integrations",
                "Changelog",
                "Documentation",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Company
            </h3>
            <ul className="space-y-2 text-sm">
              {["About", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Privacy Policy",
                "Terms of Service",
                "Cookie Policy",
                "GDPR",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-center mt-20 text-5xl md:text-9xl lg:text-[12rem] xl:text-[13rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 dark:from-neutral-950 to-neutral-200 dark:to-neutral-800 inset-x-0 ">
          GradeIt
        </p>
      </div>
    </footer>
  );
}
