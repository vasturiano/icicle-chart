export interface ConfigOptions {}

type Accessor<In, Out> = Out | string | ((obj: In) => Out);
type NodeAccessor<T> = Accessor<Node, T>;

export interface Node {
  __dataNode?: DataNode;
  name?: string;
  children?: Node[];
}

export interface DataNode {
  data: Node;
  id: number;
  value: number;
  depth: number;
  height: number;
  parent: DataNode | null;
  children?: DataNode[];
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

type CompareFn<ItemType> = (a: ItemType, b: ItemType) => number;

type TooltipFn = (node: Node, dataNode: DataNode) => string;

export type Orientation = 'td' | 'bu' | 'lr' | 'rl';

declare class IcicleChart {
  constructor(element: HTMLElement, configOptions?: ConfigOptions);

  width(): number;
  width(width: number): IcicleChart;
  height(): number;
  height(height: number): IcicleChart;

  orientation(): Orientation;
  orientation(orientation: Orientation): IcicleChart;

  data(): Node;
  data(rootNode: Node): IcicleChart;
  children(): NodeAccessor<Node[]>;
  children(childrenAccessor: NodeAccessor<Node[]>): IcicleChart;
  label(): NodeAccessor<string>;
  label(textAccessor: NodeAccessor<string>): IcicleChart;
  size(): NodeAccessor<string>;
  size(sizeAccessor: NodeAccessor<string>): IcicleChart;
  color(): NodeAccessor<string>;
  color(colorAccessor: NodeAccessor<string>): IcicleChart;
  nodeClassName(): NodeAccessor<string>;
  nodeClassName(nodeClassName: NodeAccessor<string>): IcicleChart;

  minSegmentWidth(): number;
  minSegmentWidth(width: number): IcicleChart;
  excludeRoot(): boolean;
  excludeRoot(exclude: boolean): IcicleChart;

  sort(): CompareFn<Node> | null;
  sort(cmpFn: CompareFn<Node> | null): IcicleChart;

  showLabels(): boolean;
  showLabels(show: boolean): IcicleChart;
  showTooltip(): (node: Node) => boolean;
  showTooltip(showTooltipFn: (node: Node) => boolean): IcicleChart;
  tooltipTitle(): TooltipFn;
  tooltipTitle(fn: TooltipFn): IcicleChart;
  tooltipContent(): TooltipFn;
  tooltipContent(fn: TooltipFn): IcicleChart;

  onClick(cb: ((node: Node, event: MouseEvent) => void) | null): IcicleChart;
  onRightClick(cb: ((node: Node, event: MouseEvent) => void) | null): IcicleChart;
  onHover(cb: ((node: Node | null, event: MouseEvent) => void) | null): IcicleChart;

  zoomToNode(node: Node): IcicleChart;
  zoomBy(k: number):IcicleChart;
  zoomReset():IcicleChart;

  transitionDuration(): number;
  transitionDuration(duration: number): IcicleChart;
}

export default IcicleChart;
