import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';

@ApiTags('knowledge')
@Controller('knowledge/articles')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiOperation({ summary: 'Get all knowledge articles' })
  async findAll(@Query('language') language?: string, @Query('tags') tags?: string) {
    const tagArray = tags ? tags.split(',') : undefined;
    return this.knowledgeService.findAll(language, tagArray);
  }

  @Get(':slug')
  @ApiParam({ name: 'slug', description: 'Article slug' })
  @ApiQuery({ name: 'language', required: false })
  @ApiOperation({ summary: 'Get article by slug' })
  async findOne(@Param('slug') slug: string, @Query('language') language?: string) {
    return this.knowledgeService.findOne(slug, language || 'en');
  }
}
