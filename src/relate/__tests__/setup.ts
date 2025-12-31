import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Test database instance
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pka_relate_test'
    }
  }
});

// Test configuration
export const testConfig = {
  jwtSecret: 'test-jwt-secret-key',
  jwtRefreshSecret: 'test-refresh-secret-key',
  bcryptRounds: 10
};

// Test user factory
export async function createTestUser(overrides = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    ...overrides
  };

  const hashedPassword = await bcrypt.hash(defaultUser.password, testConfig.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email: defaultUser.email,
      passwordHash: hashedPassword,
      profile: {
        create: {
          name: defaultUser.name,
          timezone: 'UTC',
          language: 'en'
        }
      }
    },
    include: {
      profile: true
    }
  });

  return {
    user,
    password: defaultUser.password // Return plaintext for testing
  };
}

// Authentication token helper
export function generateTestTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    testConfig.jwtSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    testConfig.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// Mock services
export const mockLLMService = {
  chat: jest.fn(),
  generateEmbedding: jest.fn(),
  analyzeContent: jest.fn(),
  detectContradictions: jest.fn(),
  generateInsights: jest.fn()
};

export const mockEmbeddingService = {
  embed: jest.fn(),
  similarity: jest.fn(),
  search: jest.fn()
};

export const mockStorageService = {
  upload: jest.fn(),
  download: jest.fn(),
  delete: jest.fn(),
  getUrl: jest.fn()
};

// Database cleanup helpers
export async function cleanupDatabase() {
  const tables = [
    'Message',
    'Conversation',
    'Interaction',
    'ContentItem',
    'SubSystem',
    'FocusArea',
    'CoreValue',
    'Mentor',
    'PsychologicalProfile',
    'UserProfile',
    'RefreshToken',
    'User'
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

// Setup and teardown hooks
beforeAll(async () => {
  // Ensure test database is connected
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await cleanupDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await cleanupDatabase();

  // Reset all mocks
  jest.clearAllMocks();

  // Setup default mock responses
  mockLLMService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
  mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3]);
  mockEmbeddingService.similarity.mockReturnValue(0.85);
  mockStorageService.upload.mockResolvedValue({ url: 'https://test.com/file.pdf' });
});

// Test data fixtures
export const testFixtures = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!',
    name: 'Valid User'
  },

  invalidPasswords: [
    'short', // Too short
    'nouppercase123!', // No uppercase
    'NOLOWERCASE123!', // No lowercase
    'NoSpecialChar123', // No special char
    'NoNumbers!!' // No numbers
  ],

  psychologicalProfile: {
    meyersBriggs: 'INTJ',
    enneagram: '5w4',
    bigFive: {
      openness: 85,
      conscientiousness: 90,
      extraversion: 30,
      agreeableness: 60,
      neuroticism: 40
    },
    workingGenius: ['Wonder', 'Invention'],
    loveLanguages: ['Quality Time', 'Acts of Service']
  },

  coreValue: {
    name: 'Integrity',
    description: 'Always act with honesty and strong moral principles',
    priority: 1
  },

  mentor: {
    name: 'Marcus Aurelius',
    description: 'Stoic philosopher and Roman Emperor',
    expertise: ['Stoicism', 'Leadership', 'Self-discipline']
  },

  focusArea: {
    name: 'Health & Fitness',
    description: 'Build sustainable habits for physical and mental wellbeing',
    targetDate: new Date('2025-06-30'),
    status: 'ACTIVE'
  },

  subSystem: {
    name: 'Morning Routine',
    description: 'Optimized morning habits for peak performance',
    category: 'HABITS'
  },

  contentItem: {
    title: 'Atomic Habits Summary',
    contentType: 'BOOK_SUMMARY',
    source: 'https://example.com/atomic-habits',
    rawContent: 'Key insights from Atomic Habits by James Clear...'
  }
};
