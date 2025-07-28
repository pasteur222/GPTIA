import React, { useState, useEffect } from 'react';
import { Download, Search, Filter, RefreshCw, AlertCircle, Check, X, User, MessageSquare, BookOpen, GamepadIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactManagementProps {
  onClose?: () => void;
}

interface Contact {
  id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  source: 'customer_service' | 'education' | 'quiz';
  last_interaction?: string;
}

const ContactManagement: React.FC<ContactManagementProps> = ({ onClose }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, sourceFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get customer service contacts
      const { data: customerConversations, error: customerError } = await supabase
        .from('customer_conversations')
        .select('phone_number, created_at')
        .order('created_at', { ascending: false });

      if (customerError) throw customerError;

      // Get education contacts
      const { data: studentProfiles, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, phone_number, first_name, last_name, last_active_at');

      if (studentError) throw studentError;

      // Get quiz contacts
      const { data: quizParticipants, error: quizError } = await supabase
        .from('quiz_participants')
        .select('phone_number, last_answer_at');

      if (quizError) throw quizError;

      // Process and deduplicate contacts
      const contactMap = new Map<string, Contact>();

      // Process customer service contacts
      customerConversations?.forEach(conv => {
        if (conv.phone_number && !contactMap.has(conv.phone_number)) {
          contactMap.set(conv.phone_number, {
            id: conv.phone_number,
            phone_number: conv.phone_number,
            source: 'customer_service',
            last_interaction: conv.created_at
          });
        }
      });

      // Process education contacts
      studentProfiles?.forEach(student => {
        if (student.phone_number) {
          const existing = contactMap.get(student.phone_number);
          if (existing) {
            existing.first_name = student.first_name;
            existing.last_name = student.last_name;
            if (student.last_active_at && (!existing.last_interaction || new Date(student.last_active_at) > new Date(existing.last_interaction))) {
              existing.last_interaction = student.last_active_at;
              existing.source = 'education';
            }
          } else {
            contactMap.set(student.phone_number, {
              id: student.id,
              phone_number: student.phone_number,
              first_name: student.first_name,
              last_name: student.last_name,
              source: 'education',
              last_interaction: student.last_active_at
            });
          }
        }
      });

      // Process quiz contacts
      quizParticipants?.forEach(participant => {
        if (participant.phone_number) {
          const existing = contactMap.get(participant.phone_number);
          if (existing) {
            if (participant.last_answer_at && (!existing.last_interaction || new Date(participant.last_answer_at) > new Date(existing.last_interaction))) {
              existing.last_interaction = participant.last_answer_at;
              existing.source = 'quiz';
            }
          } else {
            contactMap.set(participant.phone_number, {
              id: participant.phone_number,
              phone_number: participant.phone_number,
              source: 'quiz',
              last_interaction: participant.last_answer_at
            });
          }
        }
      });

      // Convert map to array and sort by last interaction
      const allContacts = Array.from(contactMap.values())
        .sort((a, b) => {
          if (!a.last_interaction) return 1;
          if (!b.last_interaction) return -1;
          return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
        });

      setContacts(allContacts);
      setFilteredContacts(allContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.phone_number.toLowerCase().includes(term) ||
        (contact.first_name && contact.first_name.toLowerCase().includes(term)) ||
        (contact.last_name && contact.last_name.toLowerCase().includes(term))
      );
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(contact => contact.source === sourceFilter);
    }

    setFilteredContacts(filtered);
  };

  const exportContacts = async () => {
    try {
      setIsExporting(true);
      
      // Create CSV content
      const headers = ['Phone Number', 'First Name', 'Last Name', 'Source', 'Last Interaction'];
      const csvRows = [headers.join(',')];
      
      filteredContacts.forEach(contact => {
        const row = [
          contact.phone_number,
          contact.first_name || '',
          contact.last_name || '',
          contact.source,
          contact.last_interaction ? new Date(contact.last_interaction).toLocaleString() : ''
        ].map(value => `"${value.replace(/"/g, '""')}"`);
        
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Contacts exportés avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error exporting contacts:', error);
      setError('Erreur lors de l\'export des contacts');
    } finally {
      setIsExporting(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'customer_service':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'education':
        return <BookOpen className="w-4 h-4 text-green-600" />;
      case 'quiz':
        return <GamepadIcon className="w-4 h-4 text-yellow-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'customer_service':
        return 'Service Client';
      case 'education':
        return 'Éducation';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Gestion des Contacts</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom ou numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">Toutes les sources</option>
              <option value="customer_service">Service Client</option>
              <option value="education">Éducation</option>
              <option value="quiz">Quiz</option>
            </select>
          </div>
          
          <button
            onClick={loadContacts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          
          <button
            onClick={exportContacts}
            disabled={isExporting || filteredContacts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numéro de téléphone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière interaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Aucun contact trouvé
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contact.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {contact.first_name || contact.last_name ? 
                        `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 
                        'Non renseigné'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(contact.source)}
                        <span className="text-sm text-gray-900">
                          {getSourceLabel(contact.source)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.last_interaction ? 
                        new Date(contact.last_interaction).toLocaleString() : 
                        'Inconnue'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} trouvé{filteredContacts.length !== 1 ? 's' : ''}
        {contacts.length !== filteredContacts.length && ` (sur ${contacts.length} au total)`}
      </div>
    </div>
  );
};

export default ContactManagement;