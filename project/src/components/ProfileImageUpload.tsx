import React, { useRef, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AvatarSupabase from './AvatarSupabase';

interface ProfileImageUploadProps {
  userId?: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ userId, onImageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    
    if (!e.target.files || e.target.files.length === 0 || !userId) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should not exceed 2MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Always use .jpg extension for consistency with AvatarSupabase component
      const filePath = `${userId}/profile.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });
        
      if (uploadError) throw uploadError;
      
      // Call the parent's onImageChange handler
      onImageChange(e);
      
      // Force reload of the avatar component by triggering a state change in the parent
      // This is handled by the onImageChange callback
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
        {isUploading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        ) : (
          <AvatarSupabase userId={userId || undefined} size={96} />
        )}
      </div>
      
      {uploadError && (
        <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>{uploadError}</span>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-0 right-0 bg-red-600 text-white p-1.5 rounded-full shadow-sm hover:bg-red-700"
        disabled={isUploading}
      >
        <Camera className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ProfileImageUpload;