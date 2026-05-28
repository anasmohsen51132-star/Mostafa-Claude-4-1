import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { logger } from '@/lib/logger';

let s3: S3Client | null = null;
const getS3 = () => {
  if (!s3) {
    s3 = new S3Client({
      region: config.storage.region,
      credentials: config.storage.accessKey
        ? { accessKeyId: config.storage.accessKey, secretAccessKey: config.storage.secretKey! }
        : undefined,
    });
  }
  return s3;
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_DOC_TYPES = ['application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError(`نوع الملف غير مدعوم: ${file.mimetype}`, 400, 'INVALID_FILE_TYPE'));
  },
});

export const mediaService = {
  async uploadToS3(file: Express.Multer.File, folder: string, userId: string): Promise<{
    key: string; url: string; cdnUrl?: string; size: number;
  }> {
    if (!config.storage.bucket) throw new AppError('Storage not configured', 503, 'SERVICE_UNAVAILABLE');

    const ext = path.extname(file.originalname).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const key = `${folder}/${userId}/${Date.now()}-${hash}${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: 'inline',
      Metadata: { uploadedBy: userId, originalName: file.originalname },
    });

    await getS3().send(command);

    const url = `https://${config.storage.bucket}.s3.${config.storage.region}.amazonaws.com/${key}`;
    const cdnUrl = config.storage.cdnUrl ? `${config.storage.cdnUrl}/${key}` : undefined;

    await prisma.mediaUpload.create({
      data: {
        key, bucket: config.storage.bucket!, url, cdnUrl,
        filename: file.originalname, mimeType: file.mimetype,
        size: BigInt(file.size), uploadedBy: userId,
      },
    });

    logger.info({ key, size: file.size, userId }, 'File uploaded to S3');
    return { key, url, cdnUrl, size: file.size };
  },

  async getPresignedUploadUrl(data: { folder: string; filename: string; contentType: string; userId: string }) {
    if (!config.storage.bucket) throw new AppError('Storage not configured', 503, 'SERVICE_UNAVAILABLE');

    const ext = path.extname(data.filename).toLowerCase();
    const hash = crypto.randomBytes(16).toString('hex');
    const key = `${data.folder}/${data.userId}/${Date.now()}-${hash}${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
      ContentType: data.contentType,
    });

    const presignedUrl = await getSignedUrl(getS3(), command, { expiresIn: 3600 });
    return { presignedUrl, key };
  },

  async deleteFromS3(key: string) {
    if (!config.storage.bucket) return;
    const command = new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key });
    await getS3().send(command);
    await prisma.mediaUpload.deleteMany({ where: { key } });
  },
};

// Router
export const mediaRouter = Router();
mediaRouter.use(authenticate);

mediaRouter.post('/upload', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('لم يتم رفع أي ملف', 400, 'NO_FILE');
  const folder = req.body.folder || 'uploads';
  const result = await mediaService.uploadToS3(req.file, folder, req.user!.id);
  res.json({ success: true, data: result });
});

mediaRouter.post('/presigned-url', requireAdmin, async (req: Request, res: Response) => {
  const { filename, contentType, folder } = req.body;
  const result = await mediaService.getPresignedUploadUrl({
    folder: folder || 'videos', filename, contentType, userId: req.user!.id,
  });
  res.json({ success: true, data: result });
});

mediaRouter.post('/thumbnail', requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('لم يتم رفع أي صورة', 400, 'NO_FILE');
  if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
    throw new AppError('يجب رفع صورة', 400, 'INVALID_FILE_TYPE');
  }
  const result = await mediaService.uploadToS3(req.file, 'thumbnails', req.user!.id);
  res.json({ success: true, data: result });
});
