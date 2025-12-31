const { query } = require('../db/pool');
const { ApiError } = require('../errors/apiError');
const uploadsService = require('./uploadsService');

function normalizeText(s) {
  if (!s) return null;
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

class ExtractionService {
  /**
   * PUBLIC_INTERFACE
   * Placeholder statement extraction:
   * - Marks upload processing
   * - Inserts a small set of demo transactions (or none if already present)
   */
  async extractTransactions(uploadId) {
    const upload = await uploadsService.getUpload(uploadId);
    if (upload.upload_type !== 'bank_statement') {
      throw new ApiError(
        400,
        'INVALID_UPLOAD_TYPE',
        'Extraction currently supports bank_statement uploads only'
      );
    }

    await uploadsService.setStatus(uploadId, 'processing');

    // idempotency: if transactions already exist for upload, return them
    const existing = await query(
      `SELECT id, upload_id, txn_date, amount, currency, description, account, counterparty, source_ref
       FROM transactions WHERE upload_id = ? ORDER BY txn_date, id`,
      [uploadId]
    );
    if (existing.length > 0) {
      await uploadsService.setStatus(uploadId, 'processed');
      return { inserted: 0, transactions: existing };
    }

    // Demo extracted transactions. In a real system, parse upload.stored_filename file.
    const demo = [
      {
        txn_date: '2025-01-05',
        amount: -250.0,
        currency: 'THB',
        description: '7-ELEVEN ถนนสุขุมวิท',
        account: 'Main',
        counterparty: '7-ELEVEN',
        source_ref: `upload:${uploadId}:1`,
      },
      {
        txn_date: '2025-01-06',
        amount: -1800.0,
        currency: 'THB',
        description: 'ค่าเช่าออฟฟิศ เดือนมกราคม',
        account: 'Main',
        counterparty: 'Landlord',
        source_ref: `upload:${uploadId}:2`,
      },
      {
        txn_date: '2025-01-07',
        amount: 15000.0,
        currency: 'THB',
        description: 'เงินโอนเข้าจากลูกค้า A',
        account: 'Main',
        counterparty: 'Customer A',
        source_ref: `upload:${uploadId}:3`,
      },
    ];

    let inserted = 0;
    for (const d of demo) {
      const result = await query(
        `INSERT INTO transactions
          (upload_id, txn_date, amount, currency, description, account, counterparty, source_ref,
           normalized_description, normalized_counterparty, normalized_account)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uploadId,
          d.txn_date,
          d.amount,
          d.currency,
          d.description,
          d.account,
          d.counterparty,
          d.source_ref,
          normalizeText(d.description),
          normalizeText(d.counterparty),
          normalizeText(d.account),
        ]
      );
      inserted += result.affectedRows || 1;
    }

    await uploadsService.setStatus(uploadId, 'processed');

    const rows = await query(
      `SELECT id, upload_id, txn_date, amount, currency, description, account, counterparty, source_ref
       FROM transactions WHERE upload_id = ? ORDER BY txn_date, id`,
      [uploadId]
    );

    return { inserted, transactions: rows };
  }
}

module.exports = new ExtractionService();
