import express from 'express';
import { config } from '../config';
import { supabase } from '../config/database';
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
      } else {
        settlementResults.push({
          userId: winner.user_id,
          entryId: winner.id,
          stake: winnerStake,
          payout: payout
        });
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

export default router;