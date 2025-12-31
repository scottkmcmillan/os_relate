/**
 * User Management Service for PKA-Relate
 * Handles all user profile, psychological profile, settings, core values, mentors, and focus areas operations
 * @module relate/user/service
 */

import {
  User,
  PsychologicalProfile,
  UserSettings,
  CoreValue,
  Mentor,
  FocusArea,
  UUID,
  Timestamp,
  ValueCategory,
  AttachmentStyle,
  CommunicationStyle
} from '../../docs/v2_PKA/PKA-relate/data-models/data_models_schema.js';

// ============================================================================
// Type Definitions - Create/Update DTOs
// ============================================================================

/**
 * Data required to create a new core value
 */
export interface CoreValueCreate {
  category: ValueCategory;
  value: string;
  description?: string;
  display_order?: number;
}

/**
 * Data required to create a new mentor
 */
export interface MentorCreate {
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Data required to create a new focus area
 */
export interface FocusAreaCreate {
  title: string;
  description?: string;
  target_date?: Timestamp;
  linked_value_ids?: UUID[];
}

/**
 * Service error types
 */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, public details?: Record<string, string>) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// In-Memory Data Store (Replace with actual database in production)
// ============================================================================

// Mock data stores - replace with actual database calls
const usersStore = new Map<UUID, User>();
const psychProfilesStore = new Map<UUID, PsychologicalProfile>();
const settingsStore = new Map<UUID, UserSettings>();
const coreValuesStore = new Map<UUID, CoreValue[]>();
const mentorsStore = new Map<UUID, Mentor[]>();
const focusAreasStore = new Map<UUID, FocusArea[]>();

// Helper to generate UUIDs
function generateUUID(): UUID {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get current timestamp
function getCurrentTimestamp(): Timestamp {
  return new Date().toISOString();
}

// ============================================================================
// User Profile Operations
// ============================================================================

/**
 * Get user profile by user ID
 */
export async function getProfile(userId: UUID): Promise<User> {
  const user = usersStore.get(userId);
  if (!user) {
    throw new NotFoundError('User', userId);
  }
  return user;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: UUID,
  updates: Partial<User>
): Promise<User> {
  const user = await getProfile(userId);

  // Validate updates
  if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
    throw new ValidationError('Invalid email format');
  }

  const updatedUser: User = {
    ...user,
    ...updates,
    id: user.id, // Prevent ID changes
    created_at: user.created_at, // Prevent creation date changes
    updated_at: getCurrentTimestamp()
  };

  usersStore.set(userId, updatedUser);
  return updatedUser;
}

// ============================================================================
// Psychological Profile Operations
// ============================================================================

/**
 * Get psychological profile
 */
export async function getPsychProfile(userId: UUID): Promise<PsychologicalProfile | null> {
  return psychProfilesStore.get(userId) || null;
}

/**
 * Update psychological profile
 */
export async function updatePsychProfile(
  userId: UUID,
  updates: Partial<PsychologicalProfile>
): Promise<PsychologicalProfile> {
  const existing = psychProfilesStore.get(userId);
  const now = getCurrentTimestamp();

  let profile: PsychologicalProfile;

  if (existing) {
    profile = {
      ...existing,
      ...updates,
      id: existing.id,
      user_id: userId
    };

    // Update timestamps for changed fields
    if (updates.attachment_style) {
      profile.attachment_updated_at = now;
    }
    if (updates.communication_style) {
      profile.communication_updated_at = now;
    }
    if (updates.conflict_pattern) {
      profile.conflict_updated_at = now;
    }
  } else {
    // Create new profile
    profile = {
      id: generateUUID(),
      user_id: userId,
      attachment_style: updates.attachment_style || 'Secure',
      attachment_updated_at: now,
      communication_style: updates.communication_style || 'Direct',
      communication_updated_at: now,
      conflict_pattern: updates.conflict_pattern || '',
      conflict_updated_at: now,
      traits: updates.traits || {},
      completeness_score: calculateCompletenessScore(updates)
    };
  }

  psychProfilesStore.set(userId, profile);
  return profile;
}

/**
 * Calculate completeness score for psychological profile
 */
function calculateCompletenessScore(profile: Partial<PsychologicalProfile>): number {
  let score = 0;
  const fields = ['attachment_style', 'communication_style', 'conflict_pattern', 'traits'];

  fields.forEach(field => {
    if (profile[field as keyof PsychologicalProfile]) {
      score += 0.25;
    }
  });

  return Math.min(score, 1.0);
}

// ============================================================================
// User Settings Operations
// ============================================================================

/**
 * Get user settings
 */
