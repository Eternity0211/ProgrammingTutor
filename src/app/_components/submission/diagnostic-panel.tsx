import { SymbolicIssue } from "@/lib/types/symbolic-types";
import { formatCausalFeedback } from "@/lib/utils";
import {
  AlertCircle,
  Lightbulb,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";

interface Props {
  issues: SymbolicIssue[];
  aiFeedback?: string;
  onSelectIssue: (id: string) => void;
  onTraceKnowledge: (concept: string) => void;
  className?: string;
}

export default function DiagnosticPanel({
  issues,
  aiFeedback,
  onSelectIssue,
  onTraceKnowledge,
  className,
}: Props) {
  return (
    <div
      className={`space-y-6 overflow-y-auto h-full p-4 bg-[#1e1e1e] text-gray-200 custom-scrollbar ${className}`}
    >
      {/* 1. 符号引擎诊断结果列表 */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center text-gray-400">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
          符号逻辑诊断 ({issues.length})
        </h3>

        <div className="space-y-3">
          {issues.map((issue, idx) => (
            <div
              key={`${issue.ruleId}-${idx}`}
              className="group p-4 bg-[#252526] border border-gray-800 rounded-lg hover:border-blue-500/50 cursor-pointer transition-all duration-200 shadow-sm"
              onClick={() => onSelectIssue(issue.ruleId)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1">
                  {/* RuleID & 教学标签 */}
                  <span className="text-[10px] font-mono text-blue-400 opacity-80">
                    {issue.ruleId}
                  </span>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {issue.display_name || "未定义错误名称"}
                  </h4>
                </div>
                {/* 严重程度标签 */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    issue.severity === "Critical"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  }`}
                >
                  L{issue.location.line} : {issue.severity}
                </span>
              </div>

              {/* 错误描述 - 限制直接给出修正代码，强调逻辑缺陷 */}
              <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
                {issue.description}
              </p>

              <div className="flex items-center gap-2">
                {/* 知识溯源按钮 */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-[11px] bg-[#323233] hover:bg-[#3e3e3f] text-gray-300 border-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTraceKnowledge(issue.knowledge_concept);
                  }}
                >
                  <GraduationCap className="w-3 h-3 mr-1.5" />
                  知识溯源
                </Button>

                <span className="text-[10px] text-gray-600 italic ml-auto group-hover:text-blue-400 transition-colors flex items-center">
                  定位代码 <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 神经侧因果反馈 (Neuro-Causal Feedback) */}
      {aiFeedback && (
        <section className="mt-8 border-t border-gray-800 pt-6">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 shadow-inner">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center text-blue-400">
              <Lightbulb className="w-4 h-4 mr-2" />
              AI 神经侧因果推导反馈
            </h3>

            <div className="text-sm leading-relaxed text-gray-300 space-y-4">
              {/* formatCausalFeedback 内部应解析 markdown 格式：
                "错误根源"、"逻辑推导"、"修正思路" 
              */}
              <div className="prose prose-invert prose-sm max-w-none">
                {formatCausalFeedback(aiFeedback)}
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
              <p className="text-[10px] text-yellow-500/70 flex items-center italic">
                <AlertCircle className="w-3 h-3 mr-1" />
                提示：此反馈侧重于原理解析，请根据逻辑推导自主修正代码。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 自定义滚动条样式 */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
