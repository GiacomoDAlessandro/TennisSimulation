import React from 'react';
import {Line, Rect, Stage, Layer, Circle} from 'react-konva';

export default function TennisCourt({surface = "hard"}) {
    const courtColors = {
        hard: {court: "#4a90d9", lines: "#ffffff"},
        clay: {court: "#c8622a", lines: "#ffffff"},
        grass: {court: "#4a7c3f", lines: "#ffffff"},
    }

    const colors = courtColors[surface.toLowerCase()]
    const courtLines = [
        //left singles line
        [45, 0, 45, 780],
        //right singles line
        [315, 0, 315, 780],
        //center service line
        [180, 180, 180, 570],
        //left doubles line
        [1, 1, 1, 779],
        //right doubles line
        [359, 1, 359, 779],
        //Near baseline
        [1, 1, 359, 1],
        //Far baseline
        [1, 779, 359, 779],
        //Far Service line
        [45, 570, 315, 570],
        //Near Service Line
        [45, 180, 315, 180]
    ]

    return (
        <Stage width={360} height={780}>
            <Layer>
                <Rect x={0} y={0} width={360} height={780}
                      fill={colors.court}/>

                {/*Various out lines*/}
                {courtLines.map((points, i) => (
                    <Line key={i} points={points} stroke={colors.lines} strokeWidth={2}/>
                ))}

                {/*Net*/}
                <Line  points={[0, 390, 360, 390]} stroke={colors.lines} strokeWidth={3}/>
                {/*Left post*/}
                <Circle x={0} y={390} radius={5} fill="#3f6b35"/>
                {/*Right Post*/}
                <Circle x={360} y={390} radius={5} fill="#3f6b35"/>
            </Layer>
        </Stage>
    )
}