export async function getSettings(userId: UUID): Promise<UserSettings> {
  const existing = settingsStore.get(userId);

  if (existing) {
    return existing;
  }

  // Return default settings
  const defaultSettings: UserSettings = {
    user_id: userId,
    push_notifications_enabled: true,
    data_privacy_strict: false,
    reflection_reminder_enabled: false,
    reflection_reminder_time: '20:00',
    app_lock_enabled: false,
    tough_love_mode_enabled: false,
    updated_at: getCurrentTimestamp(),
    theme: 'auto',
    language: 'en-US',
    notifications: {
      interaction_reminders: true,
      focus_area_milestones: true,
      relationship_insights: true,
      weekly_summary: true
    }
  };

  settingsStore.set(userId, defaultSettings);
  return defaultSettings;
}

/**
 * Update user settings
 */
export async function updateSettings(
  userId: UUID,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const existing = await getSettings(userId);

  // Validate time format if provided
  if (updates.reflection_reminder_time) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(updates.reflection_reminder_time)) {
      throw new ValidationError('Invalid time format. Use HH:MM (24-hour format)');
    }
  }

  const updatedSettings: UserSettings = {
    ...existing,
    ...updates,
    user_id: userId,
    updated_at: getCurrentTimestamp()
  };

  settingsStore.set(userId, updatedSettings);
  return updatedSettings;
}

// ============================================================================
// Core Values Operations
// ============================================================================

/**
 * Get all core values for a user
 */
export async function getCoreValues(userId: UUID): Promise<CoreValue[]> {
  return coreValuesStore.get(userId) || [];
}

/**
 * Get a single core value by ID (A1: Missing endpoint)
 */
export async function getCoreValue(userId: UUID, valueId: UUID): Promise<CoreValue | null> {
  const values = await getCoreValues(userId);
  return values.find(v => v.id === valueId) || null;
}

/**
 * Add a new core value
 */
export async function addCoreValue(
  userId: UUID,
  data: CoreValueCreate
): Promise<CoreValue> {
  // Validate required fields
  if (!data.value || data.value.trim().length === 0) {
    throw new ValidationError('Value name is required');
  }

  if (!data.category) {
    throw new ValidationError('Value category is required');
  }

  const values = await getCoreValues(userId);

  // Calculate display order
  const displayOrder = data.display_order ?? values.length;

  const newValue: CoreValue = {
    id: generateUUID(),
    user_id: userId,
    category: data.category,
    value: data.value.trim(),
    description: data.description,
    created_at: getCurrentTimestamp(),
    display_order: displayOrder,
    embedding: undefined,
    reference_count: 0
  };

  values.push(newValue);
  coreValuesStore.set(userId, values);

  return newValue;
}

/**
 * Update a core value (A2: Missing endpoint)
 */
export async function updateCoreValue(
  userId: UUID,
  valueId: UUID,
  updates: Partial<CoreValue>
): Promise<CoreValue> {
  const values = await getCoreValues(userId);
  const index = values.findIndex(v => v.id === valueId);

  if (index === -1) {
    throw new NotFoundError('CoreValue', valueId);
  }

  // Prevent changing immutable fields
  const updatedValue: CoreValue = {
    ...values[index],
    ...updates,
    id: valueId,
    user_id: userId,
    created_at: values[index].created_at
  };

  values[index] = updatedValue;
  coreValuesStore.set(userId, values);

  return updatedValue;
}

/**
 * Remove a core value
 */
export async function removeCoreValue(userId: UUID, valueId: UUID): Promise<void> {
  const values = await getCoreValues(userId);
  const filtered = values.filter(v => v.id !== valueId);

  if (filtered.length === values.length) {
    throw new NotFoundError('CoreValue', valueId);
  }

  coreValuesStore.set(userId, filtered);
}

// ============================================================================
// Mentors Operations
// ============================================================================

/**
 * Get all mentors for a user
 */
export async function getMentors(userId: UUID): Promise<Mentor[]> {
  return mentorsStore.get(userId) || [];
}

/**
 * Get a single mentor by ID
 */
export async function getMentor(userId: UUID, mentorId: UUID): Promise<Mentor | null> {
  const mentors = await getMentors(userId);
  return mentors.find(m => m.id === mentorId) || null;
}

/**
 * Add a new mentor
 */
export async function addMentor(
  userId: UUID,
  data: MentorCreate
): Promise<Mentor> {
  // Validate required fields
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('Mentor name is required');
  }

  const mentors = await getMentors(userId);

  const newMentor: Mentor = {
    id: generateUUID(),
    user_id: userId,
    name: data.name.trim(),
    description: data.description,
    created_at: getCurrentTimestamp(),
    embedding: undefined,
    reference_count: 0
  };

  mentors.push(newMentor);
  mentorsStore.set(userId, mentors);

  return newMentor;
}

