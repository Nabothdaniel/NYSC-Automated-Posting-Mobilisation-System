export type CourseCategory =
  | "Medical"
  | "Education"
  | "Engineering"
  | "Law"
  | "Agriculture"
  | "Science"
  | "ICT"
  | "Business"
  | "Arts"
  | "SocialSciences";

export const COURSE_CATEGORIES: CourseCategory[] = [
  "Medical",
  "Education",
  "Engineering",
  "Law",
  "Agriculture",
  "Science",
  "ICT",
  "Business",
  "Arts",
  "SocialSciences",
];

export const CATEGORY_LABEL: Record<CourseCategory, string> = {
  Medical: "Medical & Health",
  Education: "Education",
  Engineering: "Engineering",
  Law: "Law",
  Agriculture: "Agriculture",
  Science: "Pure & Applied Sciences",
  ICT: "Computing & ICT",
  Business: "Business & Management",
  Arts: "Arts & Humanities",
  SocialSciences: "Social Sciences",
};

export const COURSES: Record<CourseCategory, string[]> = {
  Medical: ["Medicine and Surgery", "Nursing Science", "Pharmacy", "Medical Laboratory Science", "Physiotherapy", "Dentistry", "Public Health"],
  Education: ["Education and Biology", "Education and Mathematics", "Education and English", "Guidance and Counselling", "Primary Education", "Physical and Health Education"],
  Engineering: ["Civil Engineering", "Electrical Engineering", "Mechanical Engineering", "Chemical Engineering", "Petroleum Engineering", "Agricultural Engineering"],
  Law: ["Law"],
  Agriculture: ["Agricultural Economics", "Animal Science", "Crop Science", "Fisheries", "Soil Science"],
  Science: ["Microbiology", "Biochemistry", "Physics", "Chemistry", "Mathematics", "Statistics", "Geology"],
  ICT: ["Computer Science", "Information Technology", "Software Engineering", "Cyber Security", "Computer Engineering"],
  Business: ["Accounting", "Business Administration", "Banking and Finance", "Marketing", "Economics"],
  Arts: ["English Language", "History", "Theatre Arts", "Philosophy", "French", "Mass Communication"],
  SocialSciences: ["Sociology", "Political Science", "Psychology", "Geography", "Public Administration"],
};

export const ALL_COURSES = Object.values(COURSES).flat().sort();

export const COURSE_TO_CATEGORY: Record<string, CourseCategory> = Object.fromEntries(
  (Object.entries(COURSES) as [CourseCategory, string[]][]).flatMap(([cat, list]) =>
    list.map((c) => [c, cat]),
  ),
);

export const categoryOf = (course: string): CourseCategory =>
  COURSE_TO_CATEGORY[course] ?? "SocialSciences";

export const PPA_SECTORS = [
  "Health",
  "Education",
  "Government Ministry",
  "Infrastructure",
  "Agriculture",
  "Legal",
  "Technology",
  "Finance",
  "Media",
  "NGO",
  "Private Sector",
] as const;
export type PpaSector = (typeof PPA_SECTORS)[number];
