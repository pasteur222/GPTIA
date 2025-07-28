import React, { useEffect, useState } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartsProps {
  moduleType: 'whatsapp' | 'education' | 'customerService' | 'quiz';
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ moduleType }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: []
  });
  const [distributionData, setDistributionData] = useState<any>({
    labels: [],
    datasets: []
  });
  const [performanceData, setPerformanceData] = useState<any>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    loadChartData();
  }, [moduleType]);

  const loadChartData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      switch (moduleType) {
        case 'whatsapp':
          await loadWhatsAppData();
          break;
        case 'education':
          await loadEducationData();
          break;
        case 'customerService':
          await loadCustomerServiceData();
          break;
        case 'quiz':
          await loadQuizData();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${moduleType} chart data:`, error);
      setError(`Failed to load chart data for ${moduleType}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppData = async () => {
    // Generate last 7 days for labels
    const labels = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), 6 - i), 'dd MMM');
    });

    // Get messages from the last 7 days
    const { data: messages, error } = await supabase
      .from('customer_conversations')
      .select('*')
      .gte('created_at', subDays(new Date(), 7).toISOString());

    if (error) throw error;

    // Process data for message volume chart
    const messagesByDay = labels.map(label => {
      const day = label;
      const count = messages?.filter(msg => 
        format(new Date(msg.created_at), 'dd MMM') === day
      ).length || 0;
      return count;
    });

    // Set line chart data
    setChartData({
      labels,
      datasets: [
        {
          label: 'Messages',
          data: messagesByDay,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    });

    // Process data for message type distribution
    const messageTypes = ['user', 'bot'];
    const messageTypeData = messageTypes.map(type => 
      messages?.filter(msg => msg.sender === type).length || 0
    );

    // Set doughnut chart data
    setDistributionData({
      labels: ['Utilisateurs', 'Bot'],
      datasets: [
        {
          data: messageTypeData,
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(234, 179, 8, 0.7)'
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(234, 179, 8)'
          ],
          borderWidth: 1,
        }
      ]
    });

    // Process data for delivery status
    const statusLabels = ['Delivered', 'Pending', 'Failed'];
    const statusData = [
      messages?.filter(msg => msg.status === 'delivered').length || 0,
      messages?.filter(msg => msg.status === 'pending').length || 0,
      messages?.filter(msg => msg.status === 'failed').length || 0
    ];

    // Set bar chart data
    setPerformanceData({
      labels: statusLabels,
      datasets: [
        {
          label: 'Message Status',
          data: statusData,
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(234, 179, 8, 0.7)',
            'rgba(239, 68, 68, 0.7)'
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(234, 179, 8)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 1,
        }
      ]
    });
  };

  const loadEducationData = async () => {
    // Generate last 7 days for labels
    const labels = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), 6 - i), 'dd MMM');
    });

    // Get education sessions from the last 7 days
    const { data: sessions, error } = await supabase
      .from('education_sessions')
      .select('*')
      .gte('start_time', subDays(new Date(), 7).toISOString());

    if (error) throw error;

    // Process data for sessions chart
    const sessionsByDay = labels.map(label => {
      const day = label;
      const count = sessions?.filter(session => 
        format(new Date(session.start_time), 'dd MMM') === day
      ).length || 0;
      return count;
    });

    // Set line chart data
    setChartData({
      labels,
      datasets: [
        {
          label: 'Sessions',
          data: sessionsByDay,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    });

    // Process data for subject distribution
    const { data: analytics } = await supabase
      .from('education_analytics')
      .select('subject');

    if (analytics && analytics.length > 0) {
      // Group subjects and count occurrences
      const subjectCounts = analytics.reduce((acc: Record<string, number>, item) => {
        const subject = item.subject || 'Unknown';
        acc[subject] = (acc[subject] || 0) + 1;
        return acc;
      }, {});

      const subjects = Object.keys(subjectCounts);
      const counts = Object.values(subjectCounts);

      // Set doughnut chart data
      setDistributionData({
        labels: subjects,
        datasets: [
          {
            data: counts,
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(34, 197, 94, 0.7)',
              'rgba(168, 85, 247, 0.7)',
              'rgba(234, 179, 8, 0.7)'
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(239, 68, 68)',
              'rgb(34, 197, 94)',
              'rgb(168, 85, 247)',
              'rgb(234, 179, 8)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }

    // Process data for performance metrics
    if (sessions && sessions.length > 0) {
      const comprehensionScores = sessions.map(session => session.comprehension_score || 0);
      const avgComprehension = comprehensionScores.reduce((sum, score) => sum + score, 0) / comprehensionScores.length;
      
      const correctAnswers = sessions.reduce((sum, session) => sum + (session.correct_answers || 0), 0);
      const totalQuestions = sessions.reduce((sum, session) => sum + (session.questions_asked || 0), 0);
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Set bar chart data
      setPerformanceData({
        labels: ['Compréhension', 'Précision'],
        datasets: [
          {
            label: 'Performance',
            data: [avgComprehension * 100, accuracy],
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(34, 197, 94, 0.7)'
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(34, 197, 94)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }
  };

  const loadCustomerServiceData = async () => {
    // Generate last 7 days for labels
    const labels = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), 6 - i), 'dd MMM');
    });

    // Get customer service messages from the last 7 days
    const { data: messages, error } = await supabase
      .from('customer_conversations')
      .select('*')
      .gte('created_at', subDays(new Date(), 7).toISOString());

    if (error) throw error;

    // Process data for message volume chart
    const messagesByDay = labels.map(label => {
      const day = label;
      const count = messages?.filter(msg => 
        format(new Date(msg.created_at), 'dd MMM') === day
      ).length || 0;
      return count;
    });

    // Set line chart data
    setChartData({
      labels,
      datasets: [
        {
          label: 'Messages',
          data: messagesByDay,
          borderColor: 'rgb(234, 179, 8)',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    });

    // Process data for intent distribution
    const intents = messages
      ?.filter(msg => msg.intent)
      .reduce((acc: Record<string, number>, msg) => {
        const intent = msg.intent || 'Unknown';
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {});

    if (intents && Object.keys(intents).length > 0) {
      const intentLabels = Object.keys(intents);
      const intentCounts = Object.values(intents);

      // Set doughnut chart data
      setDistributionData({
        labels: intentLabels,
        datasets: [
          {
            data: intentCounts,
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(34, 197, 94, 0.7)',
              'rgba(168, 85, 247, 0.7)',
              'rgba(234, 179, 8, 0.7)'
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(239, 68, 68)',
              'rgb(34, 197, 94)',
              'rgb(168, 85, 247)',
              'rgb(234, 179, 8)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }

    // Process data for response time
    const responseTimes = messages
      ?.filter(msg => msg.response_time)
      .map(msg => msg.response_time || 0);

    if (responseTimes && responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      // Group response times into buckets
      const fastResponses = responseTimes.filter(time => time < 2).length;
      const mediumResponses = responseTimes.filter(time => time >= 2 && time < 5).length;
      const slowResponses = responseTimes.filter(time => time >= 5).length;

      // Set bar chart data
      setPerformanceData({
        labels: ['< 2s', '2-5s', '> 5s'],
        datasets: [
          {
            label: 'Temps de réponse',
            data: [fastResponses, mediumResponses, slowResponses],
            backgroundColor: [
              'rgba(34, 197, 94, 0.7)',
              'rgba(234, 179, 8, 0.7)',
              'rgba(239, 68, 68, 0.7)'
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(234, 179, 8)',
              'rgb(239, 68, 68)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }
  };

  const loadQuizData = async () => {
    // Generate last 7 days for labels
    const labels = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), 6 - i), 'dd MMM');
    });

    // Get quiz responses from the last 7 days
    const { data: responses, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .gte('created_at', subDays(new Date(), 7).toISOString());

    if (error) throw error;

    // Process data for responses chart
    const responsesByDay = labels.map(label => {
      const day = label;
      const count = responses?.filter(response => 
        format(new Date(response.created_at), 'dd MMM') === day
      ).length || 0;
      return count;
    });

    // Set line chart data
    setChartData({
      labels,
      datasets: [
        {
          label: 'Réponses',
          data: responsesByDay,
          borderColor: 'rgb(234, 179, 8)',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    });

    // Get quiz questions and group by category
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('category');

    if (questions && questions.length > 0) {
      // Group questions by category and count
      const categoryCount = questions.reduce((acc: Record<string, number>, question) => {
        const category = question.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const categories = Object.keys(categoryCount);
      const counts = Object.values(categoryCount);

      // Set doughnut chart data
      setDistributionData({
        labels: categories,
        datasets: [
          {
            data: counts,
            backgroundColor: [
              'rgba(59, 130, 246, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(34, 197, 94, 0.7)',
              'rgba(168, 85, 247, 0.7)',
              'rgba(234, 179, 8, 0.7)'
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(239, 68, 68)',
              'rgb(34, 197, 94)',
              'rgb(168, 85, 247)',
              'rgb(234, 179, 8)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }

    // Process data for correct vs incorrect answers
    if (responses && responses.length > 0) {
      const correctAnswers = responses.filter(response => response.is_correct).length;
      const incorrectAnswers = responses.filter(response => !response.is_correct).length;

      // Set bar chart data
      setPerformanceData({
        labels: ['Correctes', 'Incorrectes'],
        datasets: [
          {
            label: 'Réponses',
            data: [correctAnswers, incorrectAnswers],
            backgroundColor: [
              'rgba(34, 197, 94, 0.7)',
              'rgba(239, 68, 68, 0.7)'
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(239, 68, 68)'
            ],
            borderWidth: 1,
          }
        ]
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {moduleType === 'whatsapp' && 'Volume de messages'}
            {moduleType === 'education' && 'Sessions d\'apprentissage'}
            {moduleType === 'customerService' && 'Volume de tickets'}
            {moduleType === 'quiz' && 'Participation au quiz'}
          </h3>
          <div className="h-64">
            <Line 
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {moduleType === 'whatsapp' && 'Distribution des messages'}
            {moduleType === 'education' && 'Distribution des matières'}
            {moduleType === 'customerService' && 'Distribution des intentions'}
            {moduleType === 'quiz' && 'Distribution des catégories'}
          </h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-48 h-48">
              <Doughnut 
                data={distributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {moduleType === 'whatsapp' && 'Statut des messages'}
          {moduleType === 'education' && 'Performance des étudiants'}
          {moduleType === 'customerService' && 'Temps de réponse'}
          {moduleType === 'quiz' && 'Réponses correctes vs incorrectes'}
        </h3>
        <div className="h-64">
          <Bar 
            data={performanceData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;