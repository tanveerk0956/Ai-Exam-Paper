
export interface ExamSettings {
  topic: string;
  className: string;
  board: string;
  studentName: string;
  language: string;
  totalMarks: number;
  duration: number; // in minutes
  mcqCount: number;
  shortCount: number;
  longCount: number;
}

export interface Question {
  type: 'mcq' | 'short' | 'long';
  text: string;
  options?: string[]; // For MCQs
  correctAnswer?: string; // For MCQs
}

export interface GeneratedExam {
  htmlContent: string;
}
    