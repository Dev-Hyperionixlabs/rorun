import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private validateAdmin(headers: any) {
    const adminKey = headers['x-admin-key'];
    if (!adminKey || !this.adminService.validateAdminKey(adminKey)) {
      throw new UnauthorizedException('Invalid admin key');
    }
  }

  @Get('businesses')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get all businesses (admin only)' })
  async getBusinesses(@Headers() headers: any) {
    this.validateAdmin(headers);
    return this.adminService.getBusinesses();
  }

  @Get('users')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async getUsers(@Headers() headers: any) {
    this.validateAdmin(headers);
    return this.adminService.getUsers();
  }

  @Get('tax-rules')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get all tax rules (admin only)' })
  async getTaxRules(@Headers() headers: any) {
    this.validateAdmin(headers);
    return this.adminService.getTaxRules();
  }

  @Post('tax-rules')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Create tax rule (admin only)' })
  async createTaxRule(@Headers() headers: any, @Body() data: any) {
    this.validateAdmin(headers);
    return this.adminService.createTaxRule(data);
  }

  @Put('tax-rules/:id')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Update tax rule (admin only)' })
  async updateTaxRule(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    this.validateAdmin(headers);
    return this.adminService.updateTaxRule(id, data);
  }

  @Get('knowledge-articles')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get all knowledge articles (admin only)' })
  async getKnowledgeArticles(@Headers() headers: any) {
    this.validateAdmin(headers);
    return this.adminService.getKnowledgeArticles();
  }

  @Post('knowledge-articles')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Create knowledge article (admin only)' })
  async createKnowledgeArticle(@Headers() headers: any, @Body() data: any) {
    this.validateAdmin(headers);
    return this.adminService.createKnowledgeArticle(data);
  }

  @Put('knowledge-articles/:id')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Update knowledge article (admin only)' })
  async updateKnowledgeArticle(
    @Headers() headers: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.validateAdmin(headers);
    return this.adminService.updateKnowledgeArticle(id, data);
  }

  @Get('workspaces')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'List workspaces with filters' })
  async listWorkspaces(
    @Headers() headers: any,
    @Query('q') q?: string,
    @Query('plan') plan?: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.validateAdmin(headers);
    return this.adminService.listWorkspaces({
      q,
      plan,
      state,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('workspaces/:id')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get workspace detail (admin)' })
  async getWorkspace(@Headers() headers: any, @Param('id') id: string) {
    this.validateAdmin(headers);
    return this.adminService.getWorkspaceDetail(id);
  }

  @Post('workspaces/:id/plan')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Set workspace plan (admin)' })
  async setWorkspacePlan(
    @Headers() headers: any,
    @Param('id') id: string,
    @Body('planId') planId: string,
  ) {
    this.validateAdmin(headers);
    return this.adminService.setWorkspacePlan(id, planId);
  }

  @Get('workspaces/:id/filing-packs')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'List filing packs for a workspace (admin)' })
  async listFilingPacks(@Headers() headers: any, @Param('id') id: string) {
    this.validateAdmin(headers);
    return this.adminService.listFilingPacks(id);
  }

  @Post('workspaces/:id/filing-packs')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Regenerate filing pack for a workspace (admin)' })
  async regenerateFilingPack(
    @Headers() headers: any,
    @Param('id') id: string,
    @Body('year') year: number,
  ) {
    this.validateAdmin(headers);
    return this.adminService.regenerateFilingPack(id, year);
  }

  @Get('workspaces/:id/alerts')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'List alerts/notifications for a workspace (admin)' })
  async listAlerts(
    @Headers() headers: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.validateAdmin(headers);
    return this.adminService.listWorkspaceAlerts(id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('impersonate')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Generate impersonation token for a user (admin)' })
  async impersonateUser(@Headers() headers: any, @Body('userId') userId: string) {
    this.validateAdmin(headers);
    return this.adminService.generateImpersonationToken(userId);
  }

  @Get('dashboard-stats')
  @ApiHeader({ name: 'x-admin-key', required: true })
  @ApiOperation({ summary: 'Get high-level admin dashboard stats' })
  async getDashboardStats(@Headers() headers: any) {
    this.validateAdmin(headers);
    return this.adminService.getDashboardStats();
  }
}
