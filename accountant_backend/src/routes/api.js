const express = require('express');
const uploadsController = require('../controllers/uploadsController');
const extractionController = require('../controllers/extractionController');
const classificationController = require('../controllers/classificationController');
const reportsController = require('../controllers/reportsController');
const reconciliationController = require('../controllers/reconciliationController');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const schemas = require('../schemas');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Uploads
 *     description: Upload bank statements and receipts
 *   - name: Extraction
 *     description: Extract transactions from uploaded statements
 *   - name: Classification
 *     description: Classify transactions into Thai accounting categories
 *   - name: Reports
 *     description: Generate and retrieve report snapshots (summary & P&L)
 *   - name: Reconciliation
 *     description: Match receipts to transactions (placeholder)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Upload:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 123 }
 *         upload_type: { type: string, example: bank_statement }
 *         original_filename: { type: string, example: statement.pdf }
 *         mime_type: { type: string, example: application/pdf }
 *         file_size_bytes: { type: integer, example: 12400 }
 *         upload_time: { type: string, format: date-time }
 *         status: { type: string, example: uploaded }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: error }
 *         code: { type: string, example: VALIDATION_ERROR }
 *         message: { type: string, example: Invalid request }
 *         details: { type: object }
 */

/**
 * @swagger
 * /api/uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a file (bank statement or receipt)
 *     description: Accepts multipart/form-data with field name `file` and JSON field `uploadType` in body.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, uploadType]
 *             properties:
 *               uploadType:
 *                 type: string
 *                 enum: [bank_statement, receipt, other]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Upload' }
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/uploads',
  upload.single('file'),
  validate({ body: schemas.createUploadBody }),
  uploadsController.create.bind(uploadsController)
);

/**
 * @swagger
 * /api/uploads:
 *   get:
 *     tags: [Uploads]
 *     summary: List uploads
 *     parameters:
 *       - in: query
 *         name: uploadType
 *         schema: { type: string, enum: [bank_statement, receipt, other] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/uploads',
  validate({ query: schemas.listUploadsQuery }),
  uploadsController.list.bind(uploadsController)
);

/**
 * @swagger
 * /api/uploads/{uploadId}:
 *   get:
 *     tags: [Uploads]
 *     summary: Get upload by id
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  '/uploads/:uploadId',
  validate({ params: schemas.uploadIdParams }),
  uploadsController.get.bind(uploadsController)
);

/**
 * @swagger
 * /api/uploads/{uploadId}/extract:
 *   post:
 *     tags: [Extraction]
 *     summary: Extract transactions for an upload
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/uploads/:uploadId/extract',
  validate({ params: schemas.uploadIdParams }),
  extractionController.extract.bind(extractionController)
);

/**
 * @swagger
 * /api/uploads/{uploadId}/classify:
 *   post:
 *     tags: [Classification]
 *     summary: Classify all transactions for an upload
 *     description: Uses AI placeholder only if AI_CLASSIFICATION_ENABLED=true; otherwise heuristic.
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.post(
  '/uploads/:uploadId/classify',
  validate({ params: schemas.uploadIdParams }),
  classificationController.classifyUpload.bind(classificationController)
);

/**
 * @swagger
 * /api/uploads/{uploadId}/classifications:
 *   get:
 *     tags: [Classification]
 *     summary: List classifications for an upload
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/uploads/:uploadId/classifications',
  validate({ params: schemas.uploadIdParams }),
  classificationController.listByUpload.bind(classificationController)
);

/**
 * @swagger
 * /api/reports/summary:
 *   post:
 *     tags: [Reports]
 *     summary: Generate summary report snapshot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [periodStart, periodEnd]
 *             properties:
 *               periodStart: { type: string, example: '2025-01-01' }
 *               periodEnd: { type: string, example: '2025-01-31' }
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/reports/summary',
  validate({ body: schemas.reportGenBody }),
  reportsController.generateSummary.bind(reportsController)
);

/**
 * @swagger
 * /api/reports/pnl:
 *   post:
 *     tags: [Reports]
 *     summary: Generate P&L report snapshot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [periodStart, periodEnd]
 *             properties:
 *               periodStart: { type: string, example: '2025-01-01' }
 *               periodEnd: { type: string, example: '2025-01-31' }
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/reports/pnl',
  validate({ body: schemas.reportGenBody }),
  reportsController.generatePnl.bind(reportsController)
);

/**
 * @swagger
 * /api/reports/{reportType}/snapshot:
 *   get:
 *     tags: [Reports]
 *     summary: Get report snapshot
 *     parameters:
 *       - in: path
 *         name: reportType
 *         required: true
 *         schema: { type: string, enum: [summary, pnl] }
 *       - in: query
 *         name: periodStart
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: periodEnd
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get(
  '/reports/:reportType/snapshot',
  validate({ params: schemas.reportTypeParams, query: schemas.reportSnapshotQuery }),
  reportsController.getSnapshot.bind(reportsController)
);

/**
 * @swagger
 * /api/reconciliation/run:
 *   post:
 *     tags: [Reconciliation]
 *     summary: Run reconciliation for a period
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [periodStart, periodEnd]
 *             properties:
 *               periodStart: { type: string, example: '2025-01-01' }
 *               periodEnd: { type: string, example: '2025-01-31' }
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/reconciliation/run',
  validate({ body: schemas.reconciliationBody }),
  reconciliationController.run.bind(reconciliationController)
);

/**
 * @swagger
 * /api/reconciliation/runs/{runId}:
 *   get:
 *     tags: [Reconciliation]
 *     summary: Get reconciliation run results
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get(
  '/reconciliation/runs/:runId',
  validate({ params: schemas.runIdParams }),
  reconciliationController.getRun.bind(reconciliationController)
);

module.exports = router;