/**
 * Update a mentor (A3: Missing endpoint)
 */
export async function updateMentor(
  userId: UUID,
  mentorId: UUID,
  updates: Partial<Mentor>
): Promise<Mentor> {
  const mentors = await getMentors(userId);
  const index = mentors.findIndex(m => m.id === mentorId);

  if (index === -1) {
    throw new NotFoundError('Mentor', mentorId);
  }

  // Prevent changing immutable fields
  const updatedMentor: Mentor = {
    ...mentors[index],
    ...updates,
    id: mentorId,
    user_id: userId,
    created_at: mentors[index].created_at
  };

  mentors[index] = updatedMentor;
  mentorsStore.set(userId, mentors);

  return updatedMentor;
}

/**
 * Remove a mentor
 */
export async function removeMentor(userId: UUID, mentorId: UUID): Promise<void> {
  const mentors = await getMentors(userId);
  const filtered = mentors.filter(m => m.id !== mentorId);

  if (filtered.length === mentors.length) {
    throw new NotFoundError('Mentor', mentorId);
  }

  mentorsStore.set(userId, filtered);
}

// ============================================================================
// Focus Areas Operations
// ============================================================================

/**
 * Get all focus areas for a user
 */
export async function getFocusAreas(userId: UUID): Promise<FocusArea[]> {
  return focusAreasStore.get(userId) || [];
}

/**
 * Get a single focus area by ID (A4: Missing endpoint)
 */
export async function getFocusArea(userId: UUID, focusAreaId: UUID): Promise<FocusArea | null> {
  const focusAreas = await getFocusAreas(userId);
  return focusAreas.find(fa => fa.id === focusAreaId) || null;
}

/**
 * Create a new focus area
 */
export async function createFocusArea(
  userId: UUID,
  data: FocusAreaCreate
): Promise<FocusArea> {
  // Validate required fields
  if (!data.title || data.title.trim().length === 0) {
    throw new ValidationError('Focus area title is required');
  }

  const focusAreas = await getFocusAreas(userId);
  const now = getCurrentTimestamp();

  const newFocusArea: FocusArea = {
    id: generateUUID(),
    user_id: userId,
    title: data.title.trim(),
    description: data.description,
    progress: 0,
    streak: 0,
    weekly_change: 0,
    target_date: data.target_date,
    created_at: now,
    updated_at: now,
    linked_value_ids: data.linked_value_ids || [],
    embedding: undefined
  };

  focusAreas.push(newFocusArea);
  focusAreasStore.set(userId, focusAreas);

  return newFocusArea;
}

/**
 * Update a focus area
 */
export async function updateFocusArea(
  userId: UUID,
  focusAreaId: UUID,
  updates: Partial<FocusArea>
): Promise<FocusArea> {
  const focusAreas = await getFocusAreas(userId);
  const index = focusAreas.findIndex(fa => fa.id === focusAreaId);

  if (index === -1) {
    throw new NotFoundError('FocusArea', focusAreaId);
  }

  // Validate progress if updated
  if (updates.progress !== undefined && (updates.progress < 0 || updates.progress > 100)) {
    throw new ValidationError('Progress must be between 0 and 100');
  }

  // Prevent changing immutable fields
  const updatedFocusArea: FocusArea = {
    ...focusAreas[index],
    ...updates,
    id: focusAreaId,
    user_id: userId,
    created_at: focusAreas[index].created_at,
    updated_at: getCurrentTimestamp()
  };

  focusAreas[index] = updatedFocusArea;
  focusAreasStore.set(userId, focusAreas);

  return updatedFocusArea;
}

/**
 * Delete a focus area
 */
export async function deleteFocusArea(userId: UUID, focusAreaId: UUID): Promise<void> {
  const focusAreas = await getFocusAreas(userId);
  const filtered = focusAreas.filter(fa => fa.id !== focusAreaId);

  if (filtered.length === focusAreas.length) {
    throw new NotFoundError('FocusArea', focusAreaId);
  }

  focusAreasStore.set(userId, filtered);
}

// ============================================================================
// Export Service Interface
// ============================================================================

export const UserService = {
  // Profile
  getProfile,
  updateProfile,

  // Psychological Profile
  getPsychProfile,
  updatePsychProfile,

  // Settings
  getSettings,
  updateSettings,

  // Core Values
  getCoreValues,
  getCoreValue,
  addCoreValue,
  updateCoreValue,
  removeCoreValue,

  // Mentors
  getMentors,
  getMentor,
  addMentor,
  updateMentor,
  removeMentor,

  // Focus Areas
  getFocusAreas,
  getFocusArea,
  createFocusArea,
  updateFocusArea,
  deleteFocusArea
};
