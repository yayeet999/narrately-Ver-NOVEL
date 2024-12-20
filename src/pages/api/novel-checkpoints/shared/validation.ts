import { NextApiRequest } from 'next';
import { supabase } from '../../../../integrations/supabase/client';
import { Logger } from '../../../../services/utils/Logger';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function createCheckpointContext(req: NextApiRequest) {
  try {
    if (!req.body) {
      throw new ValidationError('Request body is required');
    }

    const { novelId, parameters } = req.body;

    if (!novelId) {
      throw new ValidationError('Novel ID is required');
    }

    if (!parameters) {
      throw new ValidationError('Parameters are required');
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new ValidationError('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: session, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      throw new ValidationError('Invalid authentication token');
    }

    return {
      novelId,
      parameters,
      userId: session.session?.user.id
    };
  } catch (error) {
    Logger.error('Validation error:', error);
    throw error;
  }
} 