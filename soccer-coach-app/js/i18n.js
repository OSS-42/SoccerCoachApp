// Import language files
document.write('<script src="js/languages/en.js"></script>');
document.write('<script src="js/languages/fr.js"></script>');

// Translations object that will be filled after language files are loaded
let translations = {};

// Wait for language files to load
document.addEventListener('DOMContentLoaded', function() {
    // Set translations from loaded files
    translations = {
        'en': enTranslations,
        'fr': frTranslations
    };

    // Apply translations immediately if needed
    if (typeof applyLanguage === 'function') {
        const currentLanguage = localStorage.getItem('appLanguage') || 'fr';
        applyLanguage(currentLanguage);
    }
});

// Function to get translation
function translate(key, language) {
    // If translations not loaded yet, wait and try again
    if (!translations['en'] || !translations['fr']) {
        console.warn('Translations not loaded yet');
        return key;
    }
    
    // Default to French if language not found
    if (!language || !translations[language]) {
        language = 'fr';
    }
    
    // Return the translation if it exists
    if (translations[language][key]) {
        return translations[language][key];
    }
    
    // Fallback to English if translation not found in current language
    if (translations['en'][key]) {
        return translations['en'][key];
    }
    
    // If all else fails, return the key itself
    return key;
}

// Export the translate function
window.translate = translate;