const classificationService = require('../services/classificationService');

class ClassificationController {
  async classifyUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const result = await classificationService.classifyUpload(Number(uploadId));
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  async listByUpload(req, res, next) {
    try {
      const { uploadId } = req.params;
      const result = await classificationService.listByUpload(Number(uploadId));
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ClassificationController();
