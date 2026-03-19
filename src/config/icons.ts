"use client";

import {
  HugeiconsIcon,
  UserAccountIcon,
  SchoolIcon,
  CalculatorIcon,
  Atom01Icon,
  TestTube01Icon,
  Chemistry01Icon,
  UniversityIcon,
  LibrariesIcon,
  Notebook01Icon,

  // 新增图标
  CodeIcon,
  DatabaseIcon,
  SoftwareIcon,
  Sorting01Icon,
  AlgorithmIcon,
  CpuIcon,
  HierarchyIcon,
  GitBranchIcon,
  Structure02Icon,
  WorkflowCircle01Icon,
  FileCloudIcon,
  Configuration01Icon,
  Task01Icon,
  Layers01Icon,
  LicenseIcon,
  AiBrain01Icon,
  AiProgrammingIcon,
  AiChat01Icon,
  Bug01Icon,
  CheckListIcon,
  BookOpen01Icon,
} from "hugeicons-react";

const iconComponentMap: Record<string, HugeiconsIcon> = {
  CalculatorIcon: CalculatorIcon as HugeiconsIcon,
  Atom01Icon: Atom01Icon as HugeiconsIcon,
  TestTubeIcon: TestTube01Icon as HugeiconsIcon,
  Chemistry01Icon: Chemistry01Icon as HugeiconsIcon,
  SchoolIcon: SchoolIcon as HugeiconsIcon,
  UniversityIcon: UniversityIcon as HugeiconsIcon,
  LibraryIcon: LibrariesIcon as HugeiconsIcon,
  NotebookIcon: Notebook01Icon as HugeiconsIcon,
  UserAccountIcon: UserAccountIcon as HugeiconsIcon,

  // 新增映射
  CodeIcon: CodeIcon as HugeiconsIcon,
  CppBasics: CodeIcon as HugeiconsIcon,
  DatabaseIcon: DatabaseIcon as HugeiconsIcon,
  MemoryManagement: DatabaseIcon as HugeiconsIcon,
  ConsoleApp: SoftwareIcon as HugeiconsIcon,
  AlgorithmIcon: Sorting01Icon as HugeiconsIcon,
  Algorithm: AlgorithmIcon as HugeiconsIcon,
  Compiling: CpuIcon as HugeiconsIcon,
  OopConcepts: HierarchyIcon as HugeiconsIcon,
  DataStructureIcon: HierarchyIcon as HugeiconsIcon,
  MultiThreading: GitBranchIcon as HugeiconsIcon,
  DataStructure: Structure02Icon as HugeiconsIcon,
  Recursion: WorkflowCircle01Icon as HugeiconsIcon,
  FileHandling: FileCloudIcon as HugeiconsIcon,
  SettingsIcon: Configuration01Icon as HugeiconsIcon,
  AssignmentIcon: Task01Icon as HugeiconsIcon,
  MemoryIcon: Layers01Icon as HugeiconsIcon,
  StandardIcon: LicenseIcon as HugeiconsIcon,
  StlLibrary: LibrariesIcon as HugeiconsIcon,

  AiBrainIcon: AiBrain01Icon as HugeiconsIcon,
  AiProgrammingIcon: AiProgrammingIcon as HugeiconsIcon,
  AiChatIcon: AiChat01Icon as HugeiconsIcon,
  BugIcon: Bug01Icon as HugeiconsIcon,
  CheckListIcon: CheckListIcon as HugeiconsIcon,
  BookOpenIcon: BookOpen01Icon as HugeiconsIcon,
};

export const getIconComponent = (iconName: string): HugeiconsIcon => {
  return iconComponentMap[iconName];
};
