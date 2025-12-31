const reconciliationService = require('../services/reconciliationService');

class ReconciliationController {
  async run(req, res, next) {
    try {
      const result = await reconciliationService.run(req.body);
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  }

  async getRun(req, res, next) {
    try {
      const { runId } = req.params;
      const result = await reconciliationService.getRun(Number(runId));
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ReconciliationController();
