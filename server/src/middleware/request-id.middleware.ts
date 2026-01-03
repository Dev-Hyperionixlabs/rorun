import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export type RequestWithId = Request & { requestId?: string };

/**
 * Attaches a stable request id to every request and response.
 * - If caller provides `x-request-id`, we keep it.
 * - Otherwise we generate one.
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : uuidv4();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}


