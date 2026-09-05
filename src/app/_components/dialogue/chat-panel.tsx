"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/app/_components/ui/button";
import { Textarea } from "@/app/_components/ui/textarea";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/_components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/app/_components/ui/dialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  intent?: string;
}

interface SessionItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

const isDev = process.env.NODE_ENV === "development";
const STORAGE_SESSION_ID = "dialogue_active_session_id";

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
  const [sessionList, setSessionList] = useState<SessionItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SessionItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }, []);

  const updateUrlSession = useCallback((sid: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("session", sid);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const fetchAllSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/dialogue/sessions");
      if (!res.ok) throw new Error("fetch sessions fail");
      const json = await res.json();
      setSessionList(json ?? []);
    } catch (e) {
      console.error("拉取会话列表失败", e);
    }
  }, []);

  // ✅修正接口路径：新建会话 POST /api/dialogue/sessions
  const createFreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/dialogue/sessions", { method: "POST" });
      const json = await res.json();
      const sid = json.id;
      setSessionId(sid);
      localStorage.setItem(STORAGE_SESSION_ID, sid);
      updateUrlSession(sid);
      setMessages([]);
      setError(null);
      await fetchAllSessions();
    } catch (e) {
      setError("创建会话失败");
      console.error(e);
    }
  }, [fetchAllSessions, updateUrlSession]);

  // ✅修正接口路径：加载历史会话 GET /api/dialogue/{sid}
  const loadHistory = useCallback(async (sid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/dialogue/${sid}`);
      if (!res.ok) return false;
      const json = await res.json();
      setSessionId(sid);
      localStorage.setItem(STORAGE_SESSION_ID, sid);
      updateUrlSession(sid);
      if (json.messages) {
        const mapped: ChatMessage[] = json.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
      return true;
    } catch (err) {
      console.error("加载会话历史失败", err);
      return false;
    }
  }, [updateUrlSession]);

  useEffect(() => {
    const init = async () => {
      await fetchAllSessions();
      const urlParams = new URLSearchParams(window.location.search);
      const urlSid = urlParams.get("session");
      const cachedSid = localStorage.getItem(STORAGE_SESSION_ID);
      const sid = urlSid ?? cachedSid;
      if (sid) {
        const success = await loadHistory(sid);
        if (!success) {
          await createFreshSession();
        }
      } else {
        await createFreshSession();
      }
    };
    init();
  }, [createFreshSession, loadHistory, fetchAllSessions]);

  useEffect(() => {
    scrollBottom();
  }, [messages, scrollBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !sessionId) return;

    setError(null);
    setLoading(true);
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // 调用对话后端接口获取AI回复（orchestrator 自动保存消息到数据库）
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
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        intent: data.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await fetchAllSessions();
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
  }, [input, loading, sessionId, scrollBottom, fetchAllSessions]);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/dialogue/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setDeleteTarget(null);
      await fetchAllSessions();
      if (deleteTarget.id === sessionId) {
        await createFreshSession();
      }
    } catch (e) {
      setError("删除会话失败");
      console.error(e);
    }
  }, [deleteTarget, sessionId, fetchAllSessions, createFreshSession]);

  return (
    <div className="border rounded-lg flex flex-col h-full">
      {/* 头部，按钮居右上角，px‑4保证和内容左右对齐 */}
      <div className="flex items-center justify-end px-4 py-2 border-b">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                <span className="text-base">历史记录</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 max-h-[400px] overflow-y-auto p-2">
              <p className="text-sm text-muted-foreground pb-2">会话列表</p>
              {sessionList.length === 0 ? (
                <p className="text-sm">暂无会话</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {sessionList.map((sess) => (
                    <div key={sess.id} className="flex items-center gap-1">
                      <Button
                        variant={sess.id === sessionId ? "default" : "ghost"}
                        size="sm"
                        className="flex-1 justify-start h-auto py-1.5"
                        onClick={() => loadHistory(sess.id)}
                      >
                        {sess.title ?? formatDate(sess.createdAt)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1.5 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(sess)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button variant="secondary" size="sm" onClick={createFreshSession}>
            <span className="text-base">新建对话</span>
          </Button>
        </div>
      </div>

      {/* 消息区域 flex‑1占剩余高度，滚动 */}
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
              msg.role === "user" ? "items-end" : "items-start"
            )}
          >
            {isDev && msg.intent && msg.role === "assistant" && (
              <Badge variant="secondary" className="text-xs">
                {INTENT_LABELS[msg.intent] ?? msg.intent}
              </Badge>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  components={{
                    pre: ({ children }) => (
                      <pre className="bg-background/50 p-2 rounded overflow-x-auto text-xs my-2">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children }) => {
                      if (className) {
                        return <code className="text-xs">{children}</code>;
                      }
                      return (
                        <code className="bg-background/50 px-1 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-4 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-4 mb-2">{children}</ol>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-base font-bold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-1">{children}</h3>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-1">
            <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
              </span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {error && (
        <div className="px-4 text-xs text-destructive">错误：{error}</div>
      )}

      <div className="flex gap-2 items-end border-t p-4">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题…"
          rows={1}
          disabled={loading || !sessionId}
          className="flex-1 resize-none min-h-[40px] max-h-[120px]"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim() || !sessionId}>
          发送
        </Button>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确认删除此会话？删除后无法恢复，所有对话记录将被清除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">取消</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
