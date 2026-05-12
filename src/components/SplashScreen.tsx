import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import logoMark from '@/assets/az-logo.svg';

const SplashScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const logoRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const next = searchParams.get('next') || '/signin';

    const tl = gsap.timeline({
      onComplete: () => {
        navigate(next);
      }
    });

    // Animate logo
    if (logoRef.current) {
      tl.from(logoRef.current, {
        opacity: 0,
        scale: 0.5,
        rotation: -180,
        duration: 0.8,
        ease: 'back.out(1.7)',
      });
    }

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
      // Total splash display ~3.2s before navigating
      delay: 3.2,
    });

    return () => {
      tl.kill();
    };
  }, [navigate, location.search]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary-glow to-secondary"
    >
      <div className="text-center space-y-4 px-4 w-full max-w-[95vw] mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-2">
          <img
            ref={logoRef}
            src={logoMark}
            alt="Asaan Zindagi logo"
            className="h-14 w-14 sm:h-16 sm:w-16 md:h-24 md:w-24 brightness-0 invert flex-shrink-0"
            loading="eager"
            draggable={false}
          />
          <h1
            ref={titleRef}
            className="text-3xl sm:text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight"
            style={{ perspective: '1000px' }}
          >
            Asaan Zindagi
          </h1>
        </div>
        <p
          ref={subtitleRef}
          className="text-base sm:text-xl md:text-2xl text-white/90 font-light px-2"
        >
          Smarter Healthcare, Simpler Lives.
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
