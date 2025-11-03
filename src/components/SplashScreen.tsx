import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const SplashScreen = () => {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        navigate('/signin');
      }
    });

    // Animate title letters
    if (titleRef.current) {
      const letters = titleRef.current.textContent?.split('') || [];
      titleRef.current.innerHTML = letters
        .map(letter => `<span class="inline-block">${letter === ' ' ? '&nbsp;' : letter}</span>`)
        .join('');

      tl.from(titleRef.current.children, {
        opacity: 0,
        y: 50,
        rotationX: -90,
        stagger: 0.05,
        duration: 0.8,
        ease: 'back.out(1.7)',
      });
    }

    // Animate subtitle
    tl.from(subtitleRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.3');

    // Fade out everything
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      delay: 1.2,
    });

    return () => {
      tl.kill();
    };
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary-glow to-secondary"
    >
      <div className="text-center space-y-6 px-4">
        <h1
          ref={titleRef}
          className="text-6xl md:text-8xl font-bold text-white tracking-tight"
          style={{ perspective: '1000px' }}
        >
          Asaan Zindagi
        </h1>
        <p
          ref={subtitleRef}
          className="text-xl md:text-2xl text-white/90 font-light"
        >
          Smart Healthcare Queue & Appointment System
        </p>
      </div>

      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
};

export default SplashScreen;
