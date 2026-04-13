export type FeedbackCategory = 'bug' | 'suggestion' | 'recommendation' | 'general';

export interface FeedbackRequest {
  category: FeedbackCategory;
  message: string;
}

export interface FeedbackResponse {
  feedbackId: number;
}
