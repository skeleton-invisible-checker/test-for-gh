import React, {useEffect, useState, useCallback} from 'react'
import { useMantineTheme, Text, Code, Group } from '@mantine/core';
import {useEventListener, useHover, useMouse, useMove} from '@mantine/hooks';


const width = 720;
const height = 720;
const cell_x = 24;
const cell_y = 24;
const cell_width = width / cell_x;
const cell_height = height / cell_y;

const MouseState = {
    MOUSEUP: Symbol(0),
    MOUSEDOWN: Symbol(1),
    DBLCLICK: Symbol(2)
};

function index_to_coordinate(x_index, y_index){
    return {'x': x_index * cell_width, 'y': y_index * cell_height};
}
function get_cell_upper_left(x, y) {
    return {'x': x * cell_width, 'y': y * cell_height}
}

function get_cell_upper_right(x, y) {
    return {'x': (x + 1) * cell_width, 'y': y * cell_height}
}

function get_cell_lower_left(x, y) {
    return {'x': x * cell_width, 'y': (y + 1) * cell_height}
}

function get_cell_lower_right(x, y) {
    return {'x': (x + 1) * cell_width, 'y': (y + 1) * cell_height}
}

function draw_line(ctx, start_x, start_y, end_x, end_y) {
    ctx.beginPath();
    ctx.moveTo(start_x, start_y);
    ctx.lineTo(end_x, end_y);
    ctx.stroke();
}

function drawGrid(ctx) {
    ctx.strokeStyle = "rgb(0, 0, 0)"
    for (let y = 0; y < cell_y; y++) {
        draw_line(ctx,
            get_cell_upper_left(0, y).x,
            get_cell_upper_left(0, y).y,
            get_cell_upper_right(cell_x - 1, y).x,
            get_cell_upper_right(cell_x - 1, y).y);
    }

    draw_line(ctx,
        get_cell_lower_left(0, cell_y - 1).x,
        get_cell_lower_left(0, cell_y - 1).y,
        get_cell_lower_right(cell_x - 1, cell_y - 1).x,
        get_cell_lower_right(cell_x - 1, cell_y - 1).y);

    for (let x = 0; x < cell_x; x++) {
        draw_line(ctx,
            get_cell_upper_left(x, 0).x,
            get_cell_upper_left(x, 0).y,
            get_cell_lower_left(x, cell_y - 1).x,
            get_cell_lower_left(x, cell_y - 1).y);
    }

    draw_line(ctx,
            get_cell_upper_right(cell_x - 1, 0).x,
            get_cell_upper_right(cell_x - 1, 0).y,
            get_cell_lower_right(cell_x - 1, cell_y - 1).x,
            get_cell_lower_right(cell_x - 1, cell_y - 1).y);
}

function get_cell_index(x, y){
    const x_index = Math.floor(x / cell_width);
    const y_index = Math.floor(y / cell_height);
    return {'x_index': x_index, 'y_index': y_index};
}

function draw_cell(ctx, x_index, y_index, color){
    ctx.fillStyle = color;
    const upper_left = get_cell_upper_left(x_index, y_index);
    ctx.fillRect(upper_left.x, upper_left.y, cell_width, cell_height);
    ctx.restore();
}


function draw_targets(ctx, target_list){
    for(let i = 0; i < target_list.length; i++) {
        let target = target_list[i];
        ctx.fillStyle = "rgba(0, 0, 255, " + target.score.toString() + ")";
        ctx.fillRect(target.x, target.y, target.w, target.h);
    }
    ctx.restore();
}
function calc_targets(targetCells){
    if(targetCells.length < 2){
        return [];
    }

    let target_list = []
    let target_width = 2;
    let target_height = 2;
    for(let x = 0; x < width; x += target_width){
        const target_x = x + target_width / 2;
        for(let y = 0; y < height; y += target_height){
            const target_y = y + target_height / 2;

            let diff = 0.0;
            for(let i = 0; i < targetCells.length; i++){
                const targetCell = targetCells[i];
                const center_x = (targetCell.start.x_index + 0.5 + targetCell.end.x_index + 0.5) / 2.0;
                const center_y = (targetCell.start.y_index + 0.5 + targetCell.end.y_index + 0.5) / 2.0;

                const coordinate = index_to_coordinate(center_x, center_y);
                const dist = Math.sqrt(((coordinate.x - target_x) / cell_width) ** 2 + ((coordinate.y - target_y) / cell_height) ** 2)
                diff = Math.max(Math.abs(dist - 4.5), diff);
            }
            if(diff <= 0.5){
                const target = {"x": x, "y": y, "w": target_width, "h": target_height, 'score': 0.7 - diff};
                target_list.push(target);
            }
        }
    }
    return target_list;
}

