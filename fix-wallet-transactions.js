const { supabase } = require('./server/dist/config/database.js');

(async () => {
  const userId = '8160856f-9cf7-4aa3-9e77-0c3abcd342b4';
  
  console.log('🔍 Fetching user prediction entries...');
  const { data: entries } = await supabase
    .from('prediction_entries')
    .select(`
      *,
      prediction:predictions(title)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  console.log(`Found ${entries?.length || 0} prediction entries`);
  
  let created = 0;
  for (const entry of entries || []) {
    // Check if transaction exists
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'bet_lock')
      .eq('amount', entry.amount)
      .ilike('description', `%${entry.prediction?.title?.substring(0, 20) || 'bet'}%`);
    
    if (!existing || existing.length === 0) {
      console.log(`📝 Creating transaction for $${entry.amount} bet on "${entry.prediction?.title || 'Unknown'}"`);
      
      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          type: 'bet_lock',
          currency: 'USD',
          amount: entry.amount,
          status: 'completed',
          reference: `BET_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          description: `Bet on "${entry.prediction?.title || 'Unknown Prediction'}"`,
          related_prediction_entry_id: entry.id,
          created_at: entry.created_at
        });
      
      if (error) {
        console.error('❌ Error creating transaction:', error);
      } else {
        created++;
      }
    } else {
      console.log(`✅ Transaction already exists for $${entry.amount} bet`);
    }
  }
  
  console.log(`✅ Created ${created} missing bet_lock transactions`);
  
  // Show updated transaction count
  const { data: allTransactions } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  console.log(`\n📊 Updated wallet transactions (${allTransactions?.length || 0} total):`);
  allTransactions?.slice(0, 5).forEach((tx, i) => {
    console.log(`${i+1}. ${tx.created_at.substring(0, 19)} - ${tx.type} - $${tx.amount} - ${tx.description.substring(0, 50)}`);
  });
})();
