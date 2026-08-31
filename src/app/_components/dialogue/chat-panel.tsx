"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  intent?: string;
}

const isDev = process.env.NODE_ENV === "development";

const INTENT_LABELS: Record<string, string> = {
  CODE_SUBMISSION: "代码提交",
  EMOTIONAL_VENTING: "情绪倾诉",
  LEARNING_PATH_INQUIRY: "学习路径",
  KNOWLEDGE_QUESTION: "知识提问",
  THOUGHT_FOLLOWUP: "追问续写",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: data.reply,
          intent: data.intent,
        },
      ]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "请求失败";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: "抱歉，出现了错误。请稍后重试。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <Card className="flex h-[calc(100vh-12rem)] flex-col p-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-center">
              你好！我是 AI 编程助手，有什么可以帮你的？
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            {isDev && msg.intent && msg.role === "assistant" && (
              <Badge variant="secondary" className="text-xs">
                {INTENT_LABELS[msg.intent] ?? msg.intent}
              </Badge>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-1">
            <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                >
                  ·
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  ·
                </span>
              </span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {error && (
        <div className="px-4 pb-2 text-xs text-destructive">错误：{error}</div>
      )}

      <div className="flex gap-2 border-t p-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题…"
          rows={1}
          disabled={loading}
          className="resize-none min-h-[40px] max-h-[120px]"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="default"
        >
          发送
        </Button>
      </div>
    </Card>
  );
}
