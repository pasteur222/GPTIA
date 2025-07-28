import React, { useState, useEffect } from 'react';
import { Globe, Webhook } from 'lucide-react';
import WebhookConfigForm from './WebhookConfigForm';

interface WebhookConfigProps {
  onClose?: () => void;
}

const WebhookConfig: React.FC<WebhookConfigProps> = ({ onClose }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Webhook Configuration</h2>
      </div>

      <WebhookConfigForm />

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Webhook className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-800">About Webhooks</h3>
          </div>
          <p className="text-sm text-blue-600 mb-2">
            A webhook is a bridge between WhatsApp and your application. It receives messages and status updates from WhatsApp and forwards them to your application for processing.
          </p>
          <p className="text-sm text-blue-600">
            For proper functionality, ensure your webhook server is deployed and accessible from the internet. Configure the same URL in your Meta Developer Dashboard.
          </p>
        </div>
    </div>
  );
};

export default WebhookConfig;