import { relations, sql } from "drizzle-orm";
import { boolean, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("MembershipRole", ["OWNER", "ADMIN", "MEMBER"]);
export const processStatus = pgEnum("ProcessStatus", ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);
export const taskStatus = pgEnum("TaskStatus", ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
export const priority = pgEnum("Priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const consentStatus = pgEnum("ConsentStatus", ["DRAFT", "PENDING", "SIGNED", "REVOKED"]);
export const referralStatus = pgEnum("ReferralStatus", ["DRAFT", "SENT", "ACCEPTED", "COMPLETED", "CANCELLED"]);
export const examStatus = pgEnum("ExamStatus", ["ORDERED", "SCHEDULED", "COMPLETED", "CANCELLED"]);
export type MembershipRole = (typeof membershipRole.enumValues)[number];

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const date = (name: string) => timestamp(name, { precision: 3, mode: "date" });
const createdAt = () => date("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`);
// Prisma's @updatedAt is application-side, including the initial insert.
const updatedAt = () => date("updatedAt").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date());

export const users = pgTable("User", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("User_email_key").on(t.email)]);

export const sessions = pgTable("Session", {
  id: text("id").primaryKey(),
  expiresAt: date("expiresAt").notNull(),
  token: text("token").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull(),
}, (t) => [
  uniqueIndex("Session_token_key").on(t.token),
  index("Session_userId_idx").on(t.userId),
  foreignKey({ name: "Session_userId_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const accounts = pgTable("Account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: date("accessTokenExpiresAt"),
  refreshTokenExpiresAt: date("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Account_userId_idx").on(t.userId),
  uniqueIndex("Account_providerId_accountId_key").on(t.providerId, t.accountId),
  foreignKey({ name: "Account_userId_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const verifications = pgTable("Verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: date("expiresAt").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("Verification_identifier_idx").on(t.identifier)]);

export const organizations = pgTable("Organization", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sector: text("sector"),
  teamSize: text("teamSize"),
  plan: text("plan").notNull().default("starter"),
  timezone: text("timezone").notNull().default("America/Bogota"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("Organization_slug_key").on(t.slug)]);

export const memberships = pgTable("Membership", {
  id: id(),
  role: membershipRole("role").notNull().default("MEMBER"),
  userId: text("userId").notNull(),
  organizationId: text("organizationId").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Membership_organizationId_idx").on(t.organizationId),
  uniqueIndex("Membership_userId_organizationId_key").on(t.userId, t.organizationId),
  foreignKey({ name: "Membership_userId_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Membership_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const processes = pgTable("Process", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  area: text("area"),
  ownerName: text("ownerName"),
  status: processStatus("status").notNull().default("DRAFT"),
  priority: priority("priority").notNull().default("MEDIUM"),
  progress: integer("progress").notNull().default(0),
  dueDate: date("dueDate"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Process_organizationId_status_idx").on(t.organizationId, t.status),
  index("Process_organizationId_name_idx").on(t.organizationId, t.name),
  foreignKey({ name: "Process_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const processSteps = pgTable("ProcessStep", {
  id: id(),
  processId: text("processId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("ProcessStep_processId_position_key").on(t.processId, t.position),
  foreignKey({ name: "ProcessStep_processId_fkey", columns: [t.processId], foreignColumns: [processes.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const tasks = pgTable("Task", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  processId: text("processId"),
  assigneeId: text("assigneeId"),
  createdById: text("createdById").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("TODO"),
  priority: priority("priority").notNull().default("MEDIUM"),
  progress: integer("progress").notNull().default(0),
  dueDate: date("dueDate"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Task_organizationId_status_idx").on(t.organizationId, t.status),
  index("Task_processId_idx").on(t.processId),
  index("Task_assigneeId_idx").on(t.assigneeId),
  foreignKey({ name: "Task_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Task_processId_fkey", columns: [t.processId], foreignColumns: [processes.id] }).onDelete("set null").onUpdate("cascade"),
  foreignKey({ name: "Task_assigneeId_fkey", columns: [t.assigneeId], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
  foreignKey({ name: "Task_createdById_fkey", columns: [t.createdById], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const documents = pgTable("Document", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  processId: text("processId"),
  uploadedById: text("uploadedById").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  mimeType: text("mimeType"),
  sizeBytes: integer("sizeBytes"),
  externalUrl: text("externalUrl"),
  category: text("category"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Document_organizationId_createdAt_idx").on(t.organizationId, t.createdAt),
  index("Document_processId_idx").on(t.processId),
  foreignKey({ name: "Document_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Document_processId_fkey", columns: [t.processId], foreignColumns: [processes.id] }).onDelete("set null").onUpdate("cascade"),
  foreignKey({ name: "Document_uploadedById_fkey", columns: [t.uploadedById], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const patients = pgTable("Patient", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  documentNumber: text("documentNumber").notNull(),
  fullName: text("fullName").notNull(),
  birthDate: date("birthDate"),
  sex: text("sex"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Patient_organizationId_fullName_idx").on(t.organizationId, t.fullName),
  uniqueIndex("Patient_organizationId_documentNumber_key").on(t.organizationId, t.documentNumber),
  foreignKey({ name: "Patient_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
]);

export const clinicalHistories = pgTable("ClinicalHistory", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  patientId: text("patientId").notNull(),
  authorId: text("authorId").notNull(),
  consultationReason: text("consultationReason").notNull(),
  currentIllness: text("currentIllness"),
  personalHistory: text("personalHistory"),
  familyHistory: text("familyHistory"),
  currentMedication: text("currentMedication"),
  examination: text("examination"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatmentPlan"),
  painScale: integer("painScale"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("ClinicalHistory_organizationId_createdAt_idx").on(t.organizationId, t.createdAt),
  index("ClinicalHistory_patientId_idx").on(t.patientId),
  foreignKey({ name: "ClinicalHistory_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "ClinicalHistory_patientId_fkey", columns: [t.patientId], foreignColumns: [patients.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "ClinicalHistory_authorId_fkey", columns: [t.authorId], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const consents = pgTable("Consent", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  patientId: text("patientId").notNull(),
  createdById: text("createdById").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  status: consentStatus("status").notNull().default("DRAFT"),
  signedAt: date("signedAt"),
  expiresAt: date("expiresAt"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Consent_organizationId_status_idx").on(t.organizationId, t.status),
  index("Consent_patientId_idx").on(t.patientId),
  foreignKey({ name: "Consent_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Consent_patientId_fkey", columns: [t.patientId], foreignColumns: [patients.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Consent_createdById_fkey", columns: [t.createdById], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const referrals = pgTable("Referral", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  patientId: text("patientId").notNull(),
  createdById: text("createdById").notNull(),
  specialty: text("specialty").notNull(),
  provider: text("provider"),
  reason: text("reason").notNull(),
  status: referralStatus("status").notNull().default("DRAFT"),
  referredAt: date("referredAt"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Referral_organizationId_status_idx").on(t.organizationId, t.status),
  index("Referral_patientId_idx").on(t.patientId),
  foreignKey({ name: "Referral_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Referral_patientId_fkey", columns: [t.patientId], foreignColumns: [patients.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Referral_createdById_fkey", columns: [t.createdById], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const exams = pgTable("Exam", {
  id: id(),
  organizationId: text("organizationId").notNull(),
  patientId: text("patientId").notNull(),
  createdById: text("createdById").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  status: examStatus("status").notNull().default("ORDERED"),
  orderedAt: date("orderedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  scheduledAt: date("scheduledAt"),
  completedAt: date("completedAt"),
  result: text("result"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("Exam_organizationId_status_idx").on(t.organizationId, t.status),
  index("Exam_patientId_idx").on(t.patientId),
  foreignKey({ name: "Exam_organizationId_fkey", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Exam_patientId_fkey", columns: [t.patientId], foreignColumns: [patients.id] }).onDelete("cascade").onUpdate("cascade"),
  foreignKey({ name: "Exam_createdById_fkey", columns: [t.createdById], foreignColumns: [users.id] }).onDelete("restrict").onUpdate("cascade"),
]);

export const contactSubmissions = pgTable("ContactSubmission", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  ipHash: text("ipHash"),
  createdAt: createdAt(),
}, (t) => [index("ContactSubmission_createdAt_idx").on(t.createdAt)]);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  memberships: many(memberships),
  assignedTasks: many(tasks, { relationName: "TaskAssignee" }),
  createdTasks: many(tasks, { relationName: "TaskCreator" }),
  documents: many(documents, { relationName: "DocumentUploader" }),
  histories: many(clinicalHistories, { relationName: "HistoryAuthor" }),
  consents: many(consents, { relationName: "ConsentCreator" }),
  referrals: many(referrals, { relationName: "ReferralCreator" }),
  exams: many(exams, { relationName: "ExamCreator" }),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  processes: many(processes),
  tasks: many(tasks),
  documents: many(documents),
  patients: many(patients),
  histories: many(clinicalHistories),
  consents: many(consents),
  referrals: many(referrals),
  exams: many(exams),
}));
export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
}));
export const processesRelations = relations(processes, ({ one, many }) => ({
  organization: one(organizations, { fields: [processes.organizationId], references: [organizations.id] }),
  steps: many(processSteps),
  tasks: many(tasks),
  documents: many(documents),
}));
export const processStepsRelations = relations(processSteps, ({ one }) => ({
  process: one(processes, { fields: [processSteps.processId], references: [processes.id] }),
}));
export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, { fields: [tasks.organizationId], references: [organizations.id] }),
  process: one(processes, { fields: [tasks.processId], references: [processes.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id], relationName: "TaskAssignee" }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id], relationName: "TaskCreator" }),
}));
export const documentsRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, { fields: [documents.organizationId], references: [organizations.id] }),
  process: one(processes, { fields: [documents.processId], references: [processes.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedById], references: [users.id], relationName: "DocumentUploader" }),
}));
export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, { fields: [patients.organizationId], references: [organizations.id] }),
  histories: many(clinicalHistories),
  consents: many(consents),
  referrals: many(referrals),
  exams: many(exams),
}));
export const clinicalHistoriesRelations = relations(clinicalHistories, ({ one }) => ({
  organization: one(organizations, { fields: [clinicalHistories.organizationId], references: [organizations.id] }),
  patient: one(patients, { fields: [clinicalHistories.patientId], references: [patients.id] }),
  author: one(users, { fields: [clinicalHistories.authorId], references: [users.id], relationName: "HistoryAuthor" }),
}));
export const consentsRelations = relations(consents, ({ one }) => ({
  organization: one(organizations, { fields: [consents.organizationId], references: [organizations.id] }),
  patient: one(patients, { fields: [consents.patientId], references: [patients.id] }),
  createdBy: one(users, { fields: [consents.createdById], references: [users.id], relationName: "ConsentCreator" }),
}));
export const referralsRelations = relations(referrals, ({ one }) => ({
  organization: one(organizations, { fields: [referrals.organizationId], references: [organizations.id] }),
  patient: one(patients, { fields: [referrals.patientId], references: [patients.id] }),
  createdBy: one(users, { fields: [referrals.createdById], references: [users.id], relationName: "ReferralCreator" }),
}));
export const examsRelations = relations(exams, ({ one }) => ({
  organization: one(organizations, { fields: [exams.organizationId], references: [organizations.id] }),
  patient: one(patients, { fields: [exams.patientId], references: [patients.id] }),
  createdBy: one(users, { fields: [exams.createdById], references: [users.id], relationName: "ExamCreator" }),
}));
