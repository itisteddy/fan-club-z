import express from 'express';
import { config } from '../config';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

// GET /api/v2/predictions/stats/platform - Get platform-wide statistics
router.get('/stats/platform', async (req, res) => {
  try {
    console.log('📊 Platform stats endpoint called');

    // Get count of active (open) predictions with future deadlines
    const { count: activePredictions, error: countError } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (countError) {
      console.error('Error counting active predictions:', countError);
    }

    // Get total volume from active predictions
    const { data: volumeData, error: volumeError } = await supabase
      .from('predictions')
      .select('pool_total')
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    const totalVolume = volumeData?.reduce((sum, p) => sum + (parseFloat(p.pool_total) || 0), 0) || 0;

    if (volumeError) {
      console.error('Error calculating total volume:', volumeError);
    }

    // Get unique user count from prediction entries
    const { data: userData, error: userError } = await supabase
      .from('prediction_entries')
      .select('user_id')
      .eq('status', 'active');

    const uniqueUsers = new Set(userData?.map(entry => entry.user_id) || []).size;

    if (userError) {
      console.error('Error counting unique users:', userError);
    }

    const stats = {
      totalVolume: totalVolume.toFixed(2),
      activePredictions: activePredictions || 0,
      totalUsers: uniqueUsers.toString(),
      rawVolume: totalVolume,
      rawUsers: uniqueUsers
    };

    console.log('✅ Platform stats calculated:', stats);

    return res.json({
      success: true,
      data: stats,
      message: 'Platform stats fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch platform stats',
      version: VERSION
    });
  }
});

// GET /api/v2/predictions - Get all predictions with pagination
router.get('/', async (req, res) => {
  try {
    console.log('📡 Predictions endpoint called - origin:', req.headers.origin);
    console.log('🔧 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    });
    
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('predictions')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      console.error('Supabase config:', {
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
      });
      return res.status(500).json({
        error: 'Database connection error',
        message: 'Unable to connect to database',
        version: VERSION,
        details: process.env.NODE_ENV === 'development' ? testError.message : undefined
      });
    }
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per request
    const offset = (page - 1) * limit;
    
    // Parse filter parameters
    const category = req.query.category as string;
    const search = req.query.search as string;
    
    console.log(`📊 Pagination: page=${page}, limit=${limit}, offset=${offset}`);
    console.log(`🔍 Filters: category=${category}, search=${search}`);
    
    // Build query with filters - only show active, open predictions
    let query = supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `, { count: 'exact' })
      .eq('status', 'open') // Only show open predictions
      .gt('entry_deadline', new Date().toISOString()) // Only show predictions with future deadlines
      .order('created_at', { ascending: false });
    
    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    // Apply search filter
    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: predictions, error, count } = await query;

    if (error) {
      console.error('Error fetching predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch predictions',
        version: VERSION,
        details: error.message
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`✅ Successfully fetched ${predictions?.length || 0} predictions (${count} total)`);

    return res.json({
      data: predictions || [],
      message: 'Predictions fetched successfully',
      version: VERSION,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext,
        hasPrev,
        currentCount: predictions?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch predictions',
      version: VERSION,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v2/predictions/stats/platform - Get platform statistics
router.get('/stats/platform', async (req, res) => {
  try {
    console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
    
    // Get total volume from active predictions only (status='open' AND entry_deadline hasn't passed)
    const { data: volumeData, error: volumeError } = await supabase
      .from('predictions')
      .select('pool_total')
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (volumeError) {
      console.error('Error fetching volume data:', volumeError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch volume data',
        version: VERSION
      });
    }

    // Get active predictions count (status='open' AND entry_deadline hasn't passed)
    const { count: activeCount, error: countError } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .gt('entry_deadline', new Date().toISOString());

    if (countError) {
      console.error('Error fetching active predictions count:', countError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch active predictions count',
        version: VERSION
      });
    }

    // Get total users count
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('Error fetching user count:', userError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user count',
        version: VERSION
      });
    }

    // Calculate total volume
    const totalVolume = volumeData?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0;

    const stats = {
      totalVolume: totalVolume.toFixed(2),
      activePredictions: activeCount || 0,
      totalUsers: userCount || 0,
      rawVolume: totalVolume,
      rawUsers: userCount || 0
    };

    console.log('✅ Platform stats calculated:', stats);

    return res.json({
      success: true,
      data: stats,
      message: 'Platform stats fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch platform statistics',
      version: VERSION
    });
  }
});

// GET /api/v2/predictions/trending - Get trending predictions
router.get('/trending', async (req, res) => {
  try {
    console.log('🔥 Trending predictions endpoint called - origin:', req.headers.origin);
    
    // For now, return the same as regular predictions but ordered by activity
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('status', 'open')
      .order('participant_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trending predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch trending predictions',
        version: VERSION,
        details: error.message
      });
    }

    console.log(`✅ Successfully fetched ${predictions?.length || 0} trending predictions`);

    return res.json({
      data: predictions || [],
      message: 'Trending predictions endpoint - working',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in trending predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch trending predictions',
      version: VERSION
    });
  }
});

// GET /api/v2/predictions/:id - Get specific prediction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Specific prediction endpoint called for ID: ${id} - origin:`, req.headers.origin);
    
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching prediction ${id}:`, error);
      return res.status(404).json({
        error: 'Not found',
      message: `Prediction ${id} not found`,
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: prediction,
      message: 'Prediction fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error(`Error in specific prediction endpoint:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction',
      version: VERSION
    });
  }
});




