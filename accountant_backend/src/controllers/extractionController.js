const extractionService = require('../services/extractionService');

class ExtractionController {
  async extract(req, res, next) {
    try {
      const { uploadId } = req.params;
      const result = await extractionService.extractTransactions(Number(uploadId));
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ExtractionController();
