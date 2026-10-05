export const attendanceOptions = ["Hadir", "Tidak Hadir", "Mungkin"] as const;

export type AttendanceStatus = (typeof attendanceOptions)[number];

export type RsvpSubmission = {
  timestamp: string;
  name: string;
  wish: string;
};

export const seedWishes: RsvpSubmission[] = [];
