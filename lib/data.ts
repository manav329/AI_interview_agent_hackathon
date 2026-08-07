import fs from 'fs';
import path from 'path';
import { Curriculum, CurriculumDay, Candidate } from './types';

const curriculumPath = path.join(process.cwd(), 'data', 'curriculum.json');
const candidatesPath = path.join(process.cwd(), 'data', 'candidates.json');

let curriculumData: Curriculum = { cohort: "", modules: [], days: [] };
let candidatesData: Candidate[] = [];

try {
  const content = fs.readFileSync(curriculumPath, 'utf8');
  const parsed = JSON.parse(content);
  if (parsed.cohort) {
    curriculumData = parsed as Curriculum;
  } else if (parsed.curriculum) {
    curriculumData = parsed.curriculum as Curriculum;
  } else {
    curriculumData = parsed as Curriculum;
  }
} catch (e) {
  console.warn("Failed to parse curriculum.json", e);
}

try {
  const content = fs.readFileSync(candidatesPath, 'utf8');
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) {
    candidatesData = parsed;
  } else if (parsed.candidates && Array.isArray(parsed.candidates)) {
    candidatesData = parsed.candidates;
  }
} catch (e) {
  console.warn("Failed to parse candidates.json", e);
}

export function getCurriculumDay(day: number): CurriculumDay | undefined {
  return curriculumData.days?.find(d => d.day === day);
}

export function getCandidateById(id: string): Candidate | undefined {
  return candidatesData.find(c => c.member.id === id);
}

export function selectInterviewTopics(candidate: Candidate, curriculum: Curriculum, minDays: number = 4): CurriculumDay[] {
  const selectedDays = new Set<number>();
  const missions = candidate.missions || [];

  const skipped = missions.filter(m => m.skipped);
  const passedFirstTry = missions.filter(m => m.passed && m.attempts === 1);
  const passedMultiAttempt = missions.filter(m => m.passed && (m.attempts || 0) > 1);
  const other = missions.filter(m => !skipped.includes(m) && !passedFirstTry.includes(m) && !passedMultiAttempt.includes(m));

  // 1. Include at least one skipped if any exist
  if (skipped.length > 0) {
    selectedDays.add(skipped[0].day);
  }

  // 2. Include at least one passed on first attempt
  if (passedFirstTry.length > 0) {
    selectedDays.add(passedFirstTry[0].day);
  }

  // 3. Prioritize days passed but with attempts > 1
  for (const m of passedMultiAttempt) {
    if (selectedDays.size >= minDays) break;
    selectedDays.add(m.day);
  }

  // 4. Fill up to minDays with remaining skipped
  for (const m of skipped) {
    if (selectedDays.size >= minDays) break;
    selectedDays.add(m.day);
  }

  // 5. Fill up to minDays with remaining first try
  for (const m of passedFirstTry) {
    if (selectedDays.size >= minDays) break;
    selectedDays.add(m.day);
  }

  // 6. Fill up to minDays with other missions
  for (const m of other) {
    if (selectedDays.size >= minDays) break;
    selectedDays.add(m.day);
  }

  const selectedCurriculumDays: CurriculumDay[] = [];
  
  selectedDays.forEach(day => {
    const cDay = curriculum.days?.find(d => d.day === day);
    if (cDay) {
      selectedCurriculumDays.push(cDay);
    }
  });

  // Sort by day ascending
  return selectedCurriculumDays.sort((a, b) => a.day - b.day);
}
