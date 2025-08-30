import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface ImageUploadResult {
  url: string;
  path: string;
}

export const uploadImageToStorage = async (
  file: File, 
  bucket: string = 'comment-images',
  folder: string = 'comments'
): Promise<ImageUploadResult> => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${timestamp}-${randomId}.${ext}`;
    const path = `${folder}/${filename}`;

    console.log(`📤 Uploading image to ${bucket}/${path}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('❌ Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    const result: ImageUploadResult = {
      url: publicUrlData.publicUrl,
      path: data.path
    };

    console.log(`✅ Image uploaded successfully: ${result.url}`);
    return result;

  } catch (error) {
    console.error('❌ Image upload failed:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    throw error;
  }
};

export const deleteImageFromStorage = async (
  path: string, 
  bucket: string = 'comment-images'
): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('❌ Image deletion error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }

    console.log(`✅ Image deleted successfully: ${path}`);
  } catch (error) {
    console.error('❌ Image deletion failed:', error);
    throw error;
  }
};
