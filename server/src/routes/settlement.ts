import express from 'express';
import { config } from '../config';
import { supabase, db } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

// POST /api/v2/settlement/manual - Manual settlement by creator
router.post('/manual', async (req, res) => {
  try {
    const { predictionId, winningOptionId, proofUrl, reason } = req.body;
    const userId = req.body.userId; // In production, this would come from JWT auth
    
    console.log('🔨 Manual settlement requested:', { predictionId, winningOptionId, userId });
    
    // Validate required fields
    if (!predictionId || !winningOptionId || !userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId, winningOptionId, and userId are required',
        version: VERSION
      });
    }

    // Get prediction details and verify creator
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      console.error('Prediction not found:', predictionError);
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Verify user is creator (in production, add proper auth check)
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can settle manually',
        version: VERSION
      });
    }

    // Verify winning option belongs to this prediction
    const { data: winningOption, error: optionError } = await supabase
      .from('prediction_options')
      .select('*')
      .eq('id', winningOptionId)
      .eq('prediction_id', predictionId)
      .single();

    if (optionError || !winningOption) {
      return res.status(400).json({
        error: 'Invalid option',
        message: 'Winning option not found for this prediction',
        version: VERSION
      });
    }

    // Get all prediction entries for this prediction
    const { data: allEntries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId);

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction entries',
        version: VERSION
      });
    }

    // Calculate settlement amounts
    const totalPool = prediction.pool_total || 0;
    const platformFeePercent = prediction.platform_fee_percentage || 2.5;
    const creatorFeePercent = prediction.creator_fee_percentage || 1.0;
    
    const platformFee = (totalPool * platformFeePercent) / 100;
    const creatorFee = (totalPool * creatorFeePercent) / 100;
    const payoutPool = totalPool - platformFee - creatorFee;

    console.log('💰 Settlement calculation:', {
      totalPool,
      platformFee,
      creatorFee,
      payoutPool,
      totalEntries: allEntries?.length || 0
    });

    // If no participants, return fees to creator (no payouts)
    if (!allEntries || allEntries.length === 0) {
      console.log('📭 No participants - settling with creator fee only');
      
      // Update prediction status to settled
      const { error: updatePredictionError } = await supabase
        .from('predictions')
        .update({ 
          status: 'settled', 
          settled_at: new Date().toISOString(),
          winning_option_id: winningOptionId
        })
        .eq('id', predictionId);

      if (updatePredictionError) {
        console.error('Error updating prediction status:', updatePredictionError);
      }

      // Create settlement record
      const { data: settlement, error: settlementError } = await supabase
        .from('bet_settlements')
        .insert({
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: 0,
          platform_fee_collected: 0,
          creator_payout_amount: 0,
          settlement_time: new Date().toISOString()
        })
        .select()
        .single();

      return res.json({
        success: true,
        data: {
          settlement,
          totalPayout: 0,
          platformFee: 0,
          creatorFee: 0,
          winnersCount: 0,
          participantsCount: 0
        },
        message: 'Prediction settled successfully (no participants)',
        version: VERSION
      });
    }

    // Calculate winners and payouts
    const winners = allEntries.filter(entry => entry.option_id === winningOptionId);
    const winnersCount = winners.length;
    const totalWinningStake = winners.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    console.log('🏆 Winners calculation:', {
      winnersCount,
      totalWinningStake,
      payoutPool
    });

    // Begin transaction for settlement
    const settlementResults = [];

    // Process each winner's payout
    for (const winner of winners) {
      const winnerStake = winner.amount || 0;
      const winnerShare = totalWinningStake > 0 ? winnerStake / totalWinningStake : 0;
      const payout = Math.floor(payoutPool * winnerShare * 100) / 100; // Round to 2 decimals
      
      // Update the entry with actual payout
      const { error: updateEntryError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'won',
          actual_payout: payout,
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);

      if (updateEntryError) {
        console.error('Error updating winner entry:', updateEntryError);
        continue; // Skip wallet update if entry update failed
      }

      // Credit winner's wallet with payout
      try {
        console.log(`💰 Crediting ${payout} USD to winner ${winner.user_id}`);
        
        // Update wallet balance
        await db.wallets.directUpdateBalance(winner.user_id, 'USD', payout, 0);
        
        // Create wallet transaction record
        await db.transactions.create({
          user_id: winner.user_id,
          type: 'prediction_win',
          amount: payout,
          currency: 'USD',
          status: 'completed',
          reference_id: winner.id, // Reference to prediction entry
          description: `Prediction win payout for "${prediction.title}"`,
          metadata: {
            prediction_id: predictionId,
            prediction_entry_id: winner.id,
            original_stake: winnerStake,
            winning_option_id: winningOptionId
          }
        });
        
        console.log(`✅ Successfully credited ${payout} USD to winner ${winner.user_id}`);
        
        settlementResults.push({
          userId: winner.user_id,
          entryId: winner.id,
          stake: winnerStake,
          payout: payout
        });
      } catch (walletError) {
        console.error(`❌ Error updating wallet for winner ${winner.user_id}:`, walletError);
        // Continue with other winners even if one fails
      }
    }

    // Update losing entries
    const losers = allEntries.filter(entry => entry.option_id !== winningOptionId);
    for (const loser of losers) {
      const { error: updateLoserError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'lost',
          actual_payout: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', loser.id);

      if (updateLoserError) {
        console.error('Error updating loser entry:', updateLoserError);
      }
    }

    // Create settlement record
    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .insert({
        bet_id: predictionId,
        winning_option_id: winningOptionId,
        total_payout: payoutPool,
        platform_fee_collected: platformFee,
        creator_payout_amount: creatorFee,
        settlement_time: new Date().toISOString()
      })
      .select()
      .single();

    if (settlementError) {
      console.error('Error creating settlement record:', settlementError);
    }

    // Update prediction status to settled
    const { error: updatePredictionError } = await supabase
      .from('predictions')
      .update({ 
        status: 'settled', 
        settled_at: new Date().toISOString(),
        winning_option_id: winningOptionId
      })
      .eq('id', predictionId);

    if (updatePredictionError) {
      console.error('Error updating prediction status:', updatePredictionError);
    }

    // Record creator payout if there's a fee
    if (creatorFee > 0) {
      const { error: payoutError } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: prediction.creator_id,
          bet_id: predictionId,
          amount: creatorFee,
          currency: 'USD',
          status: 'processed',
          processed_at: new Date().toISOString()
        });

      if (payoutError) {
        console.error('Error recording creator payout:', payoutError);
      }
    }

    console.log('✅ Settlement completed successfully');

    // Notify each participant individually (no bulk responses)
    console.log('🔔 Sending individual notifications to participants...');
    for (const entry of allEntries) {
      try {
        const outcome = entry.option_id === winningOptionId ? 'won' : 'lost';
        const payout = entry.option_id === winningOptionId ? entry.actual_payout : 0;
        
        console.log(`📧 Notifying participant ${entry.user_id}: ${outcome} (payout: $${payout})`);
        
        // In a real app, you would send individual push notifications, emails, or in-app notifications here
        // For now, we'll log each individual notification
        // TODO: Implement actual individual notification system (push notifications, email, etc.)
        
      } catch (notificationError) {
        console.error(`❌ Failed to notify participant ${entry.user_id}:`, notificationError);
        // Continue with other notifications even if one fails
      }
    }
    console.log('✅ Individual participant notifications sent');

    return res.json({
      success: true,
      data: {
        settlement,
        totalPayout: payoutPool,
        platformFee,
        creatorFee,
        winnersCount,
        participantsCount: allEntries.length,
        results: settlementResults
      },
      message: 'Prediction settled successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in manual settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to settle prediction',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v2/settlement/auto-close - Auto-close expired predictions
router.post('/auto-close', async (req, res) => {
  try {
    console.log('🕐 Auto-closing expired predictions...');
    
    // Find all open predictions past their entry deadline
    const { data: expiredPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('status', 'open')
      .lt('entry_deadline', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch expired predictions',
        version: VERSION
      });
    }

    if (!expiredPredictions || expiredPredictions.length === 0) {
      return res.json({
        success: true,
        data: { closedCount: 0 },
        message: 'No expired predictions to close',
        version: VERSION
      });
    }

    console.log(`📋 Found ${expiredPredictions.length} expired predictions to close`);

    // Close all expired predictions
    const { error: updateError } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredPredictions.map(p => p.id));

    if (updateError) {
      console.error('Error closing expired predictions:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to close expired predictions',
        version: VERSION
      });
    }

    console.log(`✅ Closed ${expiredPredictions.length} expired predictions`);

    return res.json({
      success: true,
      data: { 
        closedCount: expiredPredictions.length,
        closedPredictions: expiredPredictions.map(p => ({ id: p.id, title: p.title }))
      },
      message: `Closed ${expiredPredictions.length} expired predictions`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-close:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-close expired predictions',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/auto-settle - Auto-settle closed predictions (simplified)
router.post('/auto-settle', async (req, res) => {
  try {
    console.log('⚖️ Auto-settling closed predictions...');
    
    // Find all closed predictions that haven't been settled yet
    const { data: closedPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*)
        entries:prediction_entries(*)
      `)
      .eq('status', 'closed')
      .is('settled_at', null);

    if (fetchError) {
      console.error('Error fetching closed predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch closed predictions',
        version: VERSION
      });
    }

    if (!closedPredictions || closedPredictions.length === 0) {
      return res.json({
        success: true,
        data: { settledCount: 0 },
        message: 'No closed predictions to settle',
        version: VERSION
      });
    }

    console.log(`🎯 Found ${closedPredictions.length} closed predictions to settle`);

    const settlementResults = [];

    for (const prediction of closedPredictions) {
      try {
        console.log(`🔄 Processing prediction: ${prediction.title} (${prediction.id})`);
        
        const entries = prediction.entries || [];
        
        if (entries.length === 0) {
          // No participants - just mark as settled
          await supabase
            .from('predictions')
            .update({ 
              status: 'settled',
              settled_at: new Date().toISOString()
            })
            .eq('id', prediction.id);
          
          settlementResults.push({
            predictionId: prediction.id,
            title: prediction.title,
            result: 'no_participants',
            winnersCount: 0,
            totalPayout: 0
          });
          continue;
        }

        // For closed predictions without manual settlement, we should NOT auto-determine winners
        // Instead, we should either:
        // 1. Refund all participants if no settlement is provided
        // 2. Wait for manual settlement by creator
        // 3. Mark as requiring settlement
        
        console.log(`⚠️ Prediction ${prediction.id} is closed but needs manual settlement`);
        
        // For now, let's refund all participants since no winner was determined
        const totalPool = prediction.pool_total || 0;
        let totalRefunded = 0;

        // Refund all participants their original stake
        for (const entry of entries) {
          const refundAmount = entry.amount || 0;
          
          await supabase
            .from('prediction_entries')
            .update({
              status: 'refunded',
              actual_payout: refundAmount, // Return original stake
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          totalRefunded += refundAmount;
        }

        // Mark prediction as requiring settlement
        await supabase
          .from('predictions')
          .update({ 
            status: 'awaiting_settlement',
            updated_at: new Date().toISOString()
          })
          .eq('id', prediction.id);

        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'refunded_awaiting_settlement',
          winnersCount: 0,
          losersCount: 0,
          totalRefunded: totalRefunded,
          message: 'All participants refunded - awaiting manual settlement'
        });

        console.log(`💰 Refunded prediction ${prediction.id}: $${totalRefunded.toFixed(2)} returned to ${entries.length} participants`);

      } catch (error) {
        console.error(`❌ Error settling prediction ${prediction.id}:`, error);
        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      data: { 
        settledCount: settlementResults.filter(r => r.result === 'settled' || r.result === 'no_participants').length,
        results: settlementResults
      },
      message: `Processed ${settlementResults.length} predictions for settlement`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-settle:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-settle predictions',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/:predictionId/status - Get settlement status for participants
router.get('/:predictionId/status', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const userId = req.query.userId as string;
    
    console.log(`📋 Getting settlement status for prediction ${predictionId}, user ${userId}`);
    
    // Get prediction details
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*)
        entries:prediction_entries(*)
      `)
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Check if user has an entry in this prediction
    const userEntry = prediction.entries?.find((entry: any) => entry.user_id === userId);
    if (!userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Get settlement proposal if exists
    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', predictionId)
      .single();

    const response = {
      prediction: {
        id: prediction.id,
        title: prediction.title,
        status: prediction.status,
        pool_total: prediction.pool_total
      },
      userEntry: {
        id: userEntry.id,
        option_id: userEntry.option_id,
        amount: userEntry.amount,
        status: userEntry.status,
        actual_payout: userEntry.actual_payout
      },
      settlement: settlement || null,
      canValidate: prediction.status === 'closed' || prediction.status === 'awaiting_settlement',
      needsSettlement: !settlement && (prediction.status === 'closed' || prediction.status === 'awaiting_settlement')
    };

    return res.json({
      success: true,
      data: response,
      message: 'Settlement status retrieved',
      version: VERSION
    });

  } catch (error) {
    console.error('Error getting settlement status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get settlement status',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/validate - Participant validates settlement
router.post('/:predictionId/validate', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId, action, reason } = req.body; // action: 'accept' | 'dispute'
    
    console.log(`✅ Settlement validation for prediction ${predictionId}: ${action} by user ${userId}`);
    
    // Validate required fields
    if (!userId || !action || !['accept', 'dispute'].includes(action)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId and valid action (accept/dispute) are required',
        version: VERSION
      });
    }

    // Check if user is a participant
    const { data: userEntry, error: entryError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .single();

    if (entryError || !userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Record the validation
    const { data: validation, error: validationError } = await supabase
      .from('settlement_validations')
      .upsert({
        prediction_id: predictionId,
        user_id: userId,
        action: action,
        reason: reason || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'prediction_id,user_id'
      })
      .select()
      .single();

    if (validationError) {
      console.error('Error recording validation:', validationError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to record validation',
        version: VERSION
      });
    }

    // If this is a dispute, we might want to halt settlement
    if (action === 'dispute') {
      // Mark prediction as disputed
      await supabase
        .from('predictions')
        .update({ 
          status: 'disputed',
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);
    }

    return res.json({
      success: true,
      data: validation,
      message: `Settlement ${action} recorded successfully`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error validating settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate settlement',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/auto - Auto settlement (for future use with oracles)
router.post('/auto', async (req, res) => {
  try {
    const { predictionId, winningOptionId, oracleSource } = req.body;
    
    // This would be similar to manual settlement but triggered by external data
    // For now, return not implemented
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Auto settlement not yet implemented',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in auto settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto settle prediction',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/prediction/:id - Get settlement info for a prediction
router.get('/prediction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: settlement, error } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Settlement not found for this prediction',
        version: VERSION
      });
    }

    return res.json({
      data: settlement,
      message: 'Settlement fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch settlement',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/:predictionId/disputes - Get all disputes for a prediction
router.get('/:predictionId/disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    
    console.log('📋 Fetching disputes for prediction:', predictionId);
    
    // Get all disputes for this prediction
    const { data: disputes, error: disputesError } = await supabase
      .from('settlement_validations')
      .select(`
        id,
        user_id,
        action,
        reason,
        created_at,
        status,
        user:users(username, full_name)
      `)
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .order('created_at', { ascending: false });

    if (disputesError) {
      console.error('Error fetching disputes:', disputesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch disputes',
        version: VERSION
      });
    }

    const totalDisputes = disputes?.length || 0;
    const pendingDisputes = disputes?.filter(d => d.status === 'pending').length || 0;

    console.log(`✅ Found ${totalDisputes} disputes (${pendingDisputes} pending)`);

    return res.json({
      success: true,
      data: {
        disputes: disputes || [],
        totalDisputes,
        pendingDisputes
      },
      version: VERSION
    });

  } catch (error) {
    console.error('Error fetching disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch disputes',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/resolve-disputes - Resolve disputes for a prediction
router.post('/:predictionId/resolve-disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { action, reason, newWinningOption, creatorId } = req.body;
    
    console.log('🔨 Resolving disputes for prediction:', predictionId, 'Action:', action);
    
    // Validate required fields
    if (!action || !reason || !creatorId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'action, reason, and creatorId are required',
        version: VERSION
      });
    }

    // Verify creator ownership
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('creator_id')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (prediction.creator_id !== creatorId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can resolve disputes',
        version: VERSION
      });
    }

    // Update all pending disputes to resolved
    const { error: updateError } = await supabase
      .from('settlement_validations')
      .update({ 
        status: 'resolved',
        resolution_reason: reason,
        resolved_at: new Date().toISOString()
      })
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .eq('status', 'pending');

    if (updateError) {
      console.error('Error updating disputes:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update disputes',
        version: VERSION
      });
    }

    // Handle different resolution actions
    let newPredictionStatus = 'settled';
    
    if (action === 'accept') {
      // Refund all participants
      console.log('💰 Refunding all participants due to accepted disputes');
      
      // Update all prediction entries to refunded
      const { error: refundError } = await supabase
        .from('prediction_entries')
        .update({ 
          status: 'refunded',
          actual_payout: 0 // Will be updated with actual refund amount below
        })
        .eq('prediction_id', predictionId);

      if (refundError) {
        console.error('Error processing refunds:', refundError);
      }
      
      newPredictionStatus = 'refunded';
      
    } else if (action === 'revise' && newWinningOption) {
      // Re-settle with new winning option
      console.log('🔄 Re-settling with new winning option:', newWinningOption);
      
      // This would trigger a new settlement process
      // For now, we'll just update the status
      newPredictionStatus = 'awaiting_settlement';
      
    } else if (action === 'reject') {
      // Maintain original settlement
      console.log('✋ Maintaining original settlement');
      newPredictionStatus = 'settled';
    }

    // Update prediction status
    const { error: statusError } = await supabase
      .from('predictions')
      .update({ 
        status: newPredictionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', predictionId);

    if (statusError) {
      console.error('Error updating prediction status:', statusError);
    }

    console.log('✅ Disputes resolved successfully');

    return res.json({
      success: true,
      data: {
        action,
        newStatus: newPredictionStatus,
        message: `Disputes ${action}ed successfully`
      },
      message: 'Disputes resolved successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error resolving disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve disputes',
      version: VERSION
    });
  }
});

export default router;