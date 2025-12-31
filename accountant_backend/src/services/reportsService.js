const { query } = require('../db/pool');
const { ApiError } = require('../errors/apiError');

function toDateOnly(d) {
  return String(d).slice(0, 10);
}

class ReportsService {
  /**
   * PUBLIC_INTERFACE
   * Generate summary report for a period.
   */
  async generateSummary({ periodStart, periodEnd }) {
    const start = toDateOnly(periodStart);
    const end = toDateOnly(periodEnd);

    const totals = await query(
      `SELECT
         COUNT(*) AS txn_count,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS total_expense
       FROM transactions
       WHERE txn_date BETWEEN ? AND ?`,
      [start, end]
    );

    const payload = {
      period_start: start,
      period_end: end,
      txn_count: Number(totals[0]?.txn_count || 0),
      total_income: Number(totals[0]?.total_income || 0),
      total_expense: Number(totals[0]?.total_expense || 0),
      net: Number(totals[0]?.total_income || 0) - Number(totals[0]?.total_expense || 0),
    };

    await query(
      `INSERT INTO reports_summary (period_start, period_end, payload_json)
       VALUES (?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json), generated_at=CURRENT_TIMESTAMP`,
      [start, end, JSON.stringify(payload)]
    );

    await query(
      `INSERT INTO reports (report_type, period_start, period_end, payload_json)
       VALUES ('summary', ?, ?, CAST(? AS JSON))`,
      [start, end, JSON.stringify(payload)]
    );

    return payload;
  }

  /**
   * PUBLIC_INTERFACE
   * Generate P&L report for a period (grouped by category type/name).
   */
  async generatePnl({ periodStart, periodEnd }) {
    const start = toDateOnly(periodStart);
    const end = toDateOnly(periodEnd);

    // Join classifications -> categories for type
    const rows = await query(
      `SELECT
         COALESCE(cat.type, 'other') AS category_type,
         COALESCE(cat.name_th, 'Unclassified') AS category_name_th,
         SUM(t.amount) AS sum_amount
       FROM transactions t
       LEFT JOIN classifications c ON c.transaction_id = t.id
       LEFT JOIN categories cat ON cat.id = c.category_id
       WHERE t.txn_date BETWEEN ? AND ?
       GROUP BY COALESCE(cat.type, 'other'), COALESCE(cat.name_th, 'Unclassified')
       ORDER BY category_type, category_name_th`,
      [start, end]
    );

    const lines = rows.map((r) => ({
      category_type: r.category_type,
      category_name_th: r.category_name_th,
      sum_amount: Number(r.sum_amount || 0),
    }));

    const totals = lines.reduce(
      (acc, line) => {
        if (line.category_type === 'income') acc.income += line.sum_amount;
        else if (line.category_type === 'cogs') acc.cogs += line.sum_amount;
        else if (line.category_type === 'expense') acc.expense += line.sum_amount;
        else acc.other += line.sum_amount;
        return acc;
      },
      { income: 0, cogs: 0, expense: 0, other: 0 }
    );

    const payload = {
      period_start: start,
      period_end: end,
      lines,
      totals,
      gross_profit: totals.income + totals.cogs, // note: cogs likely negative amounts
      net_profit: totals.income + totals.cogs + totals.expense + totals.other,
    };

    await query(
      `INSERT INTO reports_pnl_snapshots (period_start, period_end, payload_json)
       VALUES (?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json), generated_at=CURRENT_TIMESTAMP`,
      [start, end, JSON.stringify(payload)]
    );

    await query(
      `INSERT INTO reports (report_type, period_start, period_end, payload_json)
       VALUES ('pnl', ?, ?, CAST(? AS JSON))`,
      [start, end, JSON.stringify(payload)]
    );

    return payload;
  }

  /**
   * PUBLIC_INTERFACE
   * Fetch a stored report snapshot by type and period.
   */
  async getSnapshot({ reportType, periodStart, periodEnd }) {
    const start = toDateOnly(periodStart);
    const end = toDateOnly(periodEnd);

    let table;
    if (reportType === 'summary') table = 'reports_summary';
    else if (reportType === 'pnl') table = 'reports_pnl_snapshots';
    else throw new ApiError(400, 'INVALID_REPORT_TYPE', 'Invalid report type');

    const rows = await query(
      `SELECT id, period_start, period_end, generated_at, payload_json
       FROM ${table}
       WHERE period_start = ? AND period_end = ?
       LIMIT 1`,
      [start, end]
    );

    if (rows.length === 0) {
      throw new ApiError(404, 'REPORT_NOT_FOUND', 'Report snapshot not found');
    }

    return rows[0];
  }
}

module.exports = new ReportsService();