// GET /api/v2/predictions/created/:userId - Get user's created predictions
router.get('/created/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 User created predictions endpoint called for ID: ${userId} - origin:`, req.headers.origin);
    
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Error fetching user created predictions for ${userId}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user created predictions',
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: predictions || [],
      message: `Created predictions for user ${userId}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching user created predictions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user created predictions',
      version: VERSION,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/v2/predictions - Create new prediction
router.post('/', async (req, res) => {
  try {
    console.log('🎯 Creating new prediction:', req.body);
    
    const {
      title,
      description,
      category,
      type,
      options,
      entryDeadline,
      stakeMin,
      stakeMax,
      settlementMethod,
      isPrivate
    } = req.body;

    // Validate required fields
    if (!title || !category || !type || !options || !entryDeadline) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields',
        version: VERSION,
        details: 'Title, category, type, options, and entryDeadline are required'
      });
    }

    // Get current user ID from request body (passed from frontend)
    // In production, this would come from JWT token
    console.log('🔍 Debug - Request body creatorId:', req.body.creatorId);
    console.log('🔍 Debug - Full request body:', JSON.stringify(req.body, null, 2));
    
    const requestedUserId = req.body.creatorId || '325343a7-0a32-4565-8059-7c0d9d3fed1b';
    console.log('🔍 Debug - Requested userId:', requestedUserId);
    
    // Verify user exists in database
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', requestedUserId)
      .single();
    
    if (userError || !userExists) {
      console.log('🔍 Debug - User not found, creating user:', requestedUserId);
      // Create user if doesn't exist
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: requestedUserId,
          username: 'itisteddy',
          full_name: 'Fan Club Z User',
          email: 'user@fanclubz.app'
        });
      
      if (createUserError && !createUserError.message.includes('duplicate')) {
        console.error('Error creating user:', createUserError);
      }
    }
    
    const currentUserId = requestedUserId;
    console.log('🔍 Debug - Final currentUserId:', currentUserId);

    // Create prediction in database (bypass RLS with service role)
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .insert({
        creator_id: currentUserId,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        type,
        status: 'open',
        stake_min: stakeMin || 1,
        stake_max: stakeMax || null,
        pool_total: 0,
        entry_deadline: entryDeadline,
        settlement_method: settlementMethod || 'manual',
        is_private: isPrivate || false,
        creator_fee_percentage: 1.0,
        platform_fee_percentage: 2.5,
        tags: [category],
        participant_count: 0,
        likes_count: 0,
        comments_count: 0
      })
      .select()
      .single();

    if (predictionError) {
      console.error('Error creating prediction:', predictionError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create prediction',
        version: VERSION,
        details: predictionError.message
      });
    }

    // Create prediction options (and return inserted rows)
    let insertedOptions: any[] = [];
    if (options && options.length > 0) {
      const optionData = options.map((option: any, index: number) => ({
        prediction_id: prediction.id,
        label: String(option.label || '').trim(),
        total_staked: 0,
        current_odds: Number(option.currentOdds) || 2.0,
      }));

      const { data: createdOptions, error: optionsError } = await supabase
        .from('prediction_options')
        .insert(optionData)
        .select('*');

      if (optionsError) {
        console.error('❌ Error creating prediction options:', optionsError);
        // Note: We don't fail here, just log the error
      } else if (Array.isArray(createdOptions)) {
        insertedOptions = createdOptions;
        console.log('✅ Successfully created', createdOptions.length, 'options for prediction:', prediction.id);
      }
    }

    // Fetch the complete prediction with options and creator info
    const { data: completePrediction, error: fetchError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', prediction.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete prediction:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Prediction created but failed to fetch complete data',
        version: VERSION,
        details: fetchError.message
      });
    }

    // Fallback: if joined fetch returned no options but we inserted them, attach inserted options
    if (completePrediction && Array.isArray(completePrediction.options) && completePrediction.options.length === 0 && insertedOptions.length > 0) {
      console.warn('⚠️ Joined fetch returned no options; attaching inserted options directly');
      (completePrediction as any).options = insertedOptions;
    }

    console.log('✅ Prediction created successfully:', completePrediction.id);

    return res.json({
      data: completePrediction,
      message: 'Prediction created successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in create prediction endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v2/predictions/:id/entries - Create prediction entry (place bet)
router.post('/:id/entries', async (req, res) => {
  try {
    const predictionId = req.params.id;
    const { option_id, amount, user_id } = req.body;
    
    console.log(`🎲 Creating prediction entry for prediction ${predictionId}:`, { option_id, amount, user_id });
    
    // Validate required fields
    if (!option_id || !amount || !user_id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'option_id, amount, and user_id are required',
        version: VERSION
      });
    }
    
    // Create prediction entry in database
    const { data: entry, error: entryError } = await supabase
      .from('prediction_entries')
      .insert({
        prediction_id: predictionId,
        option_id: option_id,
        user_id: user_id,
        amount: amount,
        status: 'active',
        potential_payout: amount * 2.0, // Simple calculation for now
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (entryError) {
      console.error('Error creating prediction entry:', entryError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to create prediction entry',
        version: VERSION,
        details: entryError.message
      });
    }
    
    console.log('✅ Prediction entry created successfully:', entry.id);

    // 1) Update the selected option's total_staked
    const { data: currentOption, error: readOptError } = await supabase
      .from('prediction_options')
      .select('id,total_staked')
      .eq('id', option_id)
      .single();

    if (readOptError) {
      console.error('Error reading option for update:', readOptError);
    } else {
      const newTotalStaked = (currentOption?.total_staked || 0) + Number(amount || 0);
      const { error: updateOptError } = await supabase
        .from('prediction_options')
        .update({ total_staked: newTotalStaked, updated_at: new Date().toISOString() as any })
        .eq('id', option_id);
      if (updateOptError) {
        console.error('Error updating option total_staked:', updateOptError);
      }
    }

    // 2) Recalculate pool_total from all options
    const { data: allOptions, error: optionsError } = await supabase
      .from('prediction_options')
      .select('id,total_staked')
      .eq('prediction_id', predictionId);

    let poolTotal = 0;
    if (optionsError) {
      console.error('Error fetching options to calculate pool:', optionsError);
    } else {
      poolTotal = (allOptions || []).reduce((sum: number, opt: any) => sum + (opt.total_staked || 0), 0);
    }

    // 3) Recalculate participant_count = number of entries for prediction
    const { count: participantCount, error: countError } = await supabase
      .from('prediction_entries')
      .select('id', { count: 'exact', head: true })
      .eq('prediction_id', predictionId);
    if (countError) {
      console.error('Error counting participants:', countError);
    }

    // 4) Update prediction with new pool_total and participant_count
    const { data: updatedPredictionRow, error: updatePredError } = await supabase
      .from('predictions')
      .update({ 
        pool_total: poolTotal, 
        participant_count: participantCount || 0,
        updated_at: new Date().toISOString() as any
      })
      .eq('id', predictionId)
      .select('*')
      .single();
    if (updatePredError) {
      console.error('Error updating prediction totals:', updatePredError);
    }

    // 5) Recalculate odds for each option: odds = pool_total / option.total_staked (fallback 2.0)
    if (allOptions && allOptions.length > 0) {
      for (const opt of allOptions) {
        const stake = opt.total_staked || 0;
        // If there is stake, use pool_total / option_stake; otherwise default to equal-probability baseline (N options)
        const baseline = allOptions.length > 0 ? allOptions.length : 2; // binary -> 2.0, 3-way -> 3.0, etc.
        const newOdds = stake > 0 && poolTotal > 0 ? Math.max(1.01, poolTotal / stake) : baseline;
        const { error: updateOddsError } = await supabase
          .from('prediction_options')
          .update({ current_odds: newOdds, updated_at: new Date().toISOString() as any })
          .eq('id', opt.id);
        if (updateOddsError) {
          console.error('Error updating option odds:', updateOddsError);
        }
      }
    }

    // 6) Fetch full prediction with creator and options to return
    const { data: fullPrediction, error: fetchUpdatedError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('id', predictionId)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching full updated prediction:', fetchUpdatedError);
    }

    return res.status(201).json({
      data: {
        entry,
        prediction: fullPrediction || updatedPredictionRow || { id: predictionId, pool_total: poolTotal, participant_count: participantCount || 0 }
      },
      message: 'Prediction entry created successfully',
      version: VERSION
    });
    
  } catch (error) {
    console.error('Error in prediction entry creation:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction entry',
      version: VERSION
    });
  }
});

// PUT /api/v2/predictions/:id - Update prediction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`🔄 Updating prediction ${id}:`, updates);
    
    // Validate allowed fields
    const allowedFields = ['title', 'description', 'is_private', 'entry_deadline'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        message: 'Please provide valid fields to update',
        version: VERSION
      });
    }
    
    // Add updated timestamp
    filteredUpdates.updated_at = new Date().toISOString();
    
    const { data: updated, error } = await supabase
      .from('predictions')
      .update(filteredUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update prediction',
        version: VERSION,
        details: error.message
      });
    }

    console.log(`✅ Prediction ${id} updated successfully`);
    
    return res.json({
      data: updated,
      message: `Prediction ${id} updated successfully`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error updating prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update prediction',
      version: VERSION
    });
  }
});

// DELETE /api/v2/predictions/:id - Delete prediction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Delete prediction requested for: ${id} - origin:`, req.headers.origin);
    // Soft delete: mark status as cancelled so it no longer appears in Discover
    const { data: updated, error } = await supabase
      .from('predictions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('Error soft-deleting prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to delete prediction',
        version: VERSION,
        details: error.message
      });
    }

    // Persistence guard: verify the row now has status cancelled
    const { data: verifyRow, error: verifyError } = await supabase
      .from('predictions')
      .select('id, status')
      .eq('id', id)
      .single();
    if (verifyError) {
      console.error('Verification read failed after delete:', verifyError);
    } else {
      console.log('✅ Delete persisted check:', verifyRow);
    }

    return res.json({
      success: true,
      data: updated,
      message: `Prediction ${id} deleted`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete prediction'
    });
  }
});

