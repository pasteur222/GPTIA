import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bot, Settings, RefreshCw, AlertCircle, Plus, X, Save, Play, Pause, Database, BarChart2, Trash2, AlertTriangle, Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface Question {
  id: string;
  text: string;
  correct_answer: boolean;
  explanation: string;
  category: string;
}

interface QuizGame {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  questions_per_day: number;
  time_interval: {
    type: 'minutes' | 'hours' | 'days';
    value: number;
  };
  status: 'scheduled' | 'active' | 'completed' | 'paused';
  participants: string[];
}

interface PlayerStats {
  phone_number: string;
  correct_answers: number;
  total_answers: number;
  score: number;
  last_answer_date: Date;
}

interface SimulationQuestion {
  question: string;
  correct_answer: boolean;
  explanation: string;
  category: string;
}

const Quiz = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [games, setGames] = useState<QuizGame[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showGameEditor, setShowGameEditor] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    correct_answer: true,
    explanation: '',
    category: ''
  });
  const [newGame, setNewGame] = useState<Partial<QuizGame>>({
    name: '',
    questions_per_day: 5,
    time_interval: { type: 'hours', value: 1 }
  });
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [simulationInput, setSimulationInput] = useState('');
  const [simulationHistory, setSimulationHistory] = useState<SimulationQuestion[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{type: 'question' | 'game', id: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Initial data fetch
    fetchQuestions();
    fetchGames();
    fetchPlayerStats();

    // Set up real-time subscriptions
    const questionsSubscription = supabase
      .channel('quiz_questions_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_questions' 
      }, () => {
        fetchQuestions();
      })
      .subscribe();

    const gamesSubscription = supabase
      .channel('quiz_games_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_games' 
      }, () => {
        fetchGames();
      })
      .subscribe();

    const statsSubscription = supabase
      .channel('quiz_participants_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_participants' 
      }, () => {
        fetchPlayerStats();
      })
      .subscribe();

    return () => {
      questionsSubscription.unsubscribe();
      gamesSubscription.unsubscribe();
      statsSubscription.unsubscribe();
    };
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }

    setQuestions(data || []);
  };

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('quiz_games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games:', error);
      return;
    }

    setGames((data || []).map(game => ({
      ...game,
      start_date: new Date(game.start_date),
      end_date: new Date(game.end_date),
      participants: game.participants || [] // Ensure participants is always an array
    })));
  };

  const fetchPlayerStats = async () => {
    const { data, error } = await supabase
      .from('quiz_participants')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching player stats:', error);
      return;
    }

    setPlayerStats((data || []).map(stat => ({
      ...stat,
      last_answer_date: stat.last_answer_at ? new Date(stat.last_answer_at) : new Date()
    })));
  };

  const addQuestion = async () => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .insert([{
          text: newQuestion.text,
          correct_answer: newQuestion.correct_answer,
          explanation: newQuestion.explanation,
          category: newQuestion.category
        }]);

      if (error) throw error;

      setNewQuestion({ text: '', correct_answer: true, explanation: '', category: '' });
      setShowQuestionEditor(false);
      
      // Refresh questions list
      fetchQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const createGame = async () => {
    if (!newGame.name || !newGame.start_date || !newGame.end_date) return;

    try {
      const { error } = await supabase
        .from('quiz_games')
        .insert([{
          name: newGame.name,
          start_date: newGame.start_date,
          end_date: newGame.end_date,
          questions_per_day: newGame.questions_per_day,
          time_interval: newGame.time_interval,
          status: 'scheduled',
          participants: [] // Initialize with empty array
        }]);

      if (error) throw error;

      setNewGame({
        name: '',
        questions_per_day: 5,
        time_interval: { type: 'hours', value: 1 }
      });
      setShowGameEditor(false);
      
      // Refresh games list
      fetchGames();
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const toggleGameStatus = async (gameId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('quiz_games')
        .update({ status: newStatus })
        .eq('id', gameId);

      if (error) throw error;
      
      // Refresh games list
      fetchGames();
    } catch (error) {
      console.error('Error updating game status:', error);
    }
  };

  const simulateQuestion = () => {
    if (!simulationInput.trim()) return;

    const simulation: SimulationQuestion = {
      question: simulationInput,
      correct_answer: Math.random() > 0.5,
      explanation: `Explication pour la question: ${simulationInput}`,
      category: 'Simulation'
    };

    setSimulationHistory(prev => [...prev, simulation]);
    setSimulationInput('');
  };

  const addSimulatedQuestion = async (simulation: SimulationQuestion) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .insert([{
          text: simulation.question,
          correct_answer: simulation.correct_answer,
          explanation: simulation.explanation,
          category: simulation.category
        }]);

      if (error) throw error;
      
      // Refresh questions list
      fetchQuestions();
    } catch (error) {
      console.error('Error adding simulated question:', error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setShowDeleteConfirmation({type: 'question', id: questionId});
  };

  const handleDeleteGame = async (gameId: string) => {
    setShowDeleteConfirmation({type: 'game', id: gameId});
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirmation) return;
    
    setIsDeleting(true);
    
    try {
      if (showDeleteConfirmation.type === 'question') {
        const { error } = await supabase
          .from('quiz_questions')
          .delete()
          .eq('id', showDeleteConfirmation.id);

        if (error) throw error;
        
        // Update local state to immediately remove the deleted question
        setQuestions(prevQuestions => 
          prevQuestions.filter(q => q.id !== showDeleteConfirmation.id)
        );
      } else {
        // Delete the game
        const { error: gameError } = await supabase
          .from('quiz_games')
          .delete()
          .eq('id', showDeleteConfirmation.id);

        if (gameError) throw gameError;

        // Delete related participant records
        const { error: statsError } = await supabase
          .from('quiz_participants')
          .delete()
          .eq('game_id', showDeleteConfirmation.id);

        if (statsError) throw statsError;
        
        // Update local state to immediately remove the deleted game
        setGames(prevGames => 
          prevGames.filter(g => g.id !== showDeleteConfirmation.id)
        );
        
        // If the deleted game was selected, clear the selection
        if (selectedGame === showDeleteConfirmation.id) {
          setSelectedGame(null);
        }
      }
      
      // Close the confirmation dialog
      setShowDeleteConfirmation(null);
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-gray-50">
        <BackButton />
      </div>
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="p-6 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-red-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Quiz WhatsApp</h1>
                  <p className="text-sm text-gray-500">Jeu de questions-réponses automatisé</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowSimulation(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  <Play className="w-4 h-4" />
                  Simuler
                </button>
                <button
                  onClick={() => setShowQuestionEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                >
                  <Database className="w-4 h-4" />
                  Questions
                </button>
                <button
                  onClick={() => setShowGameEditor(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau jeu
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6 p-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Questions</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{questions.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Play className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Jeux actifs</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {games.filter(g => g.status === 'active').length}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">Participants</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{playerStats.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart2 className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-gray-900">Taux de réussite</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {playerStats.length > 0
                  ? Math.round(
                      (playerStats.reduce((acc, curr) => acc + curr.correct_answers, 0) /
                        playerStats.reduce((acc, curr) => acc + curr.total_answers, 0)) *
                        100
                    )
                  : 0}%
              </p>
            </div>
          </div>

          {/* Questions Section */}
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions</h2>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Réponse</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {questions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                            Aucune question trouvée
                          </td>
                        </tr>
                      ) : (
                        questions.map((question) => (
                          <tr key={question.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-normal">
                              <div className="text-sm text-gray-900">{question.text}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                question.correct_answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {question.correct_answer ? 'Vrai' : 'Faux'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{question.category}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-red-600 hover:text-red-900"
                                aria-label="Supprimer la question"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Jeux en cours</h2>
            <div className="grid grid-cols-1 gap-6">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-white rounded-xl shadow-sm p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{game.name}</h3>
                      <p className="text-sm text-gray-500">
                        {game.start_date.toLocaleDateString()} - {game.end_date.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        game.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : game.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : game.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleGameStatus(game.id, game.status)}
                          className={`p-2 rounded-lg ${
                            game.status === 'active'
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          aria-label={game.status === 'active' ? 'Mettre en pause' : 'Activer'}
                        >
                          {game.status === 'active' ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteGame(game.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          aria-label="Supprimer le jeu"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Questions/jour</span>
                      </div>
                      <p className="text-gray-900">{game.questions_per_day}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Intervalle</span>
                      </div>
                      <p className="text-gray-900">
                        {game.time_interval.value} {game.time_interval.type}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Participants</span>
                      </div>
                      <p className="text-gray-900">{(game.participants || []).length}</p>
                    </div>
                  </div>

                  {selectedGame === game.id && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Classement</h4>
                      <div className="space-y-2">
                        {playerStats
                          .filter(player => (game.participants || []).includes(player.phone_number))
                          .sort((a, b) => b.score - a.score)
                          .map((player, index) => (
                            <div
                              key={player.phone_number}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 text-center font-medium text-gray-600">
                                  #{index + 1}
                                </span>
                                <span className="text-gray-900">{player.phone_number}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">
                                  {player.correct_answers}/{player.total_answers} correctes
                                </span>
                                <span className="font-medium text-gray-900">{player.score} pts</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedGame(selectedGame === game.id ? null : game.id)}
                    className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {selectedGame === game.id ? 'Masquer les détails' : 'Voir les détails'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showQuestionEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Ajouter une question</h2>
                <button
                  onClick={() => setShowQuestionEditor(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question
                  </label>
                  <input
                    type="text"
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Entrez votre question..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Réponse correcte
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newQuestion.correct_answer === true}
                        onChange={() => setNewQuestion(prev => ({ ...prev, correct_answer: true }))}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>Vrai</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newQuestion.correct_answer === false}
                        onChange={() => setNewQuestion(prev => ({ ...prev, correct_answer: false }))}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>Faux</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explication
                  </label>
                  <textarea
                    value={newQuestion.explanation}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Expliquez pourquoi cette réponse est correcte..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Histoire, Science, Culture générale..."
                  />
                </div>

                <button
                  onClick={addQuestion}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Ajouter la question
                </button>
              </div>
            </div>
          </div>
        )}

        {showGameEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Créer un nouveau jeu</h2>
                <button
                  onClick={() => setShowGameEditor(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du jeu
                  </label>
                  <input
                    type="text"
                    value={newGame.name}
                    onChange={(e) => setNewGame(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Quiz du mois de mars..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={newGame.start_date?.toISOString().split('T')[0]}
                      onChange={(e) => setNewGame(prev => ({
                        ...prev,
                        start_date: new Date(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={newGame.end_date?.toISOString().split('T')[0]}
                      onChange={(e) => setNewGame(prev => ({
                        ...prev,
                        end_date: new Date(e.target.value)
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questions par jour
                  </label>
                  <input
                    type="number"
                    value={newGame.questions_per_day}
                    onChange={(e) => setNewGame(prev => ({
                      ...prev,
                      questions_per_day: parseInt(e.target.value)
                    }))}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervalle d'envoi
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={newGame.time_interval?.value}
                      onChange={(e) => setNewGame(prev => ({
                        ...prev,
                        time_interval: {
                          ...prev.time_interval!,
                          value: parseInt(e.target.value)
                        }
                      }))}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <select
                      value={newGame.time_interval?.type}
                      onChange={(e) => setNewGame(prev => ({
                        ...prev,
                        time_interval: {
                          ...prev.time_interval!,
                          type: e.target.value as 'minutes' | 'hours' | 'days'
                        }
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Heures</option>
                      <option value="days">Jours</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={createGame}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Créer le jeu
                </button>
              </div>
            </div>
          </div>
        )}

        {showSimulation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Simulation de questions</h2>
                <button
                  onClick={() => setShowSimulation(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulationInput}
                    onChange={(e) => setSimulationInput(e.target.value)}
                    placeholder="Entrez une question..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && simulateQuestion()}
                  />
                  <button
                    onClick={simulateQuestion}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Tester
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {simulationHistory.map((sim, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Réponse: <span className={sim.correct_answer ? 'text-green-600' : 'text-red-600'}>
                          {sim.correct_answer ? 'Vrai' : 'Faux'}
                        </span>
                      </span>
                      <button
                        onClick={() => addSimulatedQuestion(sim)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter à la base
                      </button>
                    </div>
                    <p className="text-gray-900 mb-2">{sim.question}</p>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded">{sim.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
                  <p className="text-gray-600 mt-1">
                    {showDeleteConfirmation.type === 'question' 
                      ? "Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible."
                      : "Êtes-vous sûr de vouloir supprimer ce jeu ? Toutes les données associées seront également supprimées. Cette action est irréversible."}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteConfirmation(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  disabled={isDeleting}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;