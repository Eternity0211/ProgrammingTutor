"use client";
import { useState } from "react";
import { importKnowledgeDocsAction } from "@/server/actions/knowledge‑import‑actions";

export default function DebugImportKnowledgePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    count?: number;
    error?: string;
  }>(null);

  async function handleRunImport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await importKnowledgeDocsAction();
      setResult(res);
    } catch (err) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p‑8 max‑w‑2xl">
      <h1 className="text‑xl font‑bold mb‑4">知识库导入调试页面</h1>
      <button
        onClick={handleRunImport}
        disabled={loading}
        className="px‑4 py‑2 bg‑blue‑600 text‑white rounded disabled:opacity‑60"
      >
        {loading ? "正在导入……" : "执行导入 md 知识库"}
      </button>

      {result && (
        <div className="mt‑6 border p‑4 rounded">
          {result.ok ? (
            <div className="text‑green‑600">
              ✅导入完成，共 {result.count} 条文档分片写入数据库
            </div>
          ) : (
            <div className="text‑red‑600">❌失败：{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
