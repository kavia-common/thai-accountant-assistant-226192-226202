const { z } = require('zod');

const uploadTypeEnum = z.enum(['bank_statement', 'receipt', 'other']);

const createUploadBody = z.object({
  uploadType: uploadTypeEnum,
});

const listUploadsQuery = z.object({
  uploadType: uploadTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const uploadIdParams = z.object({
  uploadId: z.coerce.number().int().positive(),
});

const reportGenBody = z.object({
  periodStart: z.string().min(10),
  periodEnd: z.string().min(10),
});

const reportSnapshotQuery = z.object({
  periodStart: z.string().min(10),
  periodEnd: z.string().min(10),
});

const reportTypeParams = z.object({
  reportType: z.enum(['summary', 'pnl']),
});

const reconciliationBody = z.object({
  periodStart: z.string().min(10),
  periodEnd: z.string().min(10),
});

const runIdParams = z.object({
  runId: z.coerce.number().int().positive(),
});

module.exports = {
  uploadTypeEnum,
  createUploadBody,
  listUploadsQuery,
  uploadIdParams,
  reportGenBody,
  reportSnapshotQuery,
  reportTypeParams,
  reconciliationBody,
  runIdParams,
};
