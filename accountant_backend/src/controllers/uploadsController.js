const uploadsService = require('../services/uploadsService');

class UploadsController {
  async create(req, res, next) {
    try {
      const { uploadType } = req.body;
      const created = await uploadsService.createUpload({
        uploadType,
        file: req.file,
      });
      return res.status(201).json(created);
    } catch (err) {
      return next(err);
    }
  }

  async list(req, res, next) {
    try {
      const rows = await uploadsService.listUploads(req.query);
      return res.status(200).json({ rows });
    } catch (err) {
      return next(err);
    }
  }

  async get(req, res, next) {
    try {
      const upload = await uploadsService.getUpload(req.params.uploadId);
      return res.status(200).json(upload);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new UploadsController();
