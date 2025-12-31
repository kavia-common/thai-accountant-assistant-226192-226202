const { query } = require('../db/pool');
const { ApiError } = require('../errors/apiError');

function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

class ReconciliationService {
  /**
   * PUBLIC_INTERFACE
   * Start a reconciliation run for a date range. Matches transactions with receipt uploads (placeholder).
   */
  async run({ periodStart, periodEnd }) {
    const runRes = await query(
      'INSERT INTO reconciliation_runs (status, notes) VALUES (\'running\', \'auto-run\')'
    );
    const runId = runRes.insertId;

    try {
      const txns = await query(
        'SELECT id, txn_date, amount, description FROM transactions WHERE txn_date BETWEEN ? AND ? ORDER BY txn_date, id',
        [String(periodStart).slice(0, 10), String(periodEnd).slice(0, 10)]
      );

      // Placeholder: receipts matching is very naive: if any receipt upload exists, link the newest receipt to each expense txn.
      const receipts = await query(
        'SELECT id, original_filename, upload_time FROM uploads WHERE upload_type = \'receipt\' ORDER BY upload_time DESC'
      );

      const receiptId = receipts.length ? receipts[0].id : null;

      for (const t of txns) {
        let matchStatus = 'unmatched';
        let confidence = 0.0;
        let notes = null;

        if (t.amount < 0 && receiptId) {
          matchStatus = 'partial';
          confidence = 0.35;
          notes = `Heuristic: assigned latest receipt upload to expense txn; desc=${normalize(
            t.description
          ).slice(0, 50)}`;
        }

        await query(
          'INSERT INTO reconciliation_results (run_id, transaction_id, receipt_upload_id, match_status, confidence, notes) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE receipt_upload_id=VALUES(receipt_upload_id), match_status=VALUES(match_status), confidence=VALUES(confidence), notes=VALUES(notes)',
          [runId, t.id, receiptId, matchStatus, confidence, notes]
        );
      }

      await query(
        'UPDATE reconciliation_runs SET status=\'completed\', finished_at=CURRENT_TIMESTAMP WHERE id=?',
        [runId]
      );

      return {
        run_id: runId,
        status: 'completed',
        transactions_processed: txns.length,
      };
    } catch (err) {
      await query(
        'UPDATE reconciliation_runs SET status=\'failed\', finished_at=CURRENT_TIMESTAMP, notes=? WHERE id=?',
        [String(err.message || err), runId]
      );
      throw new ApiError(500, 'RECONCILIATION_FAILED', 'Reconciliation failed', {
        run_id: runId,
      });
    }
  }

  /**
   * PUBLIC_INTERFACE
   * Get reconciliation run and results.
   */
  async getRun(runId) {
    const runs = await query(
      'SELECT id, started_at, finished_at, status, notes FROM reconciliation_runs WHERE id=?',
      [runId]
    );
    if (runs.length === 0) {
      throw new ApiError(404, 'RUN_NOT_FOUND', 'Reconciliation run not found');
    }

    const results = await query(
      'SELECT rr.id, rr.transaction_id, rr.receipt_upload_id, rr.match_status, rr.confidence, rr.notes, t.txn_date, t.amount, t.description FROM reconciliation_results rr JOIN transactions t ON t.id = rr.transaction_id WHERE rr.run_id = ? ORDER BY t.txn_date, t.id',
      [runId]
    );

    return { run: runs[0], results };
  }
}

module.exports = new ReconciliationService();
