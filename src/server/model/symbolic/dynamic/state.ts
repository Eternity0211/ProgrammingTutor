/**
 * @file state.ts
 * @description 动态分析引擎 - 符号状态环境 (Symbolic Environment)。
 * 核心设计涵盖：
 * 1. 状态追踪：覆盖内存初始化状态、数值区间边界及数组/集合容量等元数据。
 * 2. 区间格运算 (Interval Lattice)：为分支汇聚提供并集及交集支持。
 * 3. 固定点保障 (Widening Operator)：引入加宽机制以确保分析在循环条件下的有限时间收敛。
 * @module Symbolic/Dynamic/State
 */

// =============================================================================
// Data Structures | 抽象状态体系定义
// =============================================================================

/** 变量的安全生命周期与内存初始化状态 */
export enum InitState {
  UNINITIALIZED = "UNINITIALIZED", // 仅声明未赋值 (高危状态)
  INITIALIZED = "INITIALIZED",     // 已赋初始安全值
  NULL_PTR = "NULL_PTR",           // 指针被显式赋空
  TAINTED = "TAINTED"              // 数据存在污染标记 (如用户输入或溢出关联)
}

/** * 数学区间类 (Interval Lattice)
 * 作为数据流分析的基石，用于界定变量在运行期中可能的极值边界。
 */
export class Interval {
  constructor(public min: number, public max: number) {}

  /**
   * 并集评估 (Union)：合并不同控制流分支可能产生的所有边界情况 (May-Analysis)
   */
  public union(other: Interval): Interval {
    return new Interval(Math.min(this.min, other.min), Math.max(this.max, other.max));
  }

  /**
   * 交集评估 (Intersect)：运用数学约束进一步收敛已知范围界限 (Must-Analysis)
   */
  public intersect(other: Interval): Interval {
    return new Interval(Math.max(this.min, other.min), Math.min(this.max, other.max));
  }

  /**
   * 加宽算子 (Widening)：
   * 用于打破无限循环中的持续发散状态。通过比对新旧边界变化，
   * 强行将单边扩张延伸至无穷，确保整体固定点迭代分析的强制中止。
   */
  public widen(old: Interval): Interval {
    return new Interval(
      this.min < old.min ? -Infinity : old.min,
      this.max > old.max ? Infinity : old.max
    );
  }

  // --- 符号算术推导体系 ---
  
  public add(other: Interval): Interval {
    return new Interval(this.min + other.min, this.max + other.max);
  }

  public sub(other: Interval): Interval {
    return new Interval(this.min - other.max, this.max - other.min);
  }

  public mul(other: Interval): Interval {
    const vals = [
      this.min * other.min, this.min * other.max,
      this.max * other.min, this.max * other.max
    ];
    return new Interval(Math.min(...vals), Math.max(...vals));
  }

  /** 返回区间范围是否涵盖零点 */
  public containsZero(): boolean {
    return this.min <= 0 && this.max >= 0;
  }

  /** 用于固定点稳定性对比 */
  public equals(other: Interval): boolean {
    return this.min === other.min && this.max === other.max;
  }

  public toString(): string {
    const format = (n: number) => n === -Infinity ? "-Infinity" : (n === Infinity ? "Infinity" : n);
    return `[${format(this.min)}, ${format(this.max)}]`;
  }
}

/** 指针抽象追踪结构 */
export interface PointerState {
  canBeNull: boolean;
  canBeValid: boolean;
  possibleTargets: Set<string>; 
}

/** 针对容器类型边界及初始化的元数据追踪结构 */
export interface CollectionState {
  size: Interval;       
  elementInit: boolean; 
}

/** 变量实体的综合抽象状态包 */
export interface VarState {
  init: InitState;
  interval: Interval;
  type: string;                 
  pointer?: PointerState;       
  collection?: CollectionState; 
}

// =============================================================================
// Environment | 符号执行环境系统
// =============================================================================

/**
 * 符号环境总账本
 * 作为各个 CFG 节点的持久化记忆，汇总保留特定控制流断点的全部变量状态。
 */
export class Environment {
  private store: Map<string, VarState>;

  constructor(initialStore?: Map<string, VarState>) {
    this.store = initialStore ? new Map(initialStore) : new Map();
  }

  /** 向环境注册新变量并附带元数据初始化 */
  public declareVar(name: string, type: string, isArray: boolean = false, arraySize?: number) {
    const state: VarState = {
      init: InitState.UNINITIALIZED,
      interval: new Interval(-Infinity, Infinity),
      type,
    };
    if (isArray) {
      state.collection = {
        size: new Interval(arraySize ?? 0, arraySize ?? 0),
        elementInit: false
      };
    }
    this.store.set(name, state);
  }

  /** 配置单点确定的静态数值常量 */
  public setVal(name: string, val: number) {
    const state = this.store.get(name);
    if (state) {
      state.init = InitState.INITIALIZED;
      state.interval = new Interval(val, val);
    }
  }

  /** 安全获取记录区间，提供容错保障 */
  public getInterval(name: string): Interval {
    const state = this.store.get(name);
    return state?.interval || new Interval(-Infinity, Infinity);
  }

  /** 覆写变量的绝对区间状态 */
  public updateInterval(name: string, min: number, max: number) {
    const state = this.store.get(name);
    if (state) {
      state.interval = new Interval(min, max);
    }
  }

  public get(name: string): VarState | undefined {
    return this.store.get(name);
  }

  /**
   * 生成互不干扰的环境副本，防止多分支数据污染。
   */
  public clone(): Environment {
    const newStore = new Map<string, VarState>();
    for (const [k, v] of this.store.entries()) {
      newStore.set(k, {
        ...v,
        interval: new Interval(v.interval.min, v.interval.max),
        collection: v.collection ? { ...v.collection, size: new Interval(v.collection.size.min, v.collection.size.max) } : undefined,
        pointer: v.pointer ? { ...v.pointer, possibleTargets: new Set(v.pointer.possibleTargets) } : undefined
      });
    }
    return new Environment(newStore);
  }

  /**
   * 状态汇聚逻辑，贯彻降级容错机制 (May-Analysis 保守原则)。
   */
  public merge(other: Environment): Environment {
    for (const [name, otherVs] of other.store.entries()) {
      const thisVs = this.store.get(name);
      if (!thisVs) {
        this.store.set(name, other.clone().get(name)!);
        continue;
      }

      thisVs.init = this.pickMostDangerous(thisVs.init, otherVs.init);
      thisVs.interval = thisVs.interval.union(otherVs.interval);

      if (thisVs.collection && otherVs.collection) {
        thisVs.collection.size = thisVs.collection.size.union(otherVs.collection.size);
        thisVs.collection.elementInit = thisVs.collection.elementInit && otherVs.collection.elementInit;
      }
    }
    return this;
  }

  /** 根据危害等级动态筛选出高优先级状态 */
  private pickMostDangerous(a: InitState, b: InitState): InitState {
    const rank = { [InitState.UNINITIALIZED]: 3, [InitState.TAINTED]: 2, [InitState.NULL_PTR]: 1, [InitState.INITIALIZED]: 0 };
    return rank[a] >= rank[b] ? a : b;
  }

  /** 执行多环境等价比较，用于固定点终止确认 */
  public equals(other: Environment): boolean {
    if (this.store.size !== other.store.size) return false;
    for (const [k, v] of this.store.entries()) {
      const ov = other.store.get(k);
      if (!ov || v.init !== ov.init || !v.interval.equals(ov.interval)) return false;
    }
    return true;
  }
}