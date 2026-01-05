import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class StorageService {
  private s3: AWS.S3;
  private bucket: string;

  constructor(private configService: ConfigService) {
    // Support both S3_* (preferred) and AWS_* (legacy) env var names
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') || this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') || this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('S3_REGION') || this.configService.get<string>('AWS_REGION') || 'auto';
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || this.configService.get<string>('AWS_S3_ENDPOINT');
    const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    this.bucket = this.configService.get<string>('S3_BUCKET') || this.configService.get<string>('AWS_S3_BUCKET') || 'rorun-documents';

    const s3Config: AWS.S3.ClientConfiguration = {
      region,
    };

    if (accessKeyId && secretAccessKey) {
      s3Config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.s3ForcePathStyle = forcePathStyle || true;
    }

    this.s3 = new AWS.S3(s3Config);
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Expires: expiresIn,
    };

    return this.s3.getSignedUrlPromise('putObject', params);
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  async headObject(key: string): Promise<{ contentType?: string; contentLength?: number }> {
    const head = await this.s3
      .headObject({
        Bucket: this.bucket,
        Key: key,
      })
      .promise();
    return {
      contentType: head.ContentType,
      contentLength: head.ContentLength,
    };
  }

  async getObjectRange(key: string, bytes: number): Promise<Buffer> {
    const res = await this.s3
      .getObject({
        Bucket: this.bucket,
        Key: key,
        Range: `bytes=0-${Math.max(0, bytes - 1)}`,
      })
      .promise();
    const body = res.Body;
    if (!body) return Buffer.alloc(0);
    return Buffer.isBuffer(body) ? body : Buffer.from(body as any);
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3
      .deleteObject({
        Bucket: this.bucket,
        Key: key,
      })
      .promise();
  }

  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
      .promise();

    return key;
  }

  async getObjectBuffer(key: string): Promise<{ buffer: Buffer; contentType?: string }> {
    const res = await this.s3
      .getObject({
        Bucket: this.bucket,
        Key: key,
      })
      .promise();
    const body = res.Body;
    const buffer = !body ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body as any);
    return { buffer, contentType: res.ContentType };
  }
}
