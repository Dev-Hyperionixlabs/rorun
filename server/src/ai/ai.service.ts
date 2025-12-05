import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import axios from 'axios';

@Injectable()
export class AiService {
  private aiServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:3001';
  }

  async processDocument(documentId: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document || document.ocrStatus !== 'pending') {
        return;
      }

      // Update status to processing
      await this.prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: 'processing' },
      });

      // Get document URL
      const documentUrl = await this.storageService.getSignedDownloadUrl(document.storageUrl);

      // Call AI service
      const response = await axios.post(`${this.aiServiceUrl}/ai/ocr`, {
        documentId,
        documentUrl,
        mimeType: document.mimeType,
      });

      const extractedData = response.data;

      // Update document with extracted metadata
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'success',
          extractedMetadataJson: extractedData,
        },
      });

      // If linked to transaction, update transaction with AI suggestions
      if (document.relatedTransactionId) {
        await this.updateTransactionWithAiSuggestions(
          document.relatedTransactionId,
          extractedData,
        );
      }
    } catch (error) {
      console.error(`Failed to process document ${documentId}:`, error);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: 'failed' },
      });
    }
  }

  private async updateTransactionWithAiSuggestions(
    transactionId: string,
    extractedData: any,
  ): Promise<void> {
    const updates: any = {};

    if (extractedData.suggestedType) {
      // Type is already set, but we can validate
    }

    if (extractedData.suggestedCategoryId) {
      updates.aiCategoryId = extractedData.suggestedCategoryId;
    }

    if (extractedData.aiConfidence !== undefined) {
      updates.aiConfidence = extractedData.aiConfidence;
    }

    if (extractedData.isBusinessProbability !== undefined) {
      updates.isBusinessFlag = extractedData.isBusinessProbability > 0.7;
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: updates,
      });

      // Auto-apply category if confidence is high
      if (extractedData.aiConfidence >= 0.8 && extractedData.suggestedCategoryId) {
        await this.prisma.transaction.update({
          where: { id: transactionId },
          data: { categoryId: extractedData.suggestedCategoryId },
        });
      }
    }
  }
}

