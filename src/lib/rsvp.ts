export const attendanceOptions = ["Hadir", "Tidak Hadir", "Mungkin"] as const;

export type AttendanceStatus = (typeof attendanceOptions)[number];

export type RsvpSubmission = {
  timestamp: string;
  name: string;
  attendance: AttendanceStatus;
  pax: number;
  phone: string;
  wish: string;
  source: string;
};

export const seedWishes: RsvpSubmission[] = [];
