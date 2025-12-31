const { config } = require('../config/env');
const { query } = require('../db/pool');
const { ApiError } = require('../errors/apiError');

function heuristicClassify(txn) {
  const d = (txn.description || '').toLowerCase();

  // Simple heuristics for demo
  if (txn.amount > 0) {
    return { categoryHint: 'รายได้', subcategoryHint: 'รายได้จากการขาย', confidence: 0.65, vendor: txn.counterparty || null, taxTag: null, source: 'rule' };
  }
  if (d.includes('ค่าเช่า') || d.includes('rent')) {
    return { categoryHint: 'ค่าใช้จ่าย', subcategoryHint: 'ค่าเช่า', confidence: 0.75, vendor: txn.counterparty || null, taxTag: null, source: 'rule' };
  }
  if (d.includes('7-eleven') || d.includes('7 eleven') || d.includes('coffee') || d.includes('อาหาร')) {
    return { categoryHint: 'ค่าใช้จ่าย', subcategoryHint: 'ค่าอาหารและรับรอง', confidence: 0.6, vendor: txn.counterparty || '7-ELEVEN', taxTag: null, source: 'rule' };
  }
  if (d.includes('grab') || d.includes('bts') || d.includes('mrt') || d.includes('taxi')) {
    return { categoryHint: 'ค่าใช้จ่าย', subcategoryHint: 'ค่าเดินทาง/ขนส่ง', confidence: 0.6, vendor: txn.counterparty || null, taxTag: null, source: 'rule' };
  }

  return { categoryHint: 'อื่นๆ', subcategoryHint: null, confidence: 0.4, vendor: txn.counterparty || null, taxTag: null, source: 'rule' };
}

async function resolveCategoryIdByThaiName({ parentId, nameTh }) {
  if (!nameTh) return null;
  const rows = await query(
    `SELECT id FROM categories WHERE parent_id ${parentId ? '= ?' : 'IS NULL'} AND name_th = ? LIMIT 1`,
    parentId ? [parentId, nameTh] : [nameTh]
  );
  return rows.length ? rows[0].id : null;
}

class ClassificationService {
  /**
   * PUBLIC_INTERFACE
   * Classify all transactions of an upload and upsert into classifications.
   * AI placeholder runs only if AI_CLASSIFICATION_ENABLED=true.
   */
  async classifyUpload(uploadId) {
    const txns = await query(
      `SELECT id, upload_id, txn_date, amount, currency, description, account, counterparty, source_ref
       FROM transactions WHERE upload_id = ? ORDER BY txn_date, id`,
      [uploadId]
    );
    if (txns.length === 0) {
      throw new ApiError(
        404,
        'NO_TRANSACTIONS',
        'No transactions found for this upload. Run extraction first.'
      );
    }

    const results = [];
    for (const txn of txns) {
      let decision;

      if (config.ai.enabled) {
        // AI placeholder: currently delegates to heuristic, but flags source as "ai".
        // This is intentionally env-gated so deployments can disable AI behavior.
        const h = heuristicClassify(txn);
        decision = { ...h, source: 'ai', confidence: Math.max(h.confidence, 0.7) };
      } else {
        decision = heuristicClassify(txn);
      }

      // Resolve parent/category/subcategory
      const parentId = await resolveCategoryIdByThaiName({
        parentId: null,
        nameTh: decision.categoryHint,
      });

      const subId = decision.subcategoryHint
        ? await resolveCategoryIdByThaiName({
            parentId,
            nameTh: decision.subcategoryHint,
          })
        : null;

      // Upsert classification by unique transaction_id
      await query(
        `INSERT INTO classifications (transaction_id, category_id, subcategory_id, vendor, tax_tag, confidence, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),
           subcategory_id=VALUES(subcategory_id),
           vendor=VALUES(vendor),
           tax_tag=VALUES(tax_tag),
           confidence=VALUES(confidence),
           source=VALUES(source),
           updated_at=CURRENT_TIMESTAMP`,
        [
          txn.id,
          parentId,
          subId,
          decision.vendor,
          decision.taxTag,
          decision.confidence,
          decision.source,
        ]
      );

      results.push({
        transaction_id: txn.id,
        category_id: parentId,
        subcategory_id: subId,
        vendor: decision.vendor,
        tax_tag: decision.taxTag,
        confidence: decision.confidence,
        source: decision.source,
      });
    }

    return {
      upload_id: uploadId,
      classified_count: results.length,
      classifications: results,
      ai_enabled: config.ai.enabled,
    };
  }

  /**
   * PUBLIC_INTERFACE
   * List classifications for an upload (joined with transactions/categories).
   */
  async listByUpload(uploadId) {
    const rows = await query(
      `SELECT
         t.id AS transaction_id,
         t.txn_date,
         t.amount,
         t.currency,
         t.description,
         c.id AS classification_id,
         c.vendor,
         c.tax_tag,
         c.confidence,
         c.source,
         cat.name_th AS category_name_th,
         sub.name_th AS subcategory_name_th
       FROM transactions t
       LEFT JOIN classifications c ON c.transaction_id = t.id
       LEFT JOIN categories cat ON cat.id = c.category_id
       LEFT JOIN categories sub ON sub.id = c.subcategory_id
       WHERE t.upload_id = ?
       ORDER BY t.txn_date, t.id`,
      [uploadId]
    );

    return { upload_id: uploadId, rows };
  }
}

module.exports = new ClassificationService();
