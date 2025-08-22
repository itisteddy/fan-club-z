"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAvatarsBucket = ensureAvatarsBucket;
const database_1 = require("../config/database");
/**
 * Ensure the avatars storage bucket exists and is public.
 */
async function ensureAvatarsBucket() {
    try {
        const { data: buckets, error: listErr } = await database_1.supabase.storage.listBuckets?.();
        if (listErr) {
            console.warn('⚠️ Could not list storage buckets:', listErr.message);
            return;
        }
        const exists = Array.isArray(buckets) && buckets.some((b) => b.name === 'avatars');
        if (!exists) {
            console.log('🪣 Creating public storage bucket: avatars');
            const { error: createErr } = await database_1.supabase.storage.createBucket?.('avatars', {
                public: true,
                fileSizeLimit: 10 * 1024 * 1024, // 10MB
                allowedMimeTypes: ['image/*'],
            });
            if (createErr) {
                console.warn('⚠️ Failed to create avatars bucket:', createErr.message);
            }
        }
    }
    catch (err) {
        console.warn('⚠️ ensureAvatarsBucket error:', err?.message || err);
    }
}
