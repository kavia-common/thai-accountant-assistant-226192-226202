const { query } = require('../db/pool');
const { ApiError } = require('../errors/apiError');

class UploadsService {
  /**
   * PUBLIC_INTERFACE
   * Creates an upload row in DB from multer file.
   */
  async createUpload({ uploadType, file }) {
    if (!file) {
      throw new ApiError(400, 'NO_FILE', 'No file uploaded');
    }

    const result = await query(
      'INSERT INTO uploads (upload_type, original_filename, stored_filename, mime_type, file_size_bytes, status) VALUES (?, ?, ?, ?, ?, \'uploaded\')',
      [uploadType, file.originalname, file.filename, file.mimetype, file.size]
    );

    return {
      id: result.insertId,
      upload_type: uploadType,
      original_filename: file.originalname,
      stored_filename: file.filename,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
      status: 'uploaded',
    };
  }

  /**
   * PUBLIC_INTERFACE
   * Returns uploads with optional filter by type.
   */
  async listUploads({ uploadType, limit = 50, offset = 0 }) {
    const params = [];
    let where = '';
    if (uploadType) {
      where = 'WHERE upload_type = ?';
      params.push(uploadType);
    }

    const rows = await query(
      `SELECT id, upload_type, original_filename, mime_type, file_size_bytes, upload_time, status, error_message
       FROM uploads
       ${where}
       ORDER BY upload_time DESC
       LIMIT ?
       OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return rows;
  }

  /**
   * PUBLIC_INTERFACE
   * Get single upload.
   */
  async getUpload(id) {
    const rows = await query(
      `SELECT id, upload_type, original_filename, stored_filename, mime_type, file_size_bytes, upload_time, status, error_message
       FROM uploads
       WHERE id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      throw new ApiError(404, 'UPLOAD_NOT_FOUND', 'Upload not found');
    }
    return rows[0];
  }

  /**
   * PUBLIC_INTERFACE
   * Update upload status.
   */
  async setStatus(id, status, errorMessage = null) {
    await query(
      'UPDATE uploads SET status = ?, error_message = ? WHERE id = ?',
      [status, errorMessage, id]
    );
  }
}

module.exports = new UploadsService();