function delete_selected_target_cells(cell_index, target_cells) {
    let result = []
    for (let i = 0; i < target_cells.length; i++) {
        const target = target_cells[i];
        const start_cell = target['start'];
        const end_cell = target['end'];

        const start_x_index = Math.min(start_cell.x_index, end_cell.x_index);
        const start_y_index = Math.min(start_cell.y_index, end_cell.y_index);
        const end_x_index = Math.max(start_cell.x_index, end_cell.x_index);
        const end_y_index = Math.max(start_cell.y_index, end_cell.y_index);

        // click対象がtargetに入っているなら除く
        console.log(cell_index, start_cell, end_cell);
        if (start_x_index <= cell_index.x_index && start_y_index <= cell_index.y_index && end_x_index >= cell_index.x_index && end_y_index >= cell_index.y_index) {
            //
        } else {
            result.push(target);
        }
    }

    return result;
}

function draw_invisible_circle(ctx, invisible_target_pos){
    // インビジブルの円を描く
    ctx.beginPath();
    ctx.arc(invisible_target_pos.x, invisible_target_pos.y, cell_width * 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
    ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 中心に点を打つ
    ctx.strokeStyle = "rgba(0, 85, 46, 1.0)"
    ctx.fillStyle = "rgba(0, 85, 46, 1.0)"
    ctx.fillRect(invisible_target_pos.x - 1, invisible_target_pos.y - 1, 3, 3)
    ctx.restore();
}


function drawBase(
    ctx, selectedCell, mouseState, startSelectedCell, targetCells, invisibleTargets, mode, invisible_target_pos) {
    ctx.save();

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    if(selectedCell && !mode) {
        draw_cell(ctx, selectedCell.x_index, selectedCell.y_index, "rgba(255, 0, 0, 0.2)");
    }
    if(mouseState === MouseState.MOUSEDOWN && startSelectedCell){
        const start_x_index = Math.min(startSelectedCell.x_index, selectedCell.x_index);
        const start_y_index = Math.min(startSelectedCell.y_index, selectedCell.y_index);
        const end_x_index = Math.max(startSelectedCell.x_index, selectedCell.x_index);
        const end_y_index = Math.max(startSelectedCell.y_index, selectedCell.y_index);

        for(let x = start_x_index; x <= end_x_index; x++){
            for(let y = start_y_index; y <= end_y_index; y++){
                draw_cell(ctx, x, y, "rgba(255, 0, 0, 0.4)")
            }
        }
   }

    for(let i = 0; i < targetCells.length; i++){
        const targetCell = targetCells[i];
        const start_x_index = Math.min(targetCell["start"].x_index, targetCell["end"].x_index);
        const start_y_index = Math.min(targetCell["start"].y_index, targetCell["end"].y_index);
        const end_x_index = Math.max(targetCell["start"].x_index, targetCell["end"].x_index);
        const end_y_index = Math.max(targetCell["start"].y_index, targetCell["end"].y_index);

        for(let x = start_x_index; x <= end_x_index; x++){
            for(let y = start_y_index; y <= end_y_index; y++){
                draw_cell(ctx, x, y, "rgba(255, 0, 0, 0.6)")
            }
        }

        // 中心に点を打つ
        const upper_left_pos = get_cell_upper_left(start_x_index, start_y_index);
        const lower_right_pos = get_cell_lower_right(end_x_index, end_y_index);
        const center_pos_x = (upper_left_pos["x"] + lower_right_pos["x"]) / 2;
        const center_pos_y = (upper_left_pos["y"] + lower_right_pos["y"]) / 2;
        ctx.fillStyle = "rgba(255, 0, 0, 1.0)";
        ctx.fillRect(center_pos_x - 1, center_pos_y - 1, 3, 3);
        ctx.restore();
    }
    draw_targets(ctx, invisibleTargets);
    if(mode && invisible_target_pos) {
        draw_invisible_circle(ctx, invisible_target_pos);
    }
    drawGrid(ctx);
}

export default function Base() {
    const [context, setContext] = useState(null)
    const {hovered, ref} = useHover();
    const {ref: canvasMouseRef, x: mouseX, y: mouseY} = useMouse();
    const [selectedCell, setSelectedCell] = useState(null);
    const [startSelectedCell, setStartSelectedCell] = useState(null);
    const [mouseState, setMouseState] = useState(MouseState.MOUSEUP);
    const [targetCells, setTargetCells] = useState([]);
    const [invisibleTargets, setInvisibleTargets] = useState([]);
    const [mode, setMode] = useState(null);
    const [targetPos, setTargetPos] = useState(null);

    const modeChange = (e) => {
        setMode(e.target.checked);
    }

    const set_clicked_pos = () => {
        if(mode) {
            setTargetPos({'x': mouseX, 'y': mouseY});
        }
    }

    const mousedown = useCallback(() => setMouseState(MouseState.MOUSEDOWN), []);
    const mouseup = useCallback(() => setMouseState(MouseState.MOUSEUP), []);
    const dbl_click = useCallback(() => setMouseState(MouseState.DBLCLICK), []);
    const mouse_down_ref = useEventListener('mousedown', mousedown);
    const mouse_up_ref = useEventListener('mouseup', mouseup);
    const dbl_click_ref = useEventListener('dblclick', dbl_click);
    const click_ref = useEventListener('click', set_clicked_pos);

    useEffect(() => {
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const cell_index = get_cell_index(mouseX, mouseY);
        setSelectedCell({'x_index': cell_index.x_index, 'y_index': cell_index.y_index});

        let invisibleTargetsTmp = invisibleTargets;
        if(mouseState === MouseState.MOUSEDOWN && !startSelectedCell && !mode){  // startSelectedCellが確定していない、かつMouseがDOWNになった場合
            setStartSelectedCell(cell_index);
        } else if((mouseState === MouseState.DBLCLICK) || (mouseState === MouseState.MOUSEUP && startSelectedCell && !mode)) { // 狙い施設数が変わる場合
            let targetCellsTmp = targetCells
            if (mouseState === MouseState.DBLCLICK) {  // double-clickされた場合
                targetCellsTmp = delete_selected_target_cells(cell_index, targetCellsTmp);
                // MouseStateを明示的に戻す
                setMouseState(MouseState.MOUSEUP);
            } else {  // startSelectedCellが確定している、かつMouseがUPになった場合
                targetCellsTmp.push({'start': startSelectedCell, 'end': selectedCell});
            }
            setTargetCells(targetCellsTmp);
            setStartSelectedCell(null);
            invisibleTargetsTmp = calc_targets(targetCellsTmp);
            setInvisibleTargets(invisibleTargetsTmp);
        }
        drawBase(ctx, selectedCell, mouseState, startSelectedCell, targetCells, invisibleTargetsTmp, mode, targetPos);
    }, [mouseX, mouseY, targetPos]);

    const clear_fun = () => {
        setTargetCells([]);
        setInvisibleTargets([]);
        setTargetPos(null);
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");

        drawBase(ctx, null, mouseState, null, [], [], mode, null);
    }

    return (
        <>
            <Group position="center">
                <div
                    ref={canvasMouseRef}
                    style={{
                        width: {width},
                        height: {height},
                    }}>
                    <div ref={mouse_up_ref}>
                        <div ref={click_ref}>
                            <div ref={dbl_click_ref}>
                                <canvas id="canvas" ref={mouse_down_ref} width={width} height={height}></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </Group>
            <div>
                <button onClick={clear_fun}>Clear</button>
                <div className="toggle_button">
                    <input id="toggle" className="toggle_input" type="checkbox" onChange={modeChange}/>
                    <label className="toggle_label"/>
                </div>
            </div>
        </>
    )
}