# LoRA 微调指令数据集构建

用于构建和转换 **LoRA / QLoRA 微调** 所需的指令格式数据，兼容常见框架（如 LLaMA-Factory、Alpaca、ShareGPT 等）。

## 数据格式说明

### 1. Alpaca / LLaMA-Factory

每条样本包含：

- `instruction`: 指令或问题
- `input`: 可选，补充输入（可为空）
- `output`: 模型期望的回答

```json
{"instruction": "用 Python 写一个求和函数", "input": "", "output": "def sum_list(lst):\n    return sum(lst)"}
```

### 2. ShareGPT（多轮对话）

```json
{
  "conversations": [
    {"from": "human", "value": "用 Python 写一个求和函数"},
    {"from": "gpt", "value": "def sum_list(lst):\n    return sum(lst)"}
  ]
}
```

## 快速开始

### 1. 安装依赖

```bash
cd instruction_dataset
pip install -r requirements.txt
```

### 2. 生成示例数据并构建

```bash
# 生成 raw 示例（data/raw_example.jsonl）
python create_sample_data.py

# 构建为 Alpaca 格式（默认输出 data/instruction_train.jsonl）
python build_dataset.py

# 指定原始数据与输出路径
python build_dataset.py --raw data/raw_example.jsonl -o data/instruction_train.jsonl -f alpaca

# 输出 ShareGPT 格式
python build_dataset.py --raw data/raw_example.jsonl -o data/sharegpt_train.jsonl -f sharegpt

# 使用配置文件
python build_dataset.py -c config.yaml --raw data/raw_example.jsonl -o data/instruction_train.jsonl
```

### 3. 使用配置文件

编辑 `config.yaml` 可设置：

- `output_format`: alpaca / sharegpt / llama_factory
- `output_file`: 默认输出路径
- `field_mapping`: 若你的原始数据字段名不同，在此做映射

## 自建数据

你的原始数据只需包含「指令」「输入」「输出」三类信息，键名可与 Alpaca 不同，在 `config.yaml` 的 `field_mapping` 中映射即可。例如：

```yaml
field_mapping:
  instruction: question
  input: context
  output: answer
```

原始文件可为：

- 每行一条 JSON 的 `.jsonl`
- 或整体为数组的 `.json`

## 与微调框架对接

- **LLaMA-Factory**：使用 `alpaca` 或 `llama_factory` 格式，在 dataset 配置里指向生成的 `instruction_train.jsonl`。
- **Hugging Face / PEFT**：通常先转为 Alpaca 或对话格式，再用 `datasets` 加载 JSONL 进行 tokenize 与训练。

生成后的 `data/instruction_train.jsonl` 可直接作为 LoRA 微调的指令数据集使用。
