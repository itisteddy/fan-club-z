import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  status_code?: number;
  response?: any;
  created_at: Date;
  updated_at: Date;
}

/**
 * Middleware to prevent duplicate requests using idempotency keys
 * Stores responses for 24 hours to handle retries
 */
export function idempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    
    // Skip for GET requests - they're naturally idempotent
    if (req.method === 'GET') {
      return next();
    }
    
    if (!idempotencyKey) {
      return res.status(400).json({ 
        error: 'Missing idempotency key',
        message: 'x-idempotency-key header is required for this operation'
      });
    }
    
    try {
      // Check if we've seen this key before
      const { data: existing, error: selectError } = await supabase
        .from('idempotency_keys')
        .select('*')
        .eq('key', idempotencyKey)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Idempotency lookup error:', selectError);
        // Continue without idempotency protection rather than failing
        return next();
      }
      
      if (existing) {
        // Return cached response
        console.log(`[IDEMPOTENCY] Returning cached response for key: ${idempotencyKey}`);
        
        if (existing.status === 'processing') {
          // Request is still being processed
          return res.status(409).json({
            error: 'Request in progress',
            message: 'This request is already being processed. Please wait.'
          });
        }
        
        // Return the cached response
        return res.status(existing.status_code || 200).json(existing.response);
      }
      
      // Store the key to prevent concurrent duplicates
      const { error: insertError } = await supabase
        .from('idempotency_keys')
        .insert({
          key: idempotencyKey,
          status: 'processing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        // Key was likely inserted by another concurrent request
        if (insertError.code === '23505') { // Unique violation
          console.log(`[IDEMPOTENCY] Concurrent request detected for key: ${idempotencyKey}`);
          return res.status(409).json({
            error: 'Request in progress',
            message: 'This request is already being processed by another connection.'
          });
        }
        
        console.error('Failed to store idempotency key:', insertError);
        // Continue without idempotency protection
        return next();
      }
      
      // Capture the response to store it
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Store response for future duplicate requests
        supabase
          .from('idempotency_keys')
          .update({
            status: 'completed',
            status_code: res.statusCode,
            response: data,
            updated_at: new Date().toISOString()
          })
          .eq('key', idempotencyKey)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to update idempotency key:', error);
            } else {
              console.log(`[IDEMPOTENCY] Stored response for key: ${idempotencyKey}`);
            }
          });
        
        return originalJson(data);
      };
      
      // Handle errors
      const originalStatus = res.status.bind(res);
      res.status = function(code: number) {
        // If this is an error response, mark the idempotency key as failed
        if (code >= 400) {
          supabase
            .from('idempotency_keys')
            .update({
              status: 'failed',
              status_code: code,
              updated_at: new Date().toISOString()
            })
            .eq('key', idempotencyKey)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to mark idempotency key as failed:', error);
              }
            });
        }
        return originalStatus(code);
      };
      
      next();
      
    } catch (error) {
      console.error('Idempotency middleware error:', error);
      // Continue without idempotency protection rather than breaking the request
      next();
    }
  };
}

/**
 * Clean up old idempotency keys (run as a cron job)
 */
export async function cleanupOldIdempotencyKeys() {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);
  
  const { error } = await supabase
    .from('idempotency_keys')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
  
  if (error) {
    console.error('Failed to clean up old idempotency keys:', error);
  } else {
    console.log('[IDEMPOTENCY] Cleaned up old keys');
  }
}
