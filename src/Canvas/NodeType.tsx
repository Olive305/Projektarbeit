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
    actualKey: string;


    static readonly h_val = 3;
    static readonly w_val = 5;
    static readonly circleSize = 10;

    constructor(id: string, x: number, y: number, gridSize: number, caption: string, onClick: Function, preview?: boolean, actualKey?: string) {
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
        this.isPreview = preview ? preview : false;
        this.actualKey = actualKey ? actualKey : id;
    }
}
export default MyNode;