// Alias: GET /api/v2/predictions/user/:id -> same as users/:id/predictions
router.get('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 [Alias] User predictions endpoint called for ID: ${id} - origin:`, req.headers.origin);
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Error fetching user predictions (alias) for ${id}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user predictions',
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: predictions || [],
      message: 'User predictions fetched successfully (alias)',
      version: VERSION,
    });
  } catch (error) {
    console.error('Error in alias user predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user predictions',
      version: VERSION,
    });
  }
});

// POST /api/v2/predictions/:id/close - Close prediction
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔒 Closing prediction:', id);
    
    // Update prediction status to 'closed' in database
    const { data: updatedPrediction, error } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Database error closing prediction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to close prediction in database'
      });
    }

    if (!updatedPrediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found'
      });
    }

    console.log('✅ Prediction closed successfully:', updatedPrediction.id);
    
    return res.json({
      data: updatedPrediction,
      message: `Prediction ${id} closed successfully`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error closing prediction:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to close prediction'
    });
  }
});

// GET /api/v2/predictions/:id/activity - Get prediction activity
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching activity for prediction: ${id}`);
    
    // Get recent prediction entries (bets placed)
    const { data: entries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select(`
        id,
        amount,
        created_at,
        option:prediction_options(id, label),
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('prediction_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (entriesError) {
      console.error('Error fetching prediction entries for activity:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction activity',
        version: VERSION,
        details: entriesError.message
      });
    }

    // Transform entries into activity items
    const activities = (entries || []).map(entry => {
      const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
      const option = Array.isArray(entry.option) ? entry.option[0] : entry.option;
      
      return {
        id: entry.id,
        type: 'bet_placed',
        user: {
          id: user?.id || entry.id,
          username: user?.username || user?.full_name || 'Anonymous',
          avatar_url: user?.avatar_url
        },
        amount: entry.amount,
        option: option?.label || 'Unknown',
        timestamp: entry.created_at,
        timeAgo: getTimeAgo(entry.created_at),
        description: `Placed $${entry.amount} on "${option?.label || 'Unknown'}"`
      };
    });

    console.log(`✅ Found ${activities.length} activity items for prediction ${id}`);
    
    return res.json({
      data: activities,
      message: `Activity for prediction ${id}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching prediction activity:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction activity',
      version: VERSION
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

// GET /api/v2/predictions/:id/participants - Get prediction participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching participants for prediction: ${id}`);
    
    const { data: entries, error } = await supabase
      .from('prediction_entries')
      .select(`
        id,
        amount,
        created_at,
        option:prediction_options(id, label),
        user:users(id, username, full_name, avatar_url)
      `)
      .eq('prediction_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prediction participants:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction participants',
        version: VERSION,
        details: error.message
      });
    }

    // Transform the data to match the expected format
    const participants = (entries || []).map(entry => {
      const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
      const option = Array.isArray(entry.option) ? entry.option[0] : entry.option;
      
      return {
        id: user?.id || entry.id,
        username: user?.username || user?.full_name || 'Anonymous',
        avatar_url: user?.avatar_url,
        amount: entry.amount,
        option: option?.label || 'Unknown',
        joinedAt: entry.created_at,
        timeAgo: new Date(entry.created_at).toLocaleDateString()
      };
    });

    console.log(`✅ Found ${participants.length} participants for prediction ${id}`);
    
    return res.json({
      data: participants,
      message: `Participants for prediction ${id}`,
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching prediction participants:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction participants',
      version: VERSION
    });
  }
});

export default router;
