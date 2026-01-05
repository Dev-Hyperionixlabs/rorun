import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { Response } from 'express';
import { renderInvoicePdf } from './invoice-pdf';
import { StorageService } from '../storage/storage.service';

@ApiTags('invoices')
@Controller('businesses/:businessId/invoices')
@UseGuards(JwtAuthGuard, BusinessRoleGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async create(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(businessId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices for a business' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async findAll(@Param('businessId') businessId: string, @Request() req) {
    return this.invoicesService.findAll(businessId, req.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Get invoice by ID' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.invoicesService.findOne(id, req.user.id);
  }

  @Get(':id/pdf')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Download invoice PDF' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async downloadPdf(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const data = await this.invoicesService.getInvoicePdfData(businessId, req.user.id, id);
    const business = data.business;
    const invoice = data;
    const templateKey = ((invoice.templateKey || business.invoiceTemplateKey || 'classic') as string).toLowerCase();
    const safeTemplate =
      templateKey === 'modern' || templateKey === 'minimal' || templateKey === 'classic' ? templateKey : 'classic';

    // Prefer reading logo bytes from storage directly (more reliable than signed-URL fetch).
    let logoBuffer: Buffer | null = null;
    let resolvedLogoUrl: string | null = (business.invoiceLogoUrl || null) as any;
    try {
      if (resolvedLogoUrl && typeof resolvedLogoUrl === 'string' && resolvedLogoUrl.startsWith('businesses/')) {
        const obj = await this.storageService.getObjectBuffer(resolvedLogoUrl);
        logoBuffer = obj.buffer?.length ? obj.buffer : null;
        resolvedLogoUrl = null;
      }
    } catch {
      // ignore; pdf generation will proceed without a logo
      logoBuffer = null;
    }

    let buf: Buffer;
    try {
      buf = await renderInvoicePdf({
        templateKey: safeTemplate as any,
        business: {
          name: business.name,
          invoiceDisplayName: business.invoiceDisplayName,
          invoiceLogoUrl: resolvedLogoUrl,
          invoiceLogoBuffer: logoBuffer,
          invoiceAddressLine1: business.invoiceAddressLine1,
          invoiceAddressLine2: business.invoiceAddressLine2,
          invoiceCity: business.invoiceCity,
          invoiceState: business.invoiceState,
          invoiceCountry: business.invoiceCountry,
          invoicePostalCode: business.invoicePostalCode,
          invoiceFooterNote: business.invoiceFooterNote,
          paymentBankName: business.paymentBankName,
          paymentAccountName: business.paymentAccountName,
          paymentAccountNumber: business.paymentAccountNumber,
          paymentInstructionsNote: business.paymentInstructionsNote,
        },
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: new Date(invoice.issueDate),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
          currency: invoice.currency || 'NGN',
          notes: invoice.notes || null,
          subtotalAmount: Number(invoice.subtotalAmount || 0),
          taxType: invoice.taxType || 'none',
          taxLabel: invoice.taxLabel || null,
          taxRate: invoice.taxRate !== null && invoice.taxRate !== undefined ? Number(invoice.taxRate) : null,
          taxAmount: invoice.taxAmount !== null && invoice.taxAmount !== undefined ? Number(invoice.taxAmount) : null,
          totalAmount: Number(invoice.totalAmount || 0),
        },
        client: invoice.client
          ? { name: invoice.client.name, email: invoice.client.email, phone: invoice.client.phone }
          : null,
        job: invoice.job ? { title: invoice.job.title } : null,
        items: (invoice.items || []).map((it: any) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
        })),
      });
    } catch (err: any) {
      // Deterministic error for the UI; details stay in logs via GlobalExceptionFilter.
      throw new HttpException(
        {
          code: 'PDF_RENDER_FAILED',
          message: err?.message || 'Failed to generate PDF',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const filename = `Invoice-${invoice.invoiceNumber || invoice.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buf);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Update invoice' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, req.user.id, dto);
  }

  @Post(':id/mark-paid')
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async markPaid(@Param('id') id: string, @Request() req) {
    return this.invoicesService.markPaid(id, req.user.id);
  }
}
