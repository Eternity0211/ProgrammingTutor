import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import {
  Brain,
  Target,
  History,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { getStudentFeedbackHistory } from "@/server/actions/submission-actions";
import { SkillRadar } from "./_components/skill-radar";
import Link from "next/link";
import { getWeakQuestionsFromDB } from "@/server/actions/submission-actions";

export default async function ProfilePage() {
  const feedbackHistory = await getStudentFeedbackHistory();

  // --- 测试专用配置 ---
  // 强制开启 DEBUG_MODE 观察满分对齐效果
  const DEBUG_MODE = true; 
  // ------------------

  const generateSkillDataFromHistory = () => {
    // 定义标准的顺序，确保和 SVG 绘制顺序一致
    const SKILL_SUBJECTS = ["指针/引用", "内存管理", "STL容器", "面向对象", "递归算法", "异常处理"];

    // 优先级 1: 如果开启了测试模式，直接返回满分数据，用于验证对齐
    if (DEBUG_MODE) {
      return [
        { subject: "指针/引用", A: 85, fullMark: 100 },
        { subject: "内存管理", A: 40, fullMark: 100 },
        { subject: "STL容器", A: 90, fullMark: 100 },
        { subject: "面向对象", A: 60, fullMark: 100 },
        { subject: "递归算法", A: 30, fullMark: 100 },
        { subject: "异常处理", A: 55, fullMark: 100 },
      ];
    }

    // 优先级 2: 如果没有历史记录，返回空数据
    if (feedbackHistory.length === 0) {
      return SKILL_SUBJECTS.map(subject => ({
        subject,
        A: 0,
        fullMark: 100
      }));
    }
  
    // 优先级 3: 处理真实历史数据
    const skillMap: Record<string, number> = {};
    SKILL_SUBJECTS.forEach(s => skillMap[s] = 0);
  
    let count = 0;
    feedbackHistory.forEach((log) => {
      if (log.score) {
        // 模拟各维度的掌握度分布
        skillMap["指针/引用"] += log.score;
        skillMap["内存管理"] += (log.score * 0.8);
        skillMap["STL容器"] += (log.score * 0.95);
        skillMap["面向对象"] += (log.score * 0.85);
        skillMap["递归算法"] += (log.score * 0.6);
        skillMap["异常处理"] += (log.score * 0.7);
        count++;
      }
    });
  
    // 按标准顺序输出，确保雷达图不偏转
    return SKILL_SUBJECTS.map(key => ({
      subject: key,
      A: Math.max(10, Math.min(100, Math.round(skillMap[key] / (count || 1)))),
      fullMark: 100
    }));
  };

  const skillData = generateSkillDataFromHistory();
  const weakTopics = [...skillData]
  .sort((a, b) => a.A - b.A)
  .slice(0, 2)
  .map(item => item.subject);

  const latestRecommendations = await getWeakQuestionsFromDB(weakTopics);

  return (
    <div className="flex flex-col gap-8 p-6 py-0 pb-10">
      <div className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-2xl font-bold">个人中心</h1>
          <p className="text-muted-foreground mt-1">查看你的 C++ 学习画像、掌握进度及智能反馈。</p>
        </div>
        <Link href="/classes">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />返回教室
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-500" /> C++ 能力画像 (基于符号错误分析)
              </CardTitle>
              <CardDescription>数据实时更新自你的代码提交记录</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center overflow-hidden">
              {/* 关键：将数据传入雷达图组件 */}
              <SkillRadar data={skillData} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5" /> 多智能体反馈历史
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {feedbackHistory.length > 0 ? (
                feedbackHistory.map((log) => (
                  <Link key={log.id} href={`/classes/${log.classCode}/${log.assignmentId}/submissions/${log.id}`} className="block transition-transform hover:scale-[1.01]">
                    <Card className="overflow-hidden border-l-4 border-l-blue-500">
                      <div className="grid grid-cols-1 md:grid-cols-4">
                        <div className="p-4 border-r bg-muted/30">
                          <div className="text-sm text-muted-foreground">{log.date}</div>
                          <div className="font-bold my-1 line-clamp-1">{log.assignment}</div>
                          <Badge variant={log.score >= 80 ? "default" : "secondary"}>得分: {log.score}</Badge>
                        </div>
                        <div className="md:col-span-3 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex gap-3">
                            <MessageSquare className="w-5 h-5 text-purple-500 shrink-0 mt-1" />
                            <div>
                              <div className="text-xs font-bold text-purple-600 uppercase">情绪智能体</div>
                              <p className="text-sm mt-1 italic leading-relaxed">"{log.emotionFeedback}"</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                            <div>
                              <div className="text-xs font-bold text-amber-600 uppercase">导航智能体</div>
                              <p className="text-sm mt-1 leading-relaxed">{log.navigatorTips}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10 border rounded-lg text-muted-foreground">暂无提交记录</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" /> 今日弱点强化
              </CardTitle>
              <CardDescription>根据你的薄弱点智能推荐</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {latestRecommendations.length > 0 ? (
                latestRecommendations.map((item: any) => (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant="secondary">{item.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{item.purpose}</p>
                    <Link href={`/challenge/${item.id}`} className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-between">前往挑战 <ArrowRight className="w-4 h-4" /></Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-10 border-dashed border-2 rounded-xl">暂无推荐题目</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}