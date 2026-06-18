//These sides are where the server serves from
export function getServeSide(score) {
    if (!score) return "D";

    if (SCORE_TO_SIDE[score]) return SCORE_TO_SIDE[score];

    const parts = score.split('-');
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const total = parseInt(parts[0]) + parseInt(parts[1]);
        return total % 2 === 0 ? "D" : "A";
    }
}

const SERVE_ZONES = {
    D: {
        wide: {x: 340, y: 280},
        body: {x: 290, y: 280},
        T: {x: 240, y: 280},
    },
    A: {
        wide: {x: 95, y: 280},
        body: {x: 160, y: 280},
        T: {x: 220, y: 280},
    }
}

const Serve_Errors = {
    D: {
        wide: {
            "Net error": {x: 370, y: 440},
            "Deep error": {x: 340, y: 195},
            "Wide error": {x: 420, y: 280},
            "Wide and net error": {x: 410, y: 430},
        },
        body: {
            "Net error": {x: 290, y: 440},
            "Deep error": {x: 290, y: 195},
            "Wide error": {x: 390, y: 280},
            "Wide and net error": {x: 370, y: 430},
        },
        T: {
            "Net error": {x: 220, y: 440},
            "Deep error": {x: 240, y: 195},
            "Wide error": {x: 205, y: 280},
            "Wide and net error": {x: 205, y: 430},
        },
    },
    A: {
        wide: {
            "Net error": {x: 60, y: 450},
            "Deep error": {x: 95, y: 195},
            "Wide error": {x: 20, y: 280},
            "Wide and net error": {x: 30, y: 430},
        },
        body: {
            "Net error": {x: 160, y: 450},
            "Deep error": {x: 160, y: 195},
            "Wide error": {x: 60, y: 280},
            "Wide and net error": {x: 80, y: 430},
        },
        T: {
            "Net error": {x: 220, y: 450},
            "Deep error": {x: 220, y: 195},
            "Wide error": {x: 245, y: 280},
            "Wide and net error": {x: 245, y: 430},
        },
    }
}

export const SERVE_COLORS = {
    grass: {
        Ace: "#2296e6",
        in_play: "#ffffff",
        Unreturnable: "black",
    },

    hard: {
        Ace: "#FFD700",
        Unreturnable: "black",
        in_play: "green",
    },

    clay: {
        Ace: "blue",
        Unreturnable: "black",
        in_play: "green",
    }

}

const SCORE_TO_SIDE = {
    "0-0": "D", "15-0": "D", "30-0": "D", "40-0": "D",
    "0-15": "A", "15-15": "A", "30-15": "A", "40-15": "A",
    "0-30": "D", "15-30": "D", "30-30": "D", "40-30": "D",
    "0-40": "A", "15-40": "A", "30-40": "A", "40-40": "D",
    "AD-40": "D", "40-AD": "A",
}

const jitter = (range) => (Math.random() - 0.5) * range;

export function getServeCoordinates(score, first_direction, first_outcome, second_direction,
                                    second_outcome, had_fault, surface) {
    const side = getServeSide(score);
    const shots = [];

    surface = surface?.toLowerCase();

    let firstLoc;
    const error = Serve_Errors[side]?.[first_direction]?.[first_outcome];
    if (error) {
        firstLoc = error;
    } else {
        firstLoc = SERVE_ZONES[side]?.[first_direction];
    }

    if (firstLoc && first_outcome !== "Shank") {
        const isError = Boolean(had_fault == true || had_fault == "true");
        if (isError && !error) {

        } else {
            const color = first_outcome === "in_play"
                ? (SERVE_COLORS[surface]?.[first_outcome] || "black")
                : ((error || isError) ? "red" : (SERVE_COLORS[surface]?.[first_outcome] || "black"));
            shots.push({
                x: firstLoc.x + jitter(20),
                y: firstLoc.y + jitter(20),
                color: color,
                score,
                outcome: first_outcome,
                serveNumber: 1,
                serveDirection: first_direction,
            });
        }
    }

    if (had_fault && second_direction) {
        let secondLoc;
        const secondError = Serve_Errors[side]?.[second_direction]?.[second_outcome];

        if (secondError) {
            secondLoc = secondError;
        } else {
            secondLoc = SERVE_ZONES[side]?.[second_direction];
        }

        if (secondLoc && second_outcome !== "Shank") {
            const color = second_outcome === "in_play"
                ? (SERVE_COLORS[surface]?.[second_outcome] || "black")
                : (secondError ? "red" : (SERVE_COLORS[surface]?.[second_outcome] || "black"));
            shots.push({
                x: secondLoc.x + jitter(20),
                y: secondLoc.y + jitter(20),
                color: color,
                score,
                outcome: second_outcome,
                serveNumber: 2,
                serveDirection: second_direction,
            })
        }
    }

    return shots;
}


