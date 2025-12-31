import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import type {
  ExportOptions,
  ExportJob,
  ExportData,
  ExportStatus,
  User,
  PsychologicalProfile,
  UserSettings,
  CoreValue,
  Mentor,
  FocusArea,
  SubSystem,
  ContentItem,
  Interaction,
  ChatConversation
} from '../types';

export class ExportService {
  private exportDir: string;
  private exportJobs: Map<string, ExportJob> = new Map();
  private readonly EXPORT_EXPIRY_HOURS = 24;
  private readonly MAX_EXPORT_SIZE_MB = 100;

  constructor(exportDir: string = './exports') {
    this.exportDir = exportDir;
    this.initializeExportDirectory();
    this.startCleanupTask();
  }

  private async initializeExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      logger.info(`Export directory initialized: ${this.exportDir}`);
    } catch (error) {
      logger.error('Failed to initialize export directory', error);
      throw new AppError('Export service initialization failed', 500);
    }
  }

  private startCleanupTask(): void {
    // Clean up expired exports every hour
    setInterval(() => {
      this.cleanupExpiredExports();
    }, 60 * 60 * 1000);
  }

  private async cleanupExpiredExports(): Promise<void> {
    const now = new Date();
    const expiredJobs: string[] = [];

    for (const [exportId, job] of this.exportJobs.entries()) {
      if (job.expiresAt && job.expiresAt < now) {
        expiredJobs.push(exportId);

        // Delete file if exists
        if (job.downloadUrl) {
          const filePath = path.join(this.exportDir, `${exportId}.${job.format}`);
          try {
            await fs.unlink(filePath);
            logger.info(`Deleted expired export file: ${exportId}`);
          } catch (error) {
            logger.warn(`Failed to delete expired export file: ${exportId}`, error);
          }
        }
      }
    }

    expiredJobs.forEach(id => this.exportJobs.delete(id));

    if (expiredJobs.length > 0) {
      logger.info(`Cleaned up ${expiredJobs.length} expired exports`);
    }
  }

  async initiateExport(userId: string, options: ExportOptions): Promise<ExportJob> {
    const exportId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.EXPORT_EXPIRY_HOURS);

    const job: ExportJob = {
      id: exportId,
      userId,
      status: 'pending',
      format: options.format,
      createdAt: new Date(),
      expiresAt
    };

    this.exportJobs.set(exportId, job);
    logger.info(`Export job initiated: ${exportId} for user ${userId}`);

    // Process export asynchronously
    this.processExport(exportId, userId, options).catch(error => {
      logger.error(`Export job ${exportId} failed`, error);
      job.status = 'failed';
      job.error = error.message;
    });

    return job;
  }

  private async processExport(
    exportId: string,
    userId: string,
    options: ExportOptions
  ): Promise<void> {
    const job = this.exportJobs.get(exportId);
    if (!job) throw new AppError('Export job not found', 404);

    try {
      job.status = 'processing';

      // Gather all data
      const exportData = await this.gatherExportData(userId, options);

      // Generate file based on format
      let filePath: string;
      switch (options.format) {
        case 'json':
          filePath = await this.generateJsonExport(exportId, exportData);
          break;
        case 'csv':
          filePath = await this.generateCsvExport(exportId, exportData);
          break;
        case 'pdf':
          filePath = await this.generatePdfExport(exportId, exportData);
          break;
        default:
          throw new AppError(`Unsupported export format: ${options.format}`, 400);
      }

      // Check file size
      const stats = await fs.stat(filePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > this.MAX_EXPORT_SIZE_MB) {
        await fs.unlink(filePath);
        throw new AppError(
          `Export file too large: ${sizeMB.toFixed(2)}MB (max: ${this.MAX_EXPORT_SIZE_MB}MB)`,
          400
        );
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.downloadUrl = `/export/${exportId}/download`;

      logger.info(`Export job ${exportId} completed successfully`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Export job ${exportId} processing failed`, error);
      throw error;
    }
  }

  private async gatherExportData(
    userId: string,
    options: ExportOptions
  ): Promise<ExportData> {
    // Note: In production, these would call actual service methods
    // This is a placeholder implementation
    const exportData: ExportData = {
      exportedAt: new Date(),
      user: {} as User,
      profile: {} as PsychologicalProfile,
      settings: {} as UserSettings,
      values: [],
      mentors: [],
      focusAreas: [],
      systems: [],
      contentItems: [],
      interactions: [],
      conversations: []
    };

    // Apply filters based on options
    if (options.dateRange) {
      const { from, to } = options.dateRange;

      if (exportData.interactions) {
        exportData.interactions = exportData.interactions.filter(
          i => i.createdAt >= from && i.createdAt <= to
        );
      }

      if (exportData.conversations) {
        exportData.conversations = exportData.conversations.filter(
          c => c.createdAt >= from && c.createdAt <= to
        );
      }
    }

    if (!options.includeContent) {
      exportData.contentItems = [];
    }

    if (!options.includeInteractions) {
      exportData.interactions = [];
    }

    if (!options.includeAnalytics) {
      // Remove analytics-specific data
      delete (exportData as any).analytics;
    }

    return exportData;
  }

  async exportToJson(userId: string): Promise<ExportData> {
    const options: ExportOptions = {
      format: 'json',
      includeContent: true,
      includeInteractions: true,
      includeAnalytics: true
    };

    return this.gatherExportData(userId, options);
  }

  private async generateJsonExport(exportId: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.exportDir, `${exportId}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  async exportToCsv(userId: string): Promise<Map<string, string>> {
    const data = await this.exportToJson(userId);
    const csvMap = new Map<string, string>();

    // Convert different data types to CSV
    const sections = [
      { name: 'values', data: data.values },
      { name: 'mentors', data: data.mentors },
      { name: 'focusAreas', data: data.focusAreas },
      { name: 'systems', data: data.systems },
      { name: 'contentItems', data: data.contentItems },
      { name: 'interactions', data: data.interactions },
      { name: 'conversations', data: data.conversations }
    ];

    for (const section of sections) {
      if (section.data && Array.isArray(section.data) && section.data.length > 0) {
        try {
          const parser = new Parser();
          const csv = parser.parse(section.data);
          csvMap.set(section.name, csv);
        } catch (error) {
          logger.warn(`Failed to convert ${section.name} to CSV`, error);
        }
      }
    }

    return csvMap;
  }

  private async generateCsvExport(exportId: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.exportDir, `${exportId}.zip`);

    // In production, this would create a ZIP file with multiple CSV files
    // For now, we'll create a combined CSV file
    const combinedCsv: string[] = [];

    const sections = [
      { name: 'Values', data: data.values },
      { name: 'Mentors', data: data.mentors },
      { name: 'Focus Areas', data: data.focusAreas },
      { name: 'Systems', data: data.systems },
      { name: 'Content Items', data: data.contentItems },
      { name: 'Interactions', data: data.interactions },
      { name: 'Conversations', data: data.conversations }
    ];

    for (const section of sections) {
      if (section.data && Array.isArray(section.data) && section.data.length > 0) {
        combinedCsv.push(`\n### ${section.name} ###\n`);
        try {
          const parser = new Parser();
          const csv = parser.parse(section.data);
          combinedCsv.push(csv);
        } catch (error) {
          logger.warn(`Failed to convert ${section.name} to CSV`, error);
        }
      }
    }

    await fs.writeFile(filePath, combinedCsv.join('\n'), 'utf-8');
    return filePath;
  }

  async exportToPdf(userId: string): Promise<Buffer> {
    const data = await this.exportToJson(userId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('PKA-Relate Data Export', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Exported: ${data.exportedAt.toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      // User Profile
      doc.fontSize(16).text('User Profile', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`User ID: ${data.user?.id || 'N/A'}`);
      doc.text(`Email: ${data.user?.email || 'N/A'}`);
      doc.moveDown(2);

      // Core Values
      if (data.values && data.values.length > 0) {
        doc.fontSize(16).text('Core Values', { underline: true });
        doc.moveDown();
        data.values.forEach((value, i) => {
          doc.fontSize(12).text(`${i + 1}. ${value.value} (${value.category})`);
          if (value.description) {
            doc.fontSize(10).text(`   ${value.description}`);
          }
        });
        doc.moveDown(2);
      }

      // Mentors
      if (data.mentors && data.mentors.length > 0) {
        doc.fontSize(16).text('Mentors', { underline: true });
        doc.moveDown();
        data.mentors.forEach((mentor, i) => {
          doc.fontSize(12).text(`${i + 1}. ${mentor.name}`);
          if (mentor.expertise) {
            doc.fontSize(10).text(`   Expertise: ${mentor.expertise}`);
          }
        });
        doc.moveDown(2);
      }

      // Statistics
      doc.fontSize(16).text('Statistics', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Total Values: ${data.values?.length || 0}`);
      doc.text(`Total Mentors: ${data.mentors?.length || 0}`);
      doc.text(`Total Focus Areas: ${data.focusAreas?.length || 0}`);
      doc.text(`Total Systems: ${data.systems?.length || 0}`);
      doc.text(`Total Content Items: ${data.contentItems?.length || 0}`);
      doc.text(`Total Interactions: ${data.interactions?.length || 0}`);
      doc.text(`Total Conversations: ${data.conversations?.length || 0}`);

      doc.end();
    });
  }

  private async generatePdfExport(exportId: string, data: ExportData): Promise<string> {
    const filePath = path.join(this.exportDir, `${exportId}.pdf`);
    const pdfBuffer = await this.exportToPdf(data.user?.id || '');
    await fs.writeFile(filePath, pdfBuffer);
    return filePath;
  }

  async getExportStatus(userId: string, exportId: string): Promise<ExportStatus> {
    const job = this.exportJobs.get(exportId);

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== userId) {
      throw new AppError('Unauthorized access to export job', 403);
    }

    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      downloadUrl: job.downloadUrl,
      expiresAt: job.expiresAt,
      error: job.error
    };
  }

  async downloadExport(userId: string, exportId: string): Promise<Buffer> {
    const job = this.exportJobs.get(exportId);

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== userId) {
      throw new AppError('Unauthorized access to export job', 403);
    }

    if (job.status !== 'completed') {
      throw new AppError(`Export not ready. Status: ${job.status}`, 400);
    }

    const filePath = path.join(this.exportDir, `${exportId}.${job.format}`);

    try {
      const buffer = await fs.readFile(filePath);
      logger.info(`Export ${exportId} downloaded by user ${userId}`);
      return buffer;
    } catch (error) {
      logger.error(`Failed to read export file: ${exportId}`, error);
      throw new AppError('Export file not found or corrupted', 404);
    }
  }

  async deleteExport(userId: string, exportId: string): Promise<void> {
    const job = this.exportJobs.get(exportId);

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== userId) {
      throw new AppError('Unauthorized access to export job', 403);
    }

    // Delete file if exists
    if (job.status === 'completed') {
      const filePath = path.join(this.exportDir, `${exportId}.${job.format}`);
      try {
        await fs.unlink(filePath);
        logger.info(`Export file deleted: ${exportId}`);
      } catch (error) {
        logger.warn(`Failed to delete export file: ${exportId}`, error);
      }
    }

    this.exportJobs.delete(exportId);
    logger.info(`Export job deleted: ${exportId}`);
  }

  async getUserExports(userId: string): Promise<ExportJob[]> {
    const userExports: ExportJob[] = [];

    for (const job of this.exportJobs.values()) {
      if (job.userId === userId) {
        userExports.push(job);
      }
    }

    return userExports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelExport(userId: string, exportId: string): Promise<void> {
    const job = this.exportJobs.get(exportId);

    if (!job) {
      throw new AppError('Export job not found', 404);
    }

    if (job.userId !== userId) {
      throw new AppError('Unauthorized access to export job', 403);
    }

    if (job.status === 'completed') {
      throw new AppError('Cannot cancel completed export', 400);
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';

    logger.info(`Export job cancelled: ${exportId}`);
  }
}

export const exportService = new ExportService();
