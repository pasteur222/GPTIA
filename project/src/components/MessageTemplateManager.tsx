import React, { useState, useEffect } from 'react';
import { Search, FileCheck, Trash2, X, AlertCircle, Edit2, Save, Plus } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import RichTextEditor from './RichTextEditor';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

interface MessageTemplateManagerProps {
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Marketing',
  'Support',
  'Onboarding',
  'Education',
  'Billing',
  'Notifications'
];

const VARIABLES = [
  { name: 'name', description: 'Full name of the recipient' },
  { name: 'firstName', description: 'First name of the recipient' },
  { name: 'lastName', description: 'Last name of the recipient' },
  { name: 'date', description: 'Current date' },
  { name: 'time', description: 'Current time' }
];

const MessageTemplateManager: React.FC<MessageTemplateManagerProps> = ({
  onSelectTemplate,
  onClose
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: '',
    content: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      setError('Failed to load templates');
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Failed to delete template');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!newTemplate.name || !newTemplate.category || !newTemplate.content) {
        setError('Please fill in all fields');
        return;
      }

      const variables = [...newTemplate.content.matchAll(/\{\{([^}]+)\}\}/g)]
        .map(match => match[1])
        .filter((value, index, self) => self.indexOf(value) === index);

      const { data, error } = await supabase
        .from('message_templates')
        .insert([{
          name: newTemplate.name,
          category: newTemplate.category,
          content: newTemplate.content,
          variables,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setNewTemplate({ name: '', category: '', content: '' });
      setIsCreating(false);
      setError(null);
    } catch (error) {
      console.error('Error creating template:', error);
      setError('Failed to create template');
    }
  };

  const insertVariable = (variable: string) => {
    setNewTemplate(prev => ({
      ...prev,
      content: prev.content + `{{${variable}}}`
    }));
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="fixed inset-0 bg-white z-50">
        <div className="flex flex-col h-screen">
          <div className="flex items-center justify-between p-6 bg-white border-b">
            <h2 className="text-xl font-semibold text-gray-900">Create New Template</h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Welcome Message"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Content
                </label>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Available variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {VARIABLES.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.name)}
                        className="group relative px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                      >
                        {`{{${variable.name}}}`}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {variable.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <RichTextEditor
                  value={newTemplate.content}
                  onChange={(content) => setNewTemplate(prev => ({ ...prev, content }))}
                  placeholder="Type your template message here..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.name || !newTemplate.category || !newTemplate.content}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <h2 className="text-xl font-semibold text-gray-900">Message Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-4"
            >
              <Plus className="w-4 h-4" />
              Add Template
            </button>
          </div>

          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <span className="text-sm text-gray-500">{template.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectTemplate(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Use Template"
                    >
                      <FileCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {template.content}
                </div>
                {template.variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {template.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-400">
                  Last updated: {format(new Date(template.updated_at), 'PPp')}
                </div>
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No templates found matching your search' : 'No templates available'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateManager;