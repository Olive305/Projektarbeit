import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import React from "react";
import { Circle, Rect } from "react-konva";

class MyNode {
    id: string;
    x: number;
    y: number;
    h: number;
    w: number;
    gridSize: number;
    caption: string;
    onClick: Function;
    isDragging: boolean;
    rect: any;
    isSelected: boolean;
    circleRight: any;
    circleLeft: any;
    text:any;
    isPreview: boolean;


    static readonly h_val = 3;
    static readonly w_val = 7;
    static readonly circleSize = 10;

    constructor(id: string, x: number, y: number, gridSize: number, caption: string, onClick: Function) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.gridSize = gridSize;
        this.caption = caption;
        this.onClick = onClick;
        this.h = gridSize * MyNode.h_val;
        this.w = gridSize * MyNode.w_val;
        this.isDragging = false;
        this.isSelected = false;
        this.isPreview = false;
    }
}
export default MyNode;
