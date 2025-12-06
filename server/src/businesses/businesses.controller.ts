import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  async create(@Request() req, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all businesses for current user' })
  async findAll(@Request() req) {
    return this.businessesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get business by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.businessesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Update business' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(id, req.user.id, dto);
  }
}
