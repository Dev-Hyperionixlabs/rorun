import { Controller, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeviceDto } from './dto/device.dto';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register device for push notifications' })
  async register(@Request() req, @Body() dto: CreateDeviceDto) {
    return this.devicesService.register(req.user.id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiOperation({ summary: 'Unregister device' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.devicesService.remove(id, req.user.id);
  }
}
