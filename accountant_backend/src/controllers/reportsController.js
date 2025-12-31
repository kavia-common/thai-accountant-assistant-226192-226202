const reportsService = require('../services/reportsService');

class ReportsController {
  async generateSummary(req, res, next) {
    try {
      const payload = await reportsService.generateSummary(req.body);
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  }

  async generatePnl(req, res, next) {
    try {
      const payload = await reportsService.generatePnl(req.body);
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  }

  async getSnapshot(req, res, next) {
    try {
      const { reportType } = req.params;
      const snap = await reportsService.getSnapshot({ reportType, ...req.query });
      return res.status(200).json(snap);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ReportsController();
