#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LoRA 微调用指令数据集构建脚本

支持格式：
- Alpaca: {"instruction": "", "input": "", "output": ""}
- ShareGPT: {"conversations": [{"from": "human", "value": "..."}, {"from": "gpt", "value": "..."}]}
- LLaMA-Factory alpaca: 同 Alpaca，可指定 system
"""

import json
import os
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import yaml
except ImportError:
    yaml = None


# ---------- 格式定义 ----------

def to_alpaca(instruction: str, input_text: str = "", output: str = "") -> Dict[str, str]:
    """单条样本转为 Alpaca 格式（兼容 LLaMA-Factory）。"""
    return {
        "instruction": instruction.strip(),
        "input": (input_text or "").strip(),
        "output": output.strip(),
    }


def to_sharegpt(instruction: str, input_text: str = "", output: str = "") -> Dict[str, Any]:
    """单条样本转为 ShareGPT 多轮对话格式。"""
    user = instruction.strip()
    if input_text and input_text.strip():
        user = user + "\n\n" + input_text.strip()
    return {
        "conversations": [
            {"from": "human", "value": user},
            {"from": "gpt", "value": output.strip()},
        ]
    }


def to_llama_factory_alpaca(
    instruction: str,
    input_text: str = "",
    output: str = "",
    system: Optional[str] = None,
) -> Dict[str, Any]:
    """LLaMA-Factory 的 alpaca 格式（可带 system）。"""
    item = {
        "instruction": instruction.strip(),
        "input": (input_text or "").strip(),
        "output": output.strip(),
    }
    if system:
        item["system"] = system.strip()
    return item


# ---------- 读写 ----------

def load_json_or_jsonl(path: str) -> List[Dict]:
    """加载 .json 或 .jsonl 文件。"""
    path = Path(path)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        if path.suffix.lower() == ".jsonl":
            return [json.loads(line) for line in f if line.strip()]
        return json.load(f)


def save_jsonl(data: List[Dict], path: str, encoding: str = "utf-8") -> None:
    """保存为 JSONL（每行一条 JSON）。"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding=encoding) as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")


def save_json(data: List[Dict], path: str, encoding: str = "utf-8") -> None:
    """保存为单个 JSON 数组。"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding=encoding) as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------- 转换 ----------

def convert_to_format(
    samples: List[Dict],
    output_format: str,
    inst_key: str = "instruction",
    input_key: str = "input",
    output_key: str = "output",
    system_key: Optional[str] = "system",
) -> List[Dict]:
    """将通用键的样本列表转为目标格式。"""
    result = []
    for s in samples:
        inst = s.get(inst_key, "")
        inp = s.get(input_key, "")
        out = s.get(output_key, "")
        system = s.get(system_key) if system_key else None
        if output_format == "alpaca" or output_format == "llama_factory":
            result.append(to_llama_factory_alpaca(inst, inp, out, system))
        elif output_format == "sharegpt":
            result.append(to_sharegpt(inst, inp, out))
        else:
            result.append(to_alpaca(inst, inp, out))
    return result


# ---------- 主流程 ----------

def build_from_raw(
    raw_path: str,
    output_path: str,
    output_format: str = "alpaca",
    output_ext: str = "jsonl",
    encoding: str = "utf-8",
    field_mapping: Optional[Dict[str, str]] = None,
) -> int:
    """
    从已有 JSON/JSONL 原始数据构建指令集。
    若 raw 的键与 instruction/input/output 不一致，通过 field_mapping 映射。
    """
    raw = load_json_or_jsonl(raw_path)
    if not raw:
        print(f"未读取到数据: {raw_path}")
        return 0
    mapping = field_mapping or {}
    inst_key = mapping.get("instruction", "instruction")
    input_key = mapping.get("input", "input")
    output_key = mapping.get("output", "output")
    system_key = mapping.get("system", "system")
    converted = convert_to_format(
        raw, output_format,
        inst_key=inst_key, input_key=input_key, output_key=output_key,
        system_key=system_key if system_key else None,
    )
    if output_ext == "jsonl":
        save_jsonl(converted, output_path, encoding=encoding)
    else:
        save_json(converted, output_path, encoding=encoding)
    print(f"已写入 {len(converted)} 条 -> {output_path}")
    return len(converted)


def main():
    parser = argparse.ArgumentParser(description="构建 LoRA 微调指令数据集")
    parser.add_argument("--raw", type=str, help="原始数据路径 (.json / .jsonl)")
    parser.add_argument("--output", "-o", type=str, default="data/instruction_train.jsonl",
                        help="输出路径")
    parser.add_argument("--format", "-f", choices=["alpaca", "sharegpt", "llama_factory"],
                        default="alpaca", help="输出格式")
    parser.add_argument("--config", "-c", type=str, help="配置文件 (YAML)")
    parser.add_argument("--json", action="store_true", help="输出为 .json 而非 .jsonl")
    args = parser.parse_args()

    encoding = "utf-8"
    field_mapping = None
    if args.config and yaml and Path(args.config).exists():
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}
        encoding = cfg.get("encoding", encoding)
        field_mapping = cfg.get("field_mapping")

    raw_path = args.raw
    if not raw_path and args.config and yaml and Path(args.config).exists():
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f) or {}
        raw_path = cfg.get("raw_file")
    if not raw_path:
        # 若无 raw，则从示例数据构建
        example_dir = Path(__file__).parent / "data"
        raw_path = example_dir / "raw_example.jsonl"
        if not raw_path.exists():
            print("请提供 --raw 原始数据路径，或先运行 create_sample_data.py 生成示例。")
            return 1
        raw_path = str(raw_path)

    ext = "json" if args.json else "jsonl"
    n = build_from_raw(
        raw_path,
        args.output,
        output_format=args.format,
        output_ext=ext,
        encoding=encoding,
        field_mapping=field_mapping,
    )
    return 0 if n else 1


if __name__ == "__main__":
    exit(main())
