import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('clients')
@Controller('businesses/:businessId/clients')
@UseGuards(JwtAuthGuard, BusinessRoleGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'Create a client' })
  async create(@Param('businessId') businessId: string, @Request() req: any, @Body() dto: CreateClientDto) {
    return this.clientsService.create(businessId, req.user.id, dto);
  }

  @Get()
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiOperation({ summary: 'List clients' })
  async list(@Param('businessId') businessId: string, @Request() req: any) {
    return this.clientsService.list(businessId, req.user.id);
  }

  @Get(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOperation({ summary: 'Get client' })
  async get(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any) {
    return this.clientsService.get(businessId, req.user.id, id);
  }

  @Put(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOperation({ summary: 'Update client' })
  async update(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(businessId, req.user.id, id, dto);
  }

  @Delete(':id')
  @RequireBusinessRoles('owner', 'member', 'accountant')
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOperation({ summary: 'Delete client' })
  async remove(@Param('businessId') businessId: string, @Param('id') id: string, @Request() req: any) {
    return this.clientsService.remove(businessId, req.user.id, id);
  }
}


