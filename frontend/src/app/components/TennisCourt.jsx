import React from 'react';
import {Line, Rect, Stage, Layer, Circle} from 'react-konva';

export default function TennisCourt({surface = "hard"}) {
    const courtColors = {
        hard: {court: "#4a90d9", lines: "#ffffff", posts:"#22331e", outArea:"#2e572d"},
        clay: {court: "#c8622a", lines: "#ffffff", posts:"#3f6b35", outArea:"#c8622a"},
        grass: {court: "#4a7c3f", lines: "#ffffff", posts:"#8B5A2B", outArea:"#4a7c3f"},
    }

    const colors = courtColors[surface.toLowerCase()]
    const courtLines = [
        //left singles line
        [90, 45, 90, 825],
        //right singles line
        [360, 45, 360, 825],
        //center service line
        [225, 225, 225, 615],
        //left doubles line
        [45, 45, 45, 825],
        //right doubles line
        [405, 45, 405, 825],
        //Near baseline
        [45, 45, 405, 45],
        //Far baseline
        [45, 825, 405, 825],
        //Far Service line
        [90, 615, 360, 615],
        //Near Service Line
        [90, 225, 360, 225]
    ]

    return (

        <Stage width={450} height={870}>
            <Layer>
                <Rect x={0} y={0} width={450} height={870} fill={colors.outArea}/>
                <Rect x={45} y={45} width={360} height={780}
                      fill={colors.court}/>

                {/*Various out lines*/}
                {courtLines.map((points, i) => (
                    <Line key={i} points={points} stroke={colors.lines} strokeWidth={2}/>
                ))}

                {/*Net*/}
                <Line  points={[45, 435, 405, 435]} stroke={colors.lines} strokeWidth={2} dash={[8,3]}/>
                {/*Left post*/}
                <Circle x={45} y={435} radius={5} fill={colors.posts}/>
                {/*Right Post*/}
                <Circle x={405} y={435} radius={5} fill={colors.posts}/>
            </Layer>
        </Stage>
    )
}