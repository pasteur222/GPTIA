import { supabase } from './supabase';

/**
 * Function to link WhatsApp Business number with validated certificate
 * @returns {Promise<Object>} The API response
 */
async function linkWhatsAppNumber() {
  try {
    const phoneNumberId = "571480576058954";
    const accessToken = "EAAJ7KxsnbacBO9tkcbQpN9YRLln0HPbIw6DyBpYrEGsVsXZCtiHv0aQgI0p495X0zcX972Pvk6ZAIl3ZA9ZBbkB4Ly1AMBAtZB0kkAap8d7hIGAZCy6W00kbHxOyHr6GARdQ165YRVyxx4n4ovNYJqnNByFTTf8qm7gKGDkrt5pL0UjMkj18OpTKRZBZCNCpA7ACfPX0hwWuOPBdxvvyR3vtRIBo117dIHHMMTqBDveh";
    const certificate = "CmsKJwiKlrG8kciLAxIGZW50OndhIg5DYXB0ZWNobm9sb2dpZVCrudfABhpAX95AFxoHbjQT3ONKFMAPErZGoHmP8J+hMyZqN9YmNbhEZjZiRWkpJ5wguezIdtxlwO0JUtSeP2bosh0+iRCmAxIvbRYQkoqqjdnzWrKwnK5tLJVe7ONdzfIF7XVWiIsc/Dqa6fONLrwkJWWyBhnkVp4=";

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/verify`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        certificate: certificate
      })
    });

    const data = await response.json();
    console.log("Réponse de Meta :", data);

    // If successful, update the WhatsApp configuration in the database
    if (response.ok) {
      await updateWhatsAppConfig(accessToken, phoneNumberId);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la vérification du numéro WhatsApp :", error);
    throw error;
  }
}

/**
 * Update WhatsApp configuration in the database
 * @param {string} accessToken - The WhatsApp access token
 * @param {string} phoneNumberId - The WhatsApp phone number ID
 */
async function updateWhatsAppConfig(accessToken, phoneNumberId) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .update({
        access_token: accessToken,
        phone_number_id: phoneNumberId,
        is_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('is_connected', true);

    if (error) throw error;
    console.log("WhatsApp configuration updated successfully");
  } catch (error) {
    console.error("Error updating WhatsApp configuration:", error);
  }
}

export { linkWhatsAppNumber };