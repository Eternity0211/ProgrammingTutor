"use client";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";

export function FullscreenAlert() {
  const handleEnterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md px-4"
      >
        <Card className="rounded-2xl border-border bg-background shadow-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Maximize2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-center text-xl">
              Fullscreen Required
            </CardTitle>
            <CardDescription className="text-center">
              This assignment requires fullscreen mode to prevent academic
              dishonesty.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4 text-center text-muted-foreground">
            <p>
              Please enter fullscreen mode to continue with your assignment.
              This helps maintain academic integrity by preventing access to
              unauthorized resources during the assessment.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button
              onClick={handleEnterFullscreen}
              className="gap-2 bg-primary-button text-white hover:bg-primary-button-hover"
            >
              <Maximize2 className="h-4 w-4" />
              Enter Fullscreen
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}
