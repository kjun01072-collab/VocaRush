import { AcademyClass, VocabularyAssignment } from "../types";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function parseLessonTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: 18, minute: 0 };
  return {
    hour: Math.max(0, Math.min(23, Number(match[1]))),
    minute: Math.max(0, Math.min(59, Number(match[2]))),
  };
}

function formatDateTimeKo(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = DAY_LABELS[date.getDay()];
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day}(${weekday}) ${hour}:${minute}`;
}

export function formatClassSchedule(cls: AcademyClass) {
  const days = cls.lessonDays.map((day) => DAY_LABELS[day]).join("·");
  return `${days} ${cls.lessonTime}`;
}

export function getNextClassStart(cls: AcademyClass, referenceDate = new Date()) {
  const { hour, minute } = parseLessonTime(cls.lessonTime);
  const lessonDays = cls.lessonDays.length ? cls.lessonDays : [referenceDate.getDay() as AcademyClass["lessonDays"][number]];

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(referenceDate);
    candidate.setDate(referenceDate.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (!lessonDays.includes(candidate.getDay() as AcademyClass["lessonDays"][number])) continue;
    if (candidate.getTime() > referenceDate.getTime()) return candidate;
  }

  const fallback = new Date(referenceDate);
  fallback.setDate(referenceDate.getDate() + 1);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}

export function createPreClassTestAvailability(cls: AcademyClass, referenceDate = new Date()) {
  const classStart = getNextClassStart(cls, referenceDate);
  const unlockMinutesBeforeClass = 30;
  const availableAt = new Date(classStart.getTime() - unlockMinutesBeforeClass * 60 * 1000);

  return {
    assignmentKind: "수업 전 단어 테스트" as const,
    releaseMode: "수업 30분 전 공개" as const,
    availableAt: availableAt.toISOString(),
    classStartsAt: classStart.toISOString(),
    unlockMinutesBeforeClass,
    learnMode: "뜻 맞히기" as const,
  };
}

export function createImmediateAssignmentAvailability() {
  return {
    assignmentKind: "단어 과제" as const,
    releaseMode: "즉시 공개" as const,
    availableAt: new Date().toISOString(),
    learnMode: "낱말카드" as const,
  };
}

export function getAssignmentAvailability(assignment: VocabularyAssignment, referenceDate = new Date()) {
  if (assignment.releaseMode !== "수업 30분 전 공개" || !assignment.availableAt) {
    return {
      isOpen: true,
      statusLabel: "열림",
      releaseLabel: "즉시 공개",
      availableLabel: "지금 바로 시작 가능",
      classStartLabel: assignment.classStartsAt ? formatDateTimeKo(new Date(assignment.classStartsAt)) : "",
      minutesUntilOpen: 0,
    };
  }

  const availableAt = new Date(assignment.availableAt);
  const classStartsAt = assignment.classStartsAt ? new Date(assignment.classStartsAt) : null;
  const isOpen = referenceDate.getTime() >= availableAt.getTime();
  const minutesUntilOpen = Math.max(0, Math.ceil((availableAt.getTime() - referenceDate.getTime()) / 60000));

  return {
    isOpen,
    statusLabel: isOpen ? "열림" : "수업 전 잠김",
    releaseLabel: `수업 ${assignment.unlockMinutesBeforeClass || 30}분 전 공개`,
    availableLabel: isOpen ? "지금 테스트 가능" : `${formatDateTimeKo(availableAt)}부터 시작 가능`,
    classStartLabel: classStartsAt ? formatDateTimeKo(classStartsAt) : "",
    minutesUntilOpen,
  };
}
