import { Request, Response, NextFunction } from 'express';
import { CareerAssistantService } from './career-assistant.service.js';
import {
  ApiResponse,
  CareerConversationItem,
  CareerAssistantResponse,
} from '@careerforge/types';

export class CareerAssistantController {
  /**
   * POST /api/v1/career-assistant/conversations
   */
  static async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { title } = req.body || {};
      const result = await CareerAssistantService.createConversation(req.user!.id, title);

      const response: ApiResponse<CareerConversationItem> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/career-assistant/conversations
   */
  static async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CareerAssistantService.getConversations(req.user!.id);

      const response: ApiResponse<CareerConversationItem[]> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/career-assistant/conversations/:conversationId
   */
  static async getConversationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const result = await CareerAssistantService.getConversationById(
        req.user!.id,
        conversationId
      );

      const response: ApiResponse<CareerConversationItem> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/career-assistant/conversations/:conversationId/messages
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      const { message, jobId } = req.body || {};

      const result = await CareerAssistantService.sendMessage(
        req.user!.id,
        conversationId,
        message,
        jobId
      );

      const response: ApiResponse<CareerAssistantResponse> = {
        success: true,
        data: result,
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/career-assistant/conversations/:conversationId
   */
  static async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId } = req.params;
      await CareerAssistantService.deleteConversation(req.user!.id, conversationId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Conversation deleted successfully' },
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/career-assistant/messages/:messageId/feedback
   */
  static async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;
      const { isHelpful } = req.body || {};

      await CareerAssistantService.submitFeedback(
        req.user!.id,
        messageId,
        Boolean(isHelpful)
      );

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Feedback recorded successfully' },
        meta: {
          requestId: req.requestId,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
