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
  BookOpen,
} from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import { getStudentFeedbackHistory } from "@/server/actions/submission-actions";
import { SkillRadar } from "./_components/skill-radar";
import Link from "next/link";
import { generateLearningNavigation } from "@/server/model/neural/navigationAgent";
import type { LearningPathStep, RecommendedExercise } from "@/server/model/neural/navigationAgent";
import { generateRealAbilityScore } from "@/server/model/neural/navigationAgent";

export default async function ProfilePage() {
  const feedbackHistory = await getStudentFeedbackHistory();

  // --- 测试专用配置 ---
  // 强制开启 DEBUG_MODE 观察满分对齐效果
  const DEBUG_MODE = true; 
  // ------------------

  const generateSkillDataFromHistory = () => {
    const SKILL_SUBJECTS = ["指针/引用", "内存管理", "STL容器", "面向对象", "递归算法", "异常处理"];

    // 初始满分100
    const skillMap: Record<string, number> = {
      "指针/引用": 100,
      "内存管理": 100,
      "STL容器": 100,
      "面向对象": 100,
      "递归算法": 100,
      "异常处理": 100,
    };

    // 无提交记录，返回初始值
    if (feedbackHistory.length === 0) {
      return SKILL_SUBJECTS.map((subject) => ({
        subject,
        A: 100,
        fullMark: 100,
      }));
    }

    // 关键词映射：根据反馈文本判断错误属于哪个知识点
    const keywordMap: Record<string, keyof typeof skillMap> = {
      "pointer": "指针/引用",
      "const_cast": "指针/引用",
      "reinterpret_cast": "指针/引用",
      "内存": "内存管理",
      "leak": "内存管理",
      "delete": "内存管理",
      "new": "内存管理",
      "stl": "STL容器",
      "vector": "STL容器",
      "list": "STL容器",
      "map": "STL容器",
      "class": "面向对象",
      "对象": "面向对象",
      "继承": "面向对象",
      "recursion": "递归算法",
      "递归": "递归算法",
      "base case": "递归算法",
      "边界条件": "递归算法",
      "try": "异常处理",
      "catch": "异常处理",
      "throw": "异常处理",
      "异常": "异常处理",
    };

    // 遍历每一条提交记录，根据反馈文本精准扣分
    feedbackHistory.forEach((log) => {
      const feedbackText = `${log.emotionFeedback} ${log.navigatorTips}`.toLowerCase();
      const score = log.score ?? 0;
      const baseDeduct = Math.min(20, (100 - score) / 5);

      // 匹配关键词，对应知识点扣分
      for (const [keyword, subject] of Object.entries(keywordMap)) {
        if (feedbackText.includes(keyword.toLowerCase())) {
          skillMap[subject] = Math.max(20, skillMap[subject] - baseDeduct);
        }
      }
    });

    // 按固定顺序返回，保证雷达图绘制正确
    return SKILL_SUBJECTS.map((key) => ({
      subject: key,
      A: Math.round(skillMap[key]),
      fullMark: 100,
    }));
  };


  const skillData = await generateSkillDataFromHistory();
  const weakTopics = [...skillData]
  .sort((a, b) => a.A - b.A)
  .slice(0, 2)
  .map(item => item.subject);

  const fullNavigation = await generateLearningNavigation({
    codeReviewResult: `学生薄弱点：${weakTopics.join("、")}`,
    knowledgeGraph: `C++ 6大维度知识图谱：指针/引用、内存管理、STL容器、面向对象、递归算法、异常处理`,
  });

  const learningPath = fullNavigation?.learning_navigation.learning_path || [];
  const latestRecommendations = fullNavigation?.learning_navigation.recommended_exercises || [];
  const weaknesses = fullNavigation?.learning_navigation.weaknesses || weakTopics;

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

        <div className="lg:col-span-1 space-y-6 sticky top-6 max-h-[calc(100vh-24px)] overflow-y-auto pr-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" /> AI 学习路径推荐
              </CardTitle>
              <CardDescription>针对你的薄弱点：{weaknesses.join("、")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {learningPath.length > 0 ? (
                learningPath.map((step: LearningPathStep) => (
                  <div key={step.step} className="p-3 border rounded-md border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">第 {step.step} 步：{step.topic}</p>
                      <Badge variant="outline" className="text-xs">{step.duration}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {step.resources.map((res, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{res}</Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">暂无学习路径</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" /> 今日弱点强化
              </CardTitle>
              <CardDescription>AI 推荐真实 LeetCode 练习题</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {latestRecommendations.length > 0 ? (
                latestRecommendations.map((item: RecommendedExercise) => (
                  <div key={item.id} className="p-4 border rounded-lg hover:bg-accent">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.title}</h4>
                      <Badge variant="secondary">{item.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{item.purpose}</p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        前往 LeetCode 挑战
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-10 border-dashed border-2 rounded-xl">暂无推荐</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}