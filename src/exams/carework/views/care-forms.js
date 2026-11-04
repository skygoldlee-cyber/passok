// src/exams/carework/views/care-forms.js — 보고서·서식 모음 뷰 (정적 링크 디렉터리)
// @spec none — 시험 전용 실무 뷰 (DA-13)
import { refreshOrgName } from '../facility.js';
import { markFunnel } from '../care-funnel.js';

export function initCareFormsView() { markFunnel('tool:care-forms'); void refreshOrgName(); }
