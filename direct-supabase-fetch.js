// Direct Supabase Fetch Script
// This script fetches predictions directly from Supabase and updates the frontend

console.log('🔍 Fetching predictions directly from Supabase...');

// Get Supabase client from the app
const supabase = window.supabase || window.supabaseClient;

if (!supabase) {
  console.error('❌ Supabase client not found');
  return;
}

async function fetchPredictionsDirectly() {
  try {
    console.log('📋 Fetching predictions from Supabase...');
    
    // Fetch predictions with all related data
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching predictions:', error);
      return;
    }

    console.log(`✅ Found ${predictions.length} predictions:`, predictions);

    // Update the frontend store directly
    if (window.usePredictionStore) {
      const store = window.usePredictionStore.getState();
      store.predictions = predictions;
      store.isLoading = false;
      store.error = null;
      console.log('✅ Updated prediction store');
    }

    // Also update the global state if available
    if (window.predictionStore) {
      window.predictionStore.predictions = predictions;
      window.predictionStore.isLoading = false;
      window.predictionStore.error = null;
      console.log('✅ Updated global prediction store');
    }

    // Force a re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('predictionsUpdated', { 
      detail: { predictions } 
    }));

    console.log('🎉 Predictions loaded successfully!');
    console.log('📊 Predictions found:', predictions.length);
    
    // Show the predictions in the console
    predictions.forEach((pred, index) => {
      console.log(`${index + 1}. ${pred.title} (${pred.category})`);
    });

    // Refresh the page to show the data
    console.log('🔄 Refreshing page to show predictions...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('❌ Error in fetchPredictionsDirectly:', error);
  }
}

// Run the fetch
fetchPredictionsDirectly(); 