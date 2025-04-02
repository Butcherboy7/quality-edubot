document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Function to set theme
    function setTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('EduBuddyTheme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('EduBuddyTheme', 'light');
        }
    }
    
    // Check for saved theme preference or use system preference
    function initializeTheme() {
        const savedTheme = localStorage.getItem('EduBuddyTheme');
        
        if (savedTheme) {
            // Use saved preference
            setTheme(savedTheme === 'dark');
        } else {
            // Check if system is set to dark mode
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemPrefersDark);
        }
    }
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        setTheme(!isDarkMode);
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Only change theme automatically if user hasn't set a preference
        if (!localStorage.getItem('EduBuddyTheme')) {
            setTheme(e.matches);
        }
    });
    
    // Initialize theme on load
    initializeTheme();
});
