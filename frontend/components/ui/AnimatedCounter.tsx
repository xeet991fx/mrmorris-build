import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    className?: string;
    decimals?: number;
    prefix?: string;
    suffix?: string;
}

export function AnimatedCounter({
    value,
    duration = 1000,
    className,
    decimals = 0,
    prefix = '',
    suffix = '',
}: AnimatedCounterProps) {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentCount = easeOutQuart * value;

            setCount(currentCount);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };
    }, [value, duration]);

    const formattedValue = count.toFixed(decimals);

    return (
        <span className={cn('font-bold tabular-nums', className)}>
            {prefix}
            {formattedValue}
            {suffix}
        </span>
    );
}
