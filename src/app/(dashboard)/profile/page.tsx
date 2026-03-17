import React from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/app/_components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Brain, Target, History, MessageSquare, Lightbulb, ArrowRight } from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { getStudentFeedbackHistory } from "@/server/actions/submission-actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SkillRadar } from "./_components/skill-radar";
import Link from "next/link";

/**
const SkillRadar = dynamic(
  () => import("./_components/skill-radar").then((mod) => mod.SkillRadar),
  { ssr: false, loading: () => <div className="h-[350px] bg-muted animate-pulse rounded-lg" /> }
);

// --- Mock 数据 (待后端实现后替换) ---
const SKILL_DATA = [
  { subject: '指针/引用', A: 80, fullMark: 100 },
  { subject: '内存管理', A: 65, fullMark: 100 },
  { subject: 'STL容器', A: 90, fullMark: 100 },
  { subject: '面向对象', A: 70, fullMark: 100 },
  { subject: '递归算法', A: 55, fullMark: 100 },
  { subject: '异常处理', A: 40, fullMark: 100 },
];

const RECOMMENDATIONS = [
  { id: "1", title: "深度探索 C++ 内存对齐", difficulty: "中级", tags: ["内存管理", "性能优化"] },
  { id: "2", title: "递归转迭代：栈的应用", difficulty: "初级", tags: ["递归算法", "数据结构"] },
];

const FEEDBACK_HISTORY = [
  {
    id: "sub_1",
    date: "2024-03-20",
    assignment: "快速排序实现",
    status: "PARTIAL",
    score: 75,
    emotionFeedback: "检测到你在递归边界处理时有些迷茫。别担心，这是理解分治法的必经之路。",
    navigatorTips: "建议复习‘递归基准情形’，并尝试追踪 3 个元素的排序过程。",
  },
  {
    id: "sub_2",
    date: "2024-03-18",
    assignment: "智能指针练习",
    status: "COMPLETED",
    score: 100,
    emotionFeedback: "非常棒！你完美地处理了循环引用问题，展现了极高的自信。",
    navigatorTips: "你已掌握基础，可以挑战‘自定义删除器’的高级用法。",
  },
];

const RECOMMENDATIONS = [
  { id: "1", title: "深度探索 C++ 内存对齐", difficulty: "中级", tags: ["内存管理", "性能优化"] },
  { id: "2", title: "递归转迭代：栈的应用", difficulty: "初级", tags: ["递归算法", "数据结构"] },
];
*/

export default async function ProfilePage() {
  const feedbackHistory = await getStudentFeedbackHistory();

  const latestRecommendations = feedbackHistory.length > 0 
    ? feedbackHistory[0].recommendations 
    : [];

  return (
    <div className="flex flex-col gap-8 p-6 py-0 pb-10">
      <PageHeader
        heading="个人中心"
        text="查看你的 C++ 学习画像、掌握进度及智能反馈。"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧：可视化画像 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              C++ 能力画像 (基于符号错误分析)
            </CardTitle>
            <CardDescription>
              数据实时更新自你的代码提交记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 使用动态加载的组件 */}
            <SkillRadar />
          </CardContent>
        </Card>

        {/* 右侧：个性化推荐 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              今日弱点强化
            </CardTitle>
            <CardDescription>由导航智能体根据最近表现推荐</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {latestRecommendations.length > 0 ? (
              latestRecommendations.map((item: any) => (
                <div key={item.id} className="p-4 border rounded-lg hover:bg-accent cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{item.title}</h4>
                    <Badge variant="secondary">{item.difficulty}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    目的：{item.purpose}
                  </p>
                  <Button variant="ghost" size="sm" className="w-full justify-between group-hover:text-blue-500">
                    前往挑战 <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10 border-dashed border-2 rounded-xl">
                暂无推荐题目，快去完成一次练习吧！
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 下方：历史反馈与智能体分析 */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          多智能体反馈历史
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          {feedbackHistory.length > 0 ? (
            feedbackHistory.map((log) => (
              <Link 
                key={log.id} 
                href={`/classes/${log.classCode}/${log.assignmentId}/submissions/${log.id}`}
                className="block transition-transform hover:scale-[1.01] active:scale-95"
              >
              <Card key={log.id} className="overflow-hidden border-l-4 border-l-blue-500">
                <div className="grid grid-cols-1 md:grid-cols-4">
                  <div className="p-4 border-r bg-muted/30">
                    <div className="text-sm text-muted-foreground">{log.date}</div>
                    <div className="font-bold my-1 line-clamp-1">{log.assignment}</div>
                    <Badge variant={log.score >= 80 ? "default" : "secondary"}>
                      得分: {log.score}
                    </Badge>
                  </div>
                  
                  <div className="md:col-span-3 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Emotion Agent 输出 */}
                    <div className="flex gap-3">
                      <MessageSquare className="w-5 h-5 text-purple-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-xs font-bold text-purple-600 uppercase">Emotion Agent</div>
                        <p className="text-sm text-foreground mt-1 italic leading-relaxed">
                          "{log.emotionFeedback}"
                        </p>
                      </div>
                    </div>

                    {/* Navigation Agent 输出 */}
                    <div className="flex gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-xs font-bold text-amber-600 uppercase">Navigation Agent</div>
                        <p className="text-sm text-foreground mt-1 leading-relaxed">
                          {log.navigatorTips}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 border rounded-lg bg-muted/10 text-muted-foreground">
              暂无提交记录，开始你的第一个 C++ 挑战吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}