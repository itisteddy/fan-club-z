import { supabase } from '../config/database';
import categoriesSeed from '../seed/categories.json';

/**
 * Bootstrap categories from seed data (idempotent)
 * Ensures all categories from seed exist in the database
 */
export async function seedCategories(): Promise<void> {
  try {
    console.log('🌱 Seeding categories...');

    for (const cat of categoriesSeed) {
      // Check if category exists by slug
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', cat.slug)
        .maybeSingle();

      if (!existing) {
        // Insert new category
        const { error } = await supabase
          .from('categories')
          .insert({
            slug: cat.slug,
            label: cat.label,
            icon: cat.icon || null,
            sort_order: cat.sort_order,
            is_enabled: cat.is_enabled,
          });

        if (error) {
          console.error(`❌ Failed to seed category ${cat.slug}:`, error);
        } else {
          console.log(`✅ Seeded category: ${cat.slug}`);
        }
      } else {
        // Update existing category to ensure seed values are applied (idempotent)
        const { error } = await supabase
          .from('categories')
          .update({
            label: cat.label,
            icon: cat.icon || null,
            sort_order: cat.sort_order,
            is_enabled: cat.is_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`❌ Failed to update category ${cat.slug}:`, error);
        }
      }
    }

    console.log('✅ Categories seeding complete');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    // Don't throw - allow server to start even if seeding fails
  }
}
