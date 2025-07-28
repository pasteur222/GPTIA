import { supabase } from './supabase';
import { getWhatsAppConfig } from './whatsapp';

interface TemplateParameter {
  type: string;
  text?: string;
  image?: {
    link: string;
  };
  video?: {
    link: string;
  };
  document?: {
    link: string;
  };
}

interface TemplateComponent {
  type: string;
  parameters?: TemplateParameter[];
  format?: string;
  text?: string;
}

interface TemplateRequest {
  to: string;
  templateName: string;
  language: string;
  components?: TemplateComponent[];
  headerMediaUrl?: string;
  headerMediaType?: 'image' | 'video' | 'document';
  bodyMediaUrl?: string;
  bodyMediaType?: 'image' | 'video' | 'document';
  footerMediaUrl?: string;
  footerMediaType?: 'image' | 'video' | 'document';
  customBody?: string;
  customFooter?: string;
}

/**
 * Sends a WhatsApp template message with optional media
 * @param request Template request object
 * @param userId Optional user ID for user-specific WhatsApp config
 * @returns Object with success status and message ID or error
 */
export async function sendWhatsAppTemplateMessage(
  request: TemplateRequest,
  userId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get WhatsApp configuration
    const { accessToken, phoneNumberId } = await getWhatsAppConfig(userId);
    
    // Prepare template message payload
    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: request.to,
      type: 'template',
      template: {
        name: request.templateName,
        language: {
          code: request.language || 'fr'
        }
      }
    };
    
    // Process components
    const components: any[] = [];
    
    // If we have a header media URL, add it as a header component
    if (request.headerMediaUrl && request.headerMediaType) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: request.headerMediaType,
            [request.headerMediaType]: {
              link: request.headerMediaUrl
            }
          }
        ]
      });
    }
    
    // If we have a custom body, add it as a body component
    if (request.customBody) {
      // Find existing body component parameters
      const bodyComponent = request.components?.find(c => c.type === 'body');
      const bodyParams = bodyComponent?.parameters || [];
      
      components.push({
        type: 'body',
        text: request.customBody,
        parameters: bodyParams
      });
    }
    
    // If we have a body media URL, add it to the body component
    if (request.bodyMediaUrl && request.bodyMediaType) {
      // Find the body component we just added or add a new one
      let bodyComponent = components.find(c => c.type === 'body');
      if (!bodyComponent) {
        bodyComponent = {
          type: 'body',
          parameters: []
        };
        components.push(bodyComponent);
      }
      
      // Add the media parameter
      if (!bodyComponent.parameters) {
        bodyComponent.parameters = [];
      }
      
      bodyComponent.parameters.push({
        type: request.bodyMediaType,
        [request.bodyMediaType]: {
          link: request.bodyMediaUrl
        }
      });
    }
    
    // If we have a custom footer, add it as a footer component
    if (request.customFooter) {
      components.push({
        type: 'footer',
        text: request.customFooter
      });
    }
    
    // If we have a footer media URL, add it to the footer component
    if (request.footerMediaUrl && request.footerMediaType) {
      // Find the footer component we just added or add a new one
      let footerComponent = components.find(c => c.type === 'footer');
      if (!footerComponent) {
        footerComponent = {
          type: 'footer',
          parameters: []
        };
        components.push(footerComponent);
      }
      
      // Add the media parameter
      if (!footerComponent.parameters) {
        footerComponent.parameters = [];
      }
      
      footerComponent.parameters.push({
        type: request.footerMediaType,
        [request.footerMediaType]: {
          link: request.footerMediaUrl
        }
      });
    }
    
    // Add other components if provided
    if (request.components && request.components.length > 0) {
      // Filter out components that we've already added (header, body, footer)
      const otherComponents = request.components.filter(c => 
        !(c.type === 'header' && request.headerMediaUrl) &&
        !(c.type === 'body' && (request.customBody || request.bodyMediaUrl)) &&
        !(c.type === 'footer' && (request.customFooter || request.footerMediaUrl))
      );
      
      components.push(...otherComponents);
    }
    
    // Add components to payload if we have any
    if (components.length > 0) {
      templatePayload.template.components = components;
    }
    
    // Send template message
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templatePayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'WhatsApp API error');
    }
    
    const data = await response.json();
    
    // Log message to database
    await supabase.from('message_logs').insert({
      status: 'sent',
      phone_number: request.to,
      message_preview: `Template: ${request.templateName}`,
      message_id: data.messages?.[0]?.id,
      created_at: new Date().toISOString()
    });
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
    
    // Log error to database
    await supabase.from('message_logs').insert({
      status: 'error',
      phone_number: request.to,
      message_preview: `Template: ${request.templateName}`,
      error: error.message,
      created_at: new Date().toISOString()
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Uploads a media file to Supabase storage and returns the public URL
 * @param file File to upload
 * @param folder Optional folder name
 * @returns Public URL of the uploaded file
 */
export async function uploadTemplateMedia(
  file: File,
  folder: string = 'whatsapp-media'
): Promise<string> {
  try {
    // Validate file size (max 16MB for WhatsApp)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds WhatsApp limit of 16MB`);
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported by WhatsApp`);
    }

    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);
    
    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded file');
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}