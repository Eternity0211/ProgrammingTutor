#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成示例指令数据（raw 格式），便于测试 build_dataset.py。
也可作为模板，按相同字段扩充你自己的数据。
"""

import json
from pathlib import Path


def get_example_samples():
    """返回示例 instruction/input/output 列表。"""
    return [
        {
            "instruction": "用 Python 写一个函数，计算列表中的最大值。",
            "input": "",
            "output": "def max_of_list(lst):\n    if not lst:\n        return None\n    return max(lst)",
        },
        {
            "instruction": "解释什么是 REST API，并给出一个 GET 请求的简单例子。",
            "input": "",
            "output": "REST API 是一种基于 HTTP 的接口设计风格。GET 用于获取资源。\n\n示例（Python requests）：\n  import requests\n  r = requests.get('https://api.example.com/users/1')\n  print(r.json())",
        },
        {
            "instruction": "将以下 JSON 中的空字符串字段过滤掉。",
            "input": '{"a": "hello", "b": "", "c": "world", "d": ""}',
            "output": '{"a": "hello", "c": "world"}',
        },
        {
            "instruction": "写一段 SQL，查询订单表中 2024 年每个月的订单总数。",
            "input": "表名: orders, 日期字段: created_at",
            "output": "SELECT\n  DATE_FORMAT(created_at, '%Y-%m') AS month,\n  COUNT(*) AS total_orders\nFROM orders\nWHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'\nGROUP BY month\nORDER BY month;",
        },
        {
            "instruction": "请用简洁的语言说明什么是 LoRA 微调。",
            "input": "",
            "output": "LoRA（Low-Rank Adaptation）是一种参数高效微调方法。它在原模型权重旁增加低秩矩阵，只训练这些新增参数，从而用较少显存和算力完成微调，适合指令微调、领域适配等场景。",
        },
    ]


def main():
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    raw_path = data_dir / "raw_example.jsonl"
    samples = get_example_samples()
    with open(raw_path, "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    print(f"已生成 {len(samples)} 条示例 -> {raw_path}")
    return 0


if __name__ == "__main__":
    exit(main())
