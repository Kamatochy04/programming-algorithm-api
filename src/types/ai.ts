export interface TogetherAIResponse {
  choices: {
    message: {
      content?: string;
    };
  }[];
}

export interface Task {
  title: string;
  description: string;
  examples: { input: string; output: string }[];
  constraints: string[];
  difficulty: string;
}

export interface CodeCheckResult {
  isCorrect: boolean;
  feedback?: string;
  optimizationTips?: string[];
}
