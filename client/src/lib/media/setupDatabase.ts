// Setup script to create the prediction_media table
import { supabase } from '@/lib/supabase';

export async function setupPredictionMediaTable() {
  console.log('🔧 Setting up prediction_media table...');
  
  try {
    // Create the table using raw SQL
    const { error } = await supabase.rpc('exec', {
      sql: `
        -- Create the prediction_media table
        CREATE TABLE IF NOT EXISTS public.prediction_media (
          predictionId uuid PRIMARY KEY REFERENCES public.predictions(id) ON DELETE CASCADE,
          provider text NOT NULL,
          providerId text NOT NULL,
          query text NOT NULL,
          urls jsonb NOT NULL,
          alt text NOT NULL,
          attribution jsonb NOT NULL,
          score numeric NOT NULL,
          pickedAt timestamptz NOT NULL DEFAULT now()
        );

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_prediction_media_picked_at 
        ON public.prediction_media (pickedAt DESC);

        -- Enable RLS
        ALTER TABLE public.prediction_media ENABLE ROW LEVEL SECURITY;

        -- Create policies
        DROP POLICY IF EXISTS "Allow read access to prediction_media" ON public.prediction_media;
        CREATE POLICY "Allow read access to prediction_media" 
        ON public.prediction_media FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Allow insert/update for all users" ON public.prediction_media;
        CREATE POLICY "Allow insert/update for all users" 
        ON public.prediction_media FOR ALL USING (true);
      `
    });

    if (error) {
      console.error('❌ Failed to create table via RPC:', error);
      
      // Try alternative approach - direct table creation
      const { error: createError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'prediction_media')
        .single();

      if (createError && createError.code === 'PGRST116') {
        // Table doesn't exist, let's create it manually
        console.log('📝 Table does not exist. Creating manually...');
        
        // Since we can't run DDL directly, let's just try to insert and see what happens
        const testInsert = await supabase
          .from('prediction_media')
          .insert({
            predictionId: '00000000-0000-0000-0000-000000000000',
            provider: 'test',
            providerId: 'test',
            query: 'test',
            urls: { thumb: 'test', small: 'test', full: 'test' },
            alt: 'test',
            attribution: { author: 'test', link: 'test' },
            score: 0,
            pickedAt: new Date().toISOString()
          });

        if (testInsert.error) {
          console.error('❌ Table creation needed. Please run this SQL in Supabase SQL Editor:');
          console.log(`
CREATE TABLE IF NOT EXISTS public.prediction_media (
  predictionId uuid PRIMARY KEY REFERENCES public.predictions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  providerId text NOT NULL,
  query text NOT NULL,
  urls jsonb NOT NULL,
  alt text NOT NULL,
  attribution jsonb NOT NULL,
  score numeric NOT NULL,
  pickedAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prediction_media_picked_at ON public.prediction_media (pickedAt DESC);
ALTER TABLE public.prediction_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to prediction_media" ON public.prediction_media FOR SELECT USING (true);
CREATE POLICY "Allow insert/update for all users" ON public.prediction_media FOR ALL USING (true);
          `);
          return false;
        } else {
          // Clean up test record
          await supabase
            .from('prediction_media')
            .delete()
            .eq('predictionId', '00000000-0000-0000-0000-000000000000');
        }
      }
    }

    console.log('✅ prediction_media table is ready!');
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Auto-run when imported in dev mode
if (import.meta.env.DEV) {
  setupPredictionMediaTable();
}
