import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleParticipation() {
  try {
    console.log('🎯 Adding sample participation data...');

    // Get existing predictions
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('id, options:prediction_options(id)')
      .eq('status', 'open')
      .limit(3);

    if (predError) {
      console.error('❌ Error fetching predictions:', predError);
      return;
    }

    console.log(`📋 Found ${predictions?.length || 0} predictions to add participation to`);

    // Add sample participation for each prediction
    for (const prediction of predictions || []) {
      const options = prediction.options as any[];
      if (!options || options.length === 0) continue;

      // Add some stakes to each option
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const stakeAmount = Math.floor(Math.random() * 500) + 100; // Random amount between 100-600

        // Add prediction entry
        const { error: entryError } = await supabase
          .from('prediction_entries')
          .insert({
            prediction_id: prediction.id,
            option_id: option.id,
            user_id: '325343a7-0a32-4565-8059-7c0d9d3fed1b', // Use existing user
            amount: stakeAmount,
            potential_payout: stakeAmount * 2, // Simple 2x payout
            status: 'active'
          });

        if (entryError) {
          console.error(`❌ Error adding entry for option ${option.id}:`, entryError);
          continue;
        }

        // Update option total_staked
        const { error: updateError } = await supabase
          .from('prediction_options')
          .update({ 
            total_staked: stakeAmount,
            current_odds: 2.0
          })
          .eq('id', option.id);

        if (updateError) {
          console.error(`❌ Error updating option ${option.id}:`, updateError);
        } else {
          console.log(`✅ Added ${stakeAmount} stake to option ${option.id}`);
        }
      }

      // Update prediction pool_total and participant_count
      const totalStaked = options.reduce((sum, opt) => sum + (opt.total_staked || 0), 0);
      const participantCount = Math.floor(Math.random() * 10) + 1; // Random 1-10 participants

      const { error: predUpdateError } = await supabase
        .from('predictions')
        .update({
          pool_total: totalStaked,
          participant_count: participantCount
        })
        .eq('id', prediction.id);

      if (predUpdateError) {
        console.error(`❌ Error updating prediction ${prediction.id}:`, predUpdateError);
      } else {
        console.log(`✅ Updated prediction ${prediction.id} with pool_total: ${totalStaked}, participants: ${participantCount}`);
      }
    }

    console.log('🎉 Sample participation data added successfully!');
    console.log('🔄 Refresh the frontend to see the real data');

  } catch (error) {
    console.error('❌ Error adding sample participation:', error);
  }
}

addSampleParticipation();
