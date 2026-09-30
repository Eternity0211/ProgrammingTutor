export const DEMO_DATA_VERSION = "2026.09.30-v1";

export const demoUsers = [
  {
    id: "demo-faculty-lin",
    name: "Lin Chen",
    email: "lin.faculty@gradeit.local",
    role: "FACULTY" as const,
  },
  {
    id: "demo-faculty-wang",
    name: "Wei Wang",
    email: "wang.faculty@gradeit.local",
    role: "FACULTY" as const,
  },
  {
    id: "demo-student-anna",
    name: "Anna Liu",
    email: "anna.student@gradeit.local",
    role: "STUDENT" as const,
  },
  {
    id: "demo-student-bo",
    name: "Bo Zhang",
    email: "bo.student@gradeit.local",
    role: "STUDENT" as const,
  },
  {
    id: "demo-student-cora",
    name: "Cora Li",
    email: "cora.student@gradeit.local",
    role: "STUDENT" as const,
  },
  {
    id: "demo-student-dan",
    name: "Dan Xu",
    email: "dan.student@gradeit.local",
    role: "STUDENT" as const,
  },
];

export const demoClasses = [
  {
    id: "demo-class-cpp",
    code: "DEMOCPP",
    name: "C++ Fundamentals",
    section: "2026-A",
    facultyEmail: "lin.faculty@gradeit.local",
    studentEmails: [
      "anna.student@gradeit.local",
      "bo.student@gradeit.local",
      "cora.student@gradeit.local",
    ],
  },
  {
    id: "demo-class-dsa",
    code: "DEMODSA",
    name: "Data Structures",
    section: "2026-B",
    facultyEmail: "lin.faculty@gradeit.local",
    studentEmails: ["anna.student@gradeit.local", "dan.student@gradeit.local"],
  },
  {
    id: "demo-class-algo",
    code: "DEMOALG",
    name: "Algorithms",
    section: "2026-A",
    facultyEmail: "wang.faculty@gradeit.local",
    studentEmails: [
      "bo.student@gradeit.local",
      "cora.student@gradeit.local",
      "dan.student@gradeit.local",
    ],
  },
];

export const demoAssignments = [
  {
    id: "demo-assignment-basics",
    classCode: "DEMOCPP",
    title: "Variables and Control Flow",
    description: "Practice safe arithmetic and branching.",
    dueOffsetDays: 7,
  },
  {
    id: "demo-assignment-pointers",
    classCode: "DEMOCPP",
    title: "Pointers and Memory",
    description: "Find and repair common pointer and ownership errors.",
    dueOffsetDays: 14,
  },
  {
    id: "demo-assignment-containers",
    classCode: "DEMODSA",
    title: "Stacks and Queues",
    description: "Implement fundamental linear data structures.",
    dueOffsetDays: 10,
  },
  {
    id: "demo-assignment-search",
    classCode: "DEMOALG",
    title: "Search Algorithms",
    description: "Compare linear and binary search behavior.",
    dueOffsetDays: 12,
  },
  {
    id: "demo-assignment-sorting",
    classCode: "DEMOALG",
    title: "Sorting and Complexity",
    description: "Implement sorting and reason about complexity.",
    dueOffsetDays: 20,
  },
];

