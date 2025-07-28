import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart2, MessageSquare, CheckCircle, XCircle, Clock, Users, TrendingUp, Filter, X, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AnalyticsData {
  totalMessages: number;
  deliveryRate: number;
  responseTime: number;
  activeUsers: number;
  messagesByDate: Record<string, number>;
  messagesByStatus: Record<string, number>;
  topRecipients: Array<{ phone_number: string; count: number }>;
  messagesByType: Record<string, number>;
}

const WhatsAppAnalytics: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMessages: 0,
    deliveryRate: 0,
    responseTime: 0,
    activeUsers: 0,
    messagesByDate: {},
    messagesByStatus: {},
    topRecipients: [],
    messagesByType: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      // Fetch message logs
      const { data: logs, error: logsError } = await supabase
        .from('message_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (logsError) throw logsError;

      // Process analytics data
      const messagesByDate: Record<string, number> = {};
      const messagesByStatus: Record<string, number> = { delivered: 0, sent: 0, error: 0, pending: 0 };
      const recipientCounts: Record<string, number> = {};
      const messagesByType: Record<string, number> = { text: 0, image: 0, video: 0, document: 0 };
      
      // Initialize dates for the chart
      const dates = [];
      for (let i = 0; i < (dateRange === '24h' ? 24 : dateRange === '7d' ? 7 : 30); i++) {
        const date = new Date(startDate);
        if (dateRange === '24h') {
          date.setHours(date.getHours() + i);
          dates.push(format(date, 'HH:00'));
        } else {
          date.setDate(date.getDate() + i);
          dates.push(format(date, 'yyyy-MM-dd'));
        }
      }
      
      // Initialize with zeros
      dates.forEach(date => {
        messagesByDate[date] = 0;
      });

      // Process logs
      logs?.forEach(log => {
        // Count by date
        const date = dateRange === '24h' 
          ? format(new Date(log.created_at), 'HH:00')
          : format(new Date(log.created_at), 'yyyy-MM-dd');
        
        messagesByDate[date] = (messagesByDate[date] || 0) + 1;

        // Count by status
        messagesByStatus[log.status] = (messagesByStatus[log.status] || 0) + 1;

        // Count by recipient
        if (log.phone_number) {
          recipientCounts[log.phone_number] = (recipientCounts[log.phone_number] || 0) + 1;
        }

        // Count by type (assuming we have this info)
        const messageType = log.message_preview?.includes('image') ? 'image' : 
                           log.message_preview?.includes('video') ? 'video' :
                           log.message_preview?.includes('document') ? 'document' : 'text';
        messagesByType[messageType] = (messagesByType[messageType] || 0) + 1;
      });

      // Calculate top recipients
      const topRecipients = Object.entries(recipientCounts)
        .map(([phone_number, count]) => ({ phone_number, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate delivery rate
      const totalMessages = logs?.length || 0;
      const deliveredMessages = messagesByStatus.delivered || 0;
      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

      setAnalytics({
        totalMessages,
        deliveryRate,
        responseTime: 0, // Not tracked in this implementation
        activeUsers: Object.keys(recipientCounts).length,
        messagesByDate,
        messagesByStatus,
        topRecipients,
        messagesByType
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const renderChart = () => {
    const dates = Object.keys(analytics.messagesByDate).sort();
    const maxValue = Math.max(...Object.values(analytics.messagesByDate), 1);
    const chartHeight = 200;

    return (
      <div className="relative h-[200px] mt-4">
        <div className="absolute inset-0 flex items-end justify-between">
          {dates.map(date => {
            const value = analytics.messagesByDate[date] || 0;
            const height = (value / maxValue) * chartHeight;
            return (
              <div key={date} className="flex flex-col items-center w-full">
                <div
                  className="w-full bg-blue-500 mx-1 rounded-t"
                  style={{ height: `${height}px` }}
                />
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left truncate max-w-[60px]">
                  {date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-6 bg-white border-b">
        <h2 className="text-xl font-semibold text-gray-900">WhatsApp Analytics</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Total Messages</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{analytics.totalMessages}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-gray-900">Delivery Rate</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{analytics.deliveryRate.toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <h3 className="font-medium text-gray-900">Avg Response Time</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{analytics.responseTime.toFixed(1)}s</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Active Users</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{analytics.activeUsers}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Message Volume</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            {renderChart()}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Top Recipients</h3>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-4">
              {analytics.topRecipients.length > 0 ? (
                analytics.topRecipients.map((recipient, index) => (
                  <div key={recipient.phone_number} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600">
                        {index + 1}
                      </span>
                      <span className="text-gray-900">{recipient.phone_number}</span>
                    </div>
                    <span className="text-gray-600">{recipient.count} messages</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Message Status</h3>
              <Filter className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              {Object.entries(analytics.messagesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      status === 'delivered' ? 'bg-green-500' :
                      status === 'error' ? 'bg-red-500' : 
                      status === 'sent' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`} />
                    <span className="capitalize text-gray-900">{status}</span>
                  </div>
                  <span className="text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Message Types</h3>
              <BarChart2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="space-y-4">
              {Object.entries(analytics.messagesByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize text-gray-900">{type}</span>
                  <span className="text-gray-600">{count} messages</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppAnalytics;