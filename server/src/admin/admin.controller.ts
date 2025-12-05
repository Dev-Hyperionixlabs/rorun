import { Controller, Get, Post, Put, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
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
  async updateKnowledgeArticle(@Headers() headers: any, @Param('id') id: string, @Body() data: any) {
    this.validateAdmin(headers);
    return this.adminService.updateKnowledgeArticle(id, data);
  }
}

