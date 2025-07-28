import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X, AlertCircle, Repeat, Save, Trash2, Plus, RefreshCw, Users } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ScheduledMessage {
  id: string;
  message: string;
  recipients: string[];
  send_at: string;
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly';
  status: 'scheduled' | 'sent' | 'failed';
  created_at: string;
}

interface MessageSchedulerProps {
  onClose: () => void;
}

const MessageScheduler: React.FC<MessageSchedulerProps> = ({ onClose }) => {
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    message: '',
    recipients: [] as string[],
    send_at: format(new Date().setMinutes(new Date().getMinutes() + 30), "yyyy-MM-dd'T'HH:mm"),
    repeat_type: 'none' as const
  });
  const [recipientFile, setRecipientFile] = useState<File | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('send_at', { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      setError('Failed to load scheduled messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRecipientFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const numbers = text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      setNewSchedule(prev => ({ ...prev, recipients: numbers }));
    };
    reader.readAsText(file);
  };

  const handleSaveSchedule = async () => {
    try {
      if (!newSchedule.message || !newSchedule.recipients.length) {
        setError('Please fill in all required fields');
        return;
      }

      const { data, error } = await supabase
        .from('scheduled_messages')
        .insert([{
          message: newSchedule.message,
          recipients: newSchedule.recipients,
          send_at: newSchedule.send_at,
          repeat_type: newSchedule.repeat_type,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data]);
      setIsCreating(false);
      setNewSchedule({
        message: '',
        recipients: [],
        send_at: format(new Date().setMinutes(new Date().getMinutes() + 30), "yyyy-MM-dd'T'HH:mm"),
        repeat_type: 'none'
      });
      setRecipientFile(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setError('Failed to delete schedule');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <h2 className="text-xl font-semibold text-gray-900">Message Scheduler</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Schedule
            </button>
          </div>

          {isCreating && (
            <div className="mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">New Schedule</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message Content
                    </label>
                    <RichTextEditor
                      value={newSchedule.message}
                      onChange={(content) => setNewSchedule(prev => ({ ...prev, message: content }))}
                      placeholder="Type your message here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipients
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".txt,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="recipient-file"
                      />
                      <label
                        htmlFor="recipient-file"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <Users className="w-4 h-4" />
                        Upload Recipients
                      </label>
                      {recipientFile && (
                        <span className="text-sm text-gray-600">
                          {recipientFile.name} ({newSchedule.recipients.length} numbers)
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Upload a text file with one phone number per line
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={newSchedule.send_at}
                        onChange={(e) => setNewSchedule(prev => ({ ...prev, send_at: e.target.value }))}
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repeat
                      </label>
                      <select
                        value={newSchedule.repeat_type}
                        onChange={(e) => setNewSchedule(prev => ({
                          ...prev,
                          repeat_type: e.target.value as typeof newSchedule.repeat_type
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="none">No repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 px-6 py-4 bg-gray-50 border-t">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={!newSchedule.message || !newSchedule.recipients.length}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Schedule
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scheduled Messages</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No scheduled messages</p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          schedule.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : schedule.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                        </span>
                        {schedule.repeat_type !== 'none' && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Repeat className="w-4 h-4" />
                            {schedule.repeat_type.charAt(0).toUpperCase() + schedule.repeat_type.slice(1)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="prose prose-sm max-w-none mb-4">
                      {schedule.message}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {format(new Date(schedule.send_at), 'PPp')}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {schedule.recipients.length} recipients
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageScheduler;