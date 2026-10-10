import { Request, Response, NextFunction } from 'express';
import { ResumeService } from './resume.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

export class ResumeController {
  static async getResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const resume = await ResumeService.getResume(req.user.id);
      res.status(200).json({
        success: true,
        data: { resume },
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const resume = await ResumeService.uploadResume(req.user.id, req.file);
      res.status(201).json({
        success: true,
        data: { resume },
      });
    } catch (err) {
      next(err);
    }
  }

  static async replaceResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const resume = await ResumeService.replaceResume(req.user.id, req.file);
      res.status(200).json({
        success: true,
        data: { resume },
      });
    } catch (err) {
      next(err);
    }
  }

  static async parseResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = await ResumeService.parseResume(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getParsedResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = await ResumeService.getParsedResume(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = await ResumeService.deleteResume(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async indexResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = await ResumeService.indexResume(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getIndexStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = await ResumeService.getIndexStatus(req.user.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async searchResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const { query, topK } = req.body;
      const result = await ResumeService.searchResume(req.user.id, query, topK);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const fileInfo = await ResumeService.downloadResume(req.user.id);

      const filename = (fileInfo.fileName || 'resume.pdf').replace(/["\r\n\\]/g, '_');
      const dispositionType = req.query.inline === 'true' ? 'inline' : 'attachment';

      res.setHeader('Content-Type', fileInfo.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(filename)}"`);
      if (fileInfo.fileSize) {
        res.setHeader('Content-Length', fileInfo.fileSize);
      }

      fileInfo.stream.on('error', (err) => {
        logger.error('Error streaming resume download:', err);
        if (!res.headersSent) {
          next(err);
        } else {
          res.end();
        }
      });

      res.on('close', () => {
        fileInfo.stream.destroy();
      });

      fileInfo.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}
