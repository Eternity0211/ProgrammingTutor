"use client";
import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import { SymbolicIssue } from "@/lib/types/symbolic-types";
import { locationToMonacoRange } from "@/lib/utils";

interface Props {
  code: string;
  issues: SymbolicIssue[];
  selectedIssueId?: string;
}

export default function DiagnosticEditor({ code, issues, selectedIssueId }: Props) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // 修复1：正确的 onMount 回调，保存 editor 实例
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = { editor, monaco }; // 同时保存 editor 和 monaco 实例
    console.log("编辑器已挂载，issues 数量：", issues.length); // 调试：确认 issues 传进来了
  };

  // 修复2：完善高亮逻辑，兼容不同 severity，确保装饰器生效
  useEffect(() => {
    // 编辑器未挂载 或 无错误时，清除装饰器
    if (!editorRef.current || !issues.length) {
      if (decorationsRef.current.length) {
        editorRef.current?.editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      return;
    }

    const { editor, monaco } = editorRef.current;
    if (!editor || !monaco) return;

    // 生成错误装饰器配置
    const newDecorations = issues.map((issue) => {
      // 修复：确保 locationToMonacoRange 返回正确的 monaco.Range
      const range = locationToMonacoRange(issue.location);
      
      // 按 severity 区分高亮样式
      let bgColor = "bg-yellow-500/20"; // 默认 Medium/Low
      if (issue.severity === "Critical" || issue.severity === "High") {
        bgColor = "bg-red-500/20"; // Critical/High 用红色
      }

      return {
        range: new monaco.Range(
          range.startLineNumber,
          range.startColumn,
          range.endLineNumber || range.startLineNumber,
          range.endColumn || range.startColumn + 1
        ),
        options: {
          isWholeLine: true, // 整行高亮
          className: bgColor,
          glyphMarginClassName: issue.severity === "Critical" ? "text-red-500" : "text-yellow-500",
          hoverMessage: { 
            value: `**${issue.display_name}**\n\n${issue.message}\n\n修复建议：${issue.remediation || "无"}` 
          },
        },
      };
    });

    // 应用装饰器（清除旧的，添加新的）
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // 滚动到选中的错误
    if (selectedIssueId) {
      const selected = issues.find(i => i.ruleId === selectedIssueId);
      if (selected) {
        editor.revealLineInCenter(selected.location.line, monaco.editor.ScrollType.Smooth);
      }
    }

    // 组件卸载时清除装饰器
    return () => {
      if (editor && decorationsRef.current.length) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, [issues, selectedIssueId]);

  return (
    <div className="w-full h-full">
      {/* 修复：明确指定语言为 c++，确保语法高亮 */}
      <Editor
        height="100%" // 改成 100% 适配父容器
        width="100%"
        language="cpp" // 明确指定 c++ 语言
        theme="vs-dark"
        value={code}
        options={{ 
          readOnly: true, 
          minimap: { enabled: false }, 
          glyphMargin: true, // 显示左侧图标边距
          lineNumbers: "on", // 显示行号
          scrollBeyondLastLine: false,
          fontSize: 14,
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}