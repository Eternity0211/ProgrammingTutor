import ChatPanel from "@/app/_components/dialogue/chat-panel";

export default function DialoguePage() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI 编程助手</h1>
        <p className="text-sm text-muted-foreground">
          向 AI 助手提问编程问题、提交代码审查、或寻求学习建议。
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}