export const demoQuestions = [
  {
    id: "demo-question-safe-divide",
    assignmentId: "demo-assignment-basics",
    classCode: "DEMOCPP",
    title: "Safe division",
    description:
      "Read two integers and print their quotient, or ERROR when the divisor is zero.",
    skillTopic: "control-flow",
    difficulty: "beginner",
    tests: [
      ["8 2", "4"],
      ["7 0", "ERROR"],
    ],
  },
  {
    id: "demo-question-pointer-sum",
    assignmentId: "demo-assignment-pointers",
    classCode: "DEMOCPP",
    title: "Pointer array sum",
    description:
      "Sum a dynamically allocated integer array without leaks or invalid access.",
    skillTopic: "memory-management",
    difficulty: "intermediate",
    tests: [
      ["3\n1 2 3", "6"],
      ["1\n-4", "-4"],
    ],
  },
  {
    id: "demo-question-balanced",
    assignmentId: "demo-assignment-containers",
    classCode: "DEMODSA",
    title: "Balanced brackets",
    description: "Use a stack to decide whether brackets are balanced.",
    skillTopic: "stack",
    difficulty: "beginner",
    tests: [
      ["([])", "YES"],
      ["([)]", "NO"],
    ],
  },
  {
    id: "demo-question-queue",
    assignmentId: "demo-assignment-containers",
    classCode: "DEMODSA",
    title: "Queue simulator",
    description: "Process push, pop, and front operations.",
    skillTopic: "queue",
    difficulty: "intermediate",
    tests: [["4\npush 3\nfront\npop\nfront", "3\nEMPTY"]],
  },
  {
    id: "demo-question-binary-search",
    assignmentId: "demo-assignment-search",
    classCode: "DEMOALG",
    title: "Binary search",
    description: "Return the index of a target in a sorted array, or -1.",
    skillTopic: "binary-search",
    difficulty: "beginner",
    tests: [
      ["5 7\n1 3 5 7 9", "3"],
      ["3 4\n1 2 3", "-1"],
    ],
  },
  {
    id: "demo-question-stable-sort",
    assignmentId: "demo-assignment-sorting",
    classCode: "DEMOALG",
    title: "Stable record sort",
    description: "Stably sort records by score.",
    skillTopic: "sorting",
    difficulty: "advanced",
    tests: [["3\na 2\nb 1\nc 2", "b 1\na 2\nc 2"]],
  },
];

export const demoConversations = [
  {
    id: "demo-chat-anna-pointers",
    userEmail: "anna.student@gradeit.local",
    title: "Understanding pointer ownership",
    messages: [
      {
        role: "user",
        content: "Why does deleting the same pointer twice crash?",
      },
      {
        role: "assistant",
        content:
          "After the first delete the pointer no longer owns a live object. A second delete is undefined behavior; set it to nullptr or use RAII.",
      },
    ],
  },
  {
    id: "demo-chat-bo-search",
    userEmail: "bo.student@gradeit.local",
    title: "Binary search boundary",
    messages: [
      {
        role: "user",
        content: "My binary search loops forever when the target is absent.",
      },
      {
        role: "assistant",
        content:
          "Check that each branch strictly shrinks the interval, for example high = mid - 1 and low = mid + 1.",
      },
    ],
  },
  {
    id: "demo-chat-cora-emotion",
    userEmail: "cora.student@gradeit.local",
    title: "Recovering from repeated failures",
    messages: [
      {
        role: "user",
        content: "I keep failing the hidden tests and feel stuck.",
      },
      {
        role: "assistant",
        content:
          "Let us narrow it down. Start with empty input, one element, duplicates, and boundary indices, then compare each expected result.",
      },
    ],
  },
];

export const demoProfiles = [
  {
    userEmail: "anna.student@gradeit.local",
    weakKnowledgePoints: ["memory-management", "pointer-ownership"],
  },
  {
    userEmail: "bo.student@gradeit.local",
    weakKnowledgePoints: ["binary-search", "boundary-conditions"],
  },
  {
    userEmail: "cora.student@gradeit.local",
    weakKnowledgePoints: ["testing", "edge-cases"],
  },
  {
    userEmail: "dan.student@gradeit.local",
    weakKnowledgePoints: ["complexity-analysis"],
  },
];

export const demoSubmissions = [
  {
    id: "demo-submission-anna-basics",
    studentEmail: "anna.student@gradeit.local",
    assignmentId: "demo-assignment-basics",
    questionId: "demo-question-safe-divide",
    status: "COMPLETED" as const,
    score: 100,
    code: '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;if(b==0)std::cout<<"ERROR";else std::cout<<a/b;}',
  },
  {
    id: "demo-submission-bo-basics",
    studentEmail: "bo.student@gradeit.local",
    assignmentId: "demo-assignment-basics",
    questionId: "demo-question-safe-divide",
    status: "PARTIAL" as const,
    score: 60,
    code: "#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a/b;}",
  },
  {
    id: "demo-submission-cora-pointers",
    studentEmail: "cora.student@gradeit.local",
    assignmentId: "demo-assignment-pointers",
    questionId: "demo-question-pointer-sum",
    status: "IN_PROGRESS" as const,
    score: 0,
    code: "#include <iostream>\nint main(){int n;std::cin>>n;int* a=new int[n];return 0;}",
  },
];
