import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { teluguTranslations } from '../translations/te';

// Create the context
const LanguageContext = createContext();

// English translations (default)
const englishTranslations = {
  // Common
  'language': 'Language',
  'change_language': 'Change Language',
  'telugu': 'Telugu',
  'english': 'English',

  // Navigation & Headers
  'student_status': 'Student Status',
  'dashboard': 'Dashboard',
  'home_qa_dashboard': 'HOME Q&A DASHBOARD',
  'create_account': 'Create Account',
  'login': 'Login',
  'logout': 'Logout',

  // Questions
  'where_are_you': 'Where are you?',
  'what_are_you_doing': 'What are you doing?',
  'when_will_you_return': 'When will you return?',
  'not_answered_yet': 'Not answered yet',

  // Messages
  'messages': 'Messages',
  'type_message': 'Type your message...',
  'send_message': 'Send Message',
  'sending': 'Sending...',
  'message_sent': 'Message Sent',
  'new_reply': 'New Reply',
  'reply': 'Reply',

  // Status & Updates
  'real_time_updates': 'Real-time updates about your student\'s location and activities',
  'keep_family_updated': 'Keep your family updated about your whereabouts and activities',

  // Forms
  'full_name': 'Full Name',
  'email': 'Email',
  'password': 'Password',
  'save': 'Save',
  'saving': 'Saving...',

  // Errors
  'error_loading': 'Error Loading Data',
  'error_saving': 'Error Saving',
  'error_sending': 'Failed to send message. Please try again.',
  'network_error': 'Network error. Please check your internet connection.',
  'invalid_credentials': 'Invalid email or password',
  'try_again': 'Please try again'
};

// Available languages
const languages = {
  en: englishTranslations,
  te: teluguTranslations
};

export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to English
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage]);

  // Memoize translation function
  const translate = useCallback((key) => {
    return languages[currentLanguage][key] || languages['en'][key] || key;
  }, [currentLanguage]);

  // Memoize language toggle function
  const toggleLanguage = useCallback(() => {
    setCurrentLanguage(prev => prev === 'en' ? 'te' : 'en');
  }, []);

  // Memoize context value
  const value = useMemo(() => ({
    currentLanguage,
    translate,
    toggleLanguage,
    isEnglish: currentLanguage === 'en',
    isTelugu: currentLanguage === 'te'
  }), [currentLanguage, translate, toggleLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 