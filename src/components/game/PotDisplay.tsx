import { Coins } from "lucide-react";

interface PotDisplayProps {
    pot: number;
}

export function PotDisplay({ pot }: PotDisplayProps) {
    return (
        <div className="relative z-20 flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold text-lg">
                Pot: ${pot.toLocaleString()}
            </span>
        </div>
    );
}
