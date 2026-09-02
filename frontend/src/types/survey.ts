export type SurveyType = "anket" | "genel_kurul_oylamasi";
export type SurveyStatus = "taslak" | "aktif" | "kapali";

export interface Survey {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  type: SurveyType;
  status: SurveyStatus;
  startsAt: string | null;
  endsAt: string | null;
}

export interface SurveyOption {
  id: string;
  surveyId: string;
  optionText: string;
  displayOrder: number;
}

export interface SurveyOptionResult {
  optionId: string;
  optionText: string;
  voteCount: number;
}
