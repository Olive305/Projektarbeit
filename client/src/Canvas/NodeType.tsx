import GraphController from "../ControlBar/GraphController";

class MyNode {
    id: string;
    private x: number;
    private y: number;
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
    private real_x: number;
    private real_y: number;


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
        this.real_x = 0
        this.real_y = 0

        this.calculateRealPos()
    }

    private calculateRealPos() {
        // calculate the size of a square in the matrix (distance between two nodes next to each other from smallest pos of both)
        const x_size = (MyNode.w_val + GraphController.node_distance) * this.gridSize;
        const y_size = (MyNode.h_val + GraphController.node_distance) * this.gridSize;

        this.real_x = this.x * x_size;
        this.real_y = this.y * y_size;
    }

    public get_x() {
        return this.x;
    }

    public get_y() {
        return this.y
    }

    public set_x(x: number) {
        this.x = x;
        this.calculateRealPos();
    }

    public set_y(y: number) {
        this.y = y;
        this.calculateRealPos();
    }

    public get_real_x() {
        return this.real_x;
    }

    public get_real_y() {
        return this.real_y;
    }

    public set_real_x(x: number) {
        this.real_x = x
        this.x = Math.round(this.real_x / ((MyNode.w_val + GraphController.node_distance) * this.gridSize));
    }

    public set_real_y(y: number) {
        this.real_y = y
        this.y = Math.round(this.real_y / ((MyNode.h_val + GraphController.node_distance) * this.gridSize));
    }

}
export default MyNode;
