import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceTasksGenerator } from './compliance-tasks.generator';
import { TaskQueryDto, AddEvidenceDto } from './dto/compliance-task.dto';

@Injectable()
export class ComplianceTasksService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private auditService: AuditService,
    private generator: ComplianceTasksGenerator,
  ) {}

  async findAll(businessId: string, userId: string, query: TaskQueryDto) {
    await this.businessesService.findOne(businessId, userId);

    const where: any = { businessId };
    if (query.taxYear) where.taxYear = query.taxYear;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from) where.dueDate.gte = new Date(query.from);
      if (query.to) where.dueDate.lte = new Date(query.to);
    }

    const tasks = await this.prisma.complianceTask.findMany({
      where,
      include: {
        evidenceLinks: {
          include: {
            document: {
              select: {
                id: true,
                type: true,
                storageUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: [
        // Overdue first
        {
          status: 'asc',
        },
        // Then by due date
        {
          dueDate: 'asc',
        },
        // Then by priority
        {
          priority: 'asc',
        },
      ],
      take: query.limit || 50,
      skip: query.offset || 0,
    });

    // Sort manually to ensure overdue/open come first
    return tasks.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        overdue: 0,
        open: 1,
        in_progress: 2,
        done: 3,
        dismissed: 4,
      };
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  async findOne(taskId: string, businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const task = await this.prisma.complianceTask.findUnique({
      where: { id: taskId },
      include: {
        evidenceLinks: {
          include: {
            document: {
              select: {
                id: true,
                type: true,
                storageUrl: true,
                mimeType: true,
                size: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.businessId !== businessId) {
      throw new ForbiddenException('Task does not belong to this business');
    }

    return task;
  }

  async startTask(taskId: string, businessId: string, userId: string, ip?: string, userAgent?: string) {
    const task = await this.findOne(taskId, businessId, userId);

    if (task.status !== 'open' && task.status !== 'overdue') {
      throw new BadRequestException('Task cannot be started from current status');
    }

    const updated = await this.prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        updatedAt: new Date(),
      },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.start',
      entityType: 'ComplianceTask',
      entityId: taskId,
      metaJson: { previousStatus: task.status },
      ip,
      userAgent,
    });

    return updated;
  }

  async completeTask(taskId: string, businessId: string, userId: string, ip?: string, userAgent?: string) {
    const task = await this.findOne(taskId, businessId, userId);

    if (task.status === 'done' || task.status === 'dismissed') {
      throw new BadRequestException('Task is already completed or dismissed');
    }

    const updated = await this.prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        status: 'done',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.complete',
      entityType: 'ComplianceTask',
      entityId: taskId,
      metaJson: { previousStatus: task.status },
      ip,
      userAgent,
    });

    return updated;
  }

  async dismissTask(taskId: string, businessId: string, userId: string, ip?: string, userAgent?: string) {
    const task = await this.findOne(taskId, businessId, userId);

    if (task.status === 'done') {
      throw new BadRequestException('Cannot dismiss a completed task');
    }

    const updated = await this.prisma.complianceTask.update({
      where: { id: taskId },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.dismiss',
      entityType: 'ComplianceTask',
      entityId: taskId,
      metaJson: { previousStatus: task.status },
      ip,
      userAgent,
    });

    return updated;
  }

  async addEvidence(
    taskId: string,
    businessId: string,
    userId: string,
    dto: AddEvidenceDto,
    ip?: string,
    userAgent?: string,
  ) {
    const task = await this.findOne(taskId, businessId, userId);

    // Verify document belongs to business
    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.businessId !== businessId) {
      throw new ForbiddenException('Document does not belong to this business');
    }

    const link = await this.prisma.taskEvidenceLink.create({
      data: {
        taskId,
        documentId: dto.documentId,
        note: dto.note || null,
      },
      include: {
        document: {
          select: {
            id: true,
            type: true,
            storageUrl: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
      },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.evidence.add',
      entityType: 'ComplianceTask',
      entityId: taskId,
      metaJson: { documentId: dto.documentId, linkId: link.id },
      ip,
      userAgent,
    });

    return link;
  }

  async removeEvidence(
    taskId: string,
    linkId: string,
    businessId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    const task = await this.findOne(taskId, businessId, userId);

    const link = await this.prisma.taskEvidenceLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Evidence link not found');
    }

    if (link.taskId !== taskId) {
      throw new ForbiddenException('Evidence link does not belong to this task');
    }

    await this.prisma.taskEvidenceLink.delete({
      where: { id: linkId },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.evidence.remove',
      entityType: 'ComplianceTask',
      entityId: taskId,
      metaJson: { linkId, documentId: link.documentId },
      ip,
      userAgent,
    });

    return { success: true };
  }

  async regenerateTasks(businessId: string, userId: string, taxYear?: number) {
    await this.businessesService.findOne(businessId, userId);

    const targetYear = taxYear || new Date().getFullYear();
    const count = await this.generator.generateTasksForBusiness(businessId, targetYear);

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'task.regenerate',
      entityType: 'Business',
      entityId: businessId,
      metaJson: { taxYear: targetYear, tasksGenerated: count },
    });

    return { tasksGenerated: count, taxYear: targetYear };
  }
}

