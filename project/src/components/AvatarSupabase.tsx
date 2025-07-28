import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AvatarSupabaseProps {
  userId?: string;
  size?: number;
  className?: string;
}

const AvatarSupabase: React.FC<AvatarSupabaseProps> = ({
  userId,
  size = 80,
  className = '',
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const DEFAULT_IMAGE_URL = 'https://tyeysspawsupdgaowrec.supabase.co/storage/v1/object/public/profile-images/default-profile.jpg';
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const loadDefaultImage = useCallback(async () => {
    try {
      setAvatarUrl(DEFAULT_IMAGE_URL);
      setHasError(false);
    } catch (error) {
      console.error('Error setting default image:', error);
      setAvatarUrl(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadImage = useCallback(async (retryCount = 0) => {
    if (!userId) {
      await loadDefaultImage();
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Create a signed URL that's valid for 60 minutes
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('profile-images')
        .createSignedUrl(`${userId}/profile.jpg`, 3600);

      if (signedUrlError || !signedUrl?.signedUrl) {
        // If we can't get a signed URL, try for profile.png
        const { data: pngSignedUrl, error: pngSignedUrlError } = await supabase.storage
          .from('profile-images')
          .createSignedUrl(`${userId}/profile.png`, 3600);
          
        if (pngSignedUrlError || !pngSignedUrl?.signedUrl) {
          // If still no luck, fall back to default image
          await loadDefaultImage();
          return;
        }
        
        setAvatarUrl(pngSignedUrl.signedUrl);
        setHasError(false);
        setIsLoading(false);
        return;
      }
      
      setAvatarUrl(signedUrl.signedUrl);
      setHasError(false);
    } catch (error) {
      console.warn(`Error loading profile image (attempt ${retryCount + 1}):`, error);

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadImage(retryCount + 1), RETRY_DELAY);
      } else {
        await loadDefaultImage();
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadDefaultImage]);

  // Load image when userId changes
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!isMounted) return;
      await loadImage();
    };

    init();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [userId, loadImage]);

  const handleImageError = () => {
    loadDefaultImage();
  };

  if (isLoading) {
    return (
      <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
        <div className="animate-spin rounded-full h-1/2 w-1/2 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (hasError || !avatarUrl) {
    return (
      <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-1/2 w-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt="Profile"
      width={size}
      height={size}
      onError={handleImageError}
      className={`rounded-full object-cover ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

export default AvatarSupabase;