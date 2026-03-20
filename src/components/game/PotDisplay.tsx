interface PotDisplayProps {
    pot: number;
}

export function PotDisplay({ pot }: PotDisplayProps) {
    return (
        <div className="relative z-20 flex items-center justify-center">
            <div className="bg-black/50 rounded-full px-4 py-1 flex items-center gap-1.5">
                <span className="text-white/90 font-medium text-sm">
                    Pot: {pot.toFixed(2)}
                </span>
            </div>
        </div>
    );
}
