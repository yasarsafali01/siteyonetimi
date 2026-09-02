import { apiClient } from "./client";
import type { Survey, SurveyOption, SurveyOptionResult, SurveyType } from "../types/survey";

export async function listSurveys(siteId: string) {
  const { data } = await apiClient.get<Survey[]>(`/sites/${siteId}/surveys`);
  return data;
}

export async function createSurvey(
  siteId: string,
  input: { title: string; description?: string; type: SurveyType; options: string[] },
) {
  const { data } = await apiClient.post<{ survey: Survey; options: SurveyOption[] }>(`/sites/${siteId}/surveys`, input);
  return data;
}

export async function listSurveyOptions(surveyId: string) {
  const { data } = await apiClient.get<SurveyOption[]>(`/surveys/${surveyId}/options`);
  return data;
}

export async function activateSurvey(surveyId: string) {
  const { data } = await apiClient.post<Survey>(`/surveys/${surveyId}/activate`);
  return data;
}

export async function closeSurvey(surveyId: string) {
  const { data } = await apiClient.post<Survey>(`/surveys/${surveyId}/close`);
  return data;
}

export async function vote(surveyId: string, optionId: string, unitId: string) {
  const { data } = await apiClient.post(`/surveys/${surveyId}/vote`, { optionId, unitId });
  return data;
}

export async function getSurveyResults(surveyId: string) {
  const { data } = await apiClient.get<SurveyOptionResult[]>(`/surveys/${surveyId}/results`);
  return data;
}
