import type { Player } from "../../types/poker";
import { SeatCard } from "./SeatCard";

// ── SeatRing ────────────────────────────────────────────────────────

interface SeatRingProps {
    players: Player[];
    activePlayerIndex: number;
    dealerIndex: number;
    isShowdown: boolean;
}

export function SeatRing({
    players,
    activePlayerIndex,
    dealerIndex,
    isShowdown,
}: SeatRingProps) {
    const n = players.length;

    return (
        <>
            {players.map((player, i) => {
                // Trigonometric positioning: hero (index 0) at bottom, others clockwise around ellipse
                const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
                const rx = 42; // % of container width
                const ry = 38; // % of container height
                const x = 50 + rx * Math.cos(angle);
                const y = 50 - ry * Math.sin(angle);

                const isActive = !isShowdown && i === activePlayerIndex;
                const profilePlacement: "top" | "bottom" =
                    y > 50 ? "bottom" : "top";

                return (
                    <div
                        key={player.id}
                        className={`absolute ${player.isHero ? "z-[12]" : "z-10"} ${isActive ? "z-[15]" : ""}`}
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: "translate(-50%, -50%)",
                        }}
                    >
                        <SeatCard
                            player={player}
                            isActive={isActive}
                            isDealer={i === dealerIndex}
                            seatIndex={i}
                            dealerIndex={dealerIndex}
                            playerCount={n}
                            placement={profilePlacement}
                        />
                    </div>
                );
            })}
        </>
    );
}
