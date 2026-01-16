// TheCenti - Interactive JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Add some sparkle effect to buttons
    function createSparkle(e) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.position = 'absolute';
        sparkle.style.left = e.clientX + 'px';
        sparkle.style.top = e.clientY + 'px';
        sparkle.style.width = '4px';
        sparkle.style.height = '4px';
        sparkle.style.background = '#ffd700';
        sparkle.style.borderRadius = '50%';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '9999';
        
        document.body.appendChild(sparkle);
        
        // Animate sparkle
        sparkle.animate([
            { transform: 'scale(0) translate(0, 0)', opacity: 1 },
            { transform: 'scale(1) translate(' + (Math.random() - 0.5) * 100 + 'px, ' + (Math.random() - 0.5) * 100 + 'px)', opacity: 0 }
        ], {
            duration: 800,
            easing: 'ease-out'
        }).onfinish = () => sparkle.remove();
    }
    
    // Add sparkle effect to AI button
    document.querySelectorAll('.btn-ai').forEach(btn => {
        btn.addEventListener('click', createSparkle);
    });
    
    // Live status simulator (for demo purposes)
    function simulateLiveStatus() {
        const liveCards = document.querySelectorAll('.live-card');
        
        // Add random "live" indicators
        setInterval(() => {
            liveCards.forEach(card => {
                if (Math.random() > 0.7) {
                    card.style.border = '2px solid #ff4444';
                    card.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.3)';
                    
                    setTimeout(() => {
                        card.style.border = '1px solid rgba(255, 215, 0, 0.1)';
                        card.style.boxShadow = '';
                    }, 1000);
                }
            });
        }, 5000);
    }
    
    // Only run live simulation if we're on a page with live cards
    if (document.querySelector('.live-card')) {
        simulateLiveStatus();
    }
    
    // Easter egg: Konami code for special effect
    let konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', function(e) {
        if (e.keyCode === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Activate party mode!
                document.body.style.animation = 'rainbow 2s infinite linear';
                
                // Add rainbow animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes rainbow {
                        0% { filter: hue-rotate(0deg); }
                        100% { filter: hue-rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
                
                // Show message
                alert('🎉 PARTY MODE ATTIVATO! I TheCenti approvano! 🎸');
                
                konamiIndex = 0;
                setTimeout(() => {
                    document.body.style.animation = '';
                    style.remove();
                }, 10000);
            }
        } else {
            konamiIndex = 0;
        }
    });
});