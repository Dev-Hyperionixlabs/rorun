import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

function pickCountry(headers: Record<string, any>): { countryCode: string | null; source: string | null } {
  const candidates: Array<[string, string]> = [
    ['cf-ipcountry', 'cloudflare'],
    ['x-vercel-ip-country', 'vercel'],
    ['x-country-code', 'generic'],
    ['x-country', 'generic'],
    ['cloudfront-viewer-country', 'cloudfront'],
    ['fastly-client-country', 'fastly'],
  ];

  for (const [key, source] of candidates) {
    const val = headers[key] || headers[key.toLowerCase()];
    if (typeof val === 'string' && val.trim()) return { countryCode: val.trim().toUpperCase(), source };
    if (Array.isArray(val) && typeof val[0] === 'string' && val[0].trim())
      return { countryCode: val[0].trim().toUpperCase(), source };
  }

  return { countryCode: null, source: null };
}

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  @Get()
  @ApiOperation({ summary: 'Best-effort geo inference (country code). No bypass guidance.' })
  getGeo(@Req() req: Request) {
    const { countryCode, source } = pickCountry(req.headers as any);
    const isNG = countryCode ? countryCode === 'NG' : null;

    return {
      countryCode,
      isNG,
      source,
    };
  }
}


