import { Button, Box } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { translate, toggleLanguage, isEnglish } = useLanguage();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Button
        variant="contained"
        onClick={toggleLanguage}
        startIcon={<TranslateIcon />}
        sx={{
          backgroundColor: 'rgba(255, 165, 0, 0.9)',
          color: '#000',
          '&:hover': {
            backgroundColor: 'rgba(255, 140, 0, 0.9)',
          },
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {isEnglish ? 'తెలుగు' : 'English'}
      </Button>
    </Box>
  );
} 