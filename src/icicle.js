import { select as d3Select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { hierarchy as d3Hierarchy, partition as d3Partition } from 'd3-hierarchy';
import { transition as d3Transition } from 'd3-transition';
import { interpolate as d3Interpolate } from 'd3-interpolate';
import zoomable from 'd3-zoomable';
import Kapsule from 'kapsule';
import tinycolor from 'tinycolor2';
import accessorFn from 'accessor-fn';
import Tooltip from 'float-tooltip';

const LABELS_WIDTH_OPACITY_SCALE = scaleLinear().domain([4, 8]).clamp(true); // px per char
const LABELS_HEIGHT_OPACITY_SCALE = scaleLinear().domain([15, 40]).clamp(true); // available height in px

export default Kapsule({
  props: {
    width: { default: window.innerWidth, onChange(_, state) { state.needsReparse = true }},
    height: { default: window.innerHeight, onChange(_, state) { state.needsReparse = true }},
    orientation: {
      default: 'lr', // td, bu, lr, rl
      onChange: function(_, state) { this.zoomReset(); state.needsReparse = true; }
    },
    data: { onChange: function() { this._parseData(); } },
    children: { default: 'children', onChange(_, state) { state.needsReparse = true }},
    sort: { onChange(_, state) { state.needsReparse = true }},
    label: { default: d => d.name },
    size: {
      default: 'value',
      onChange: function(_, state) { this.zoomReset(); state.needsReparse = true; }
    },
    color: { default: d => 'lightgrey' },
    nodeClassName: {}, // Additional css classes to add on each segment node
    minSegmentWidth: { default: .8 },
    excludeRoot: { default: false, onChange(_, state) { state.needsReparse = true }},
    showLabels: { default: true },
    showTooltip: { default: d => true, triggerUpdate: false},
    tooltipTitle: { default: null, triggerUpdate: false },
    tooltipContent: { default: d => '', triggerUpdate: false },
    onClick: { triggerUpdate: false },
    onRightClick: { triggerUpdate: false },
    onHover: { triggerUpdate: false },
    transitionDuration: { default: 800, triggerUpdate: false },
    disableD3Transitions: { default: false }
  },
  methods: {
    zoomBy: function(state, k) {
      state.zoom.zoomBy(k, state.transitionDuration);
      return this;
    },
    zoomReset: function(state) {
      state.zoom.zoomReset(state.transitionDuration);
      return this;
    },
    zoomToNode: function(state, d = {}) {
      const node = d.__dataNode;
      if (node) {
        const horiz = state.orientation === 'lr' || state.orientation === 'rl';

        const scale = state[horiz ? 'height' : 'width'] / (node.x1 - node.x0);
        const tr = -node.x0;

        state.zoom.zoomTo({ x: horiz ? 0 : tr, y: horiz ? tr : 0, k: scale }, state.transitionDuration);
      }
      return this;
    },
    _parseData: function(state) {
      if (state.data) {
        const hierData = d3Hierarchy(state.data, accessorFn(state.children))
          .sum(accessorFn(state.size));

        if (state.sort) {
          hierData.sort(state.sort);
        }

        const horiz = state.orientation === 'lr' || state.orientation === 'rl';
        const size = [state.width, state.height];
        horiz && size.reverse();

        d3Partition()
          //.padding(1)
          //.round(true)
          .size(size)(hierData);

        hierData.descendants().forEach((d, i) => {
          d.id = i; // Mark each node with a unique ID
          d.data.__dataNode = d; // Dual-link data nodes
        });

        if (state.excludeRoot) {
          // re-scale y values if excluding root
          const yScale = scaleLinear()
            .domain([hierData.y1 - hierData.y0, size[1]])
            .range([0, size[1]]);

          hierData.descendants().forEach(d => {
            d.y0 = yScale(d.y0);
            d.y1 = yScale(d.y1);
          });
        }

        state.layoutData = hierData.descendants().filter(d => d.y0 >= 0);
      }
    }
  },
  stateInit: () => ({
    zoom: zoomable()
  }),
  init: function(domNode, state) {
    const el = d3Select(domNode)
      .append('div').attr('class', 'icicle-viz');

    state.svg = el.append('svg');
    state.canvas = state.svg.append('g');

    state.tooltip = Tooltip()(el);

    // zoom/pan
    state.zoom(state.svg)
      .svgEl(state.canvas)
      .onChange((tr, prevTr, duration) => {
        if (state.showLabels && !duration) {
          // Scale labels immediately if not animating
          const horiz = state.orientation === 'lr' || state.orientation === 'rl';
          const scale = 1 / tr.k;

          state.canvas.selectAll('text')
            .attr('transform', horiz ? `scale(1, ${scale})` : `scale(${scale},1)`);
        }

        // Prevent using transitions when using mouse wheel to zoom
        state.skipTransitionsOnce = !duration;
        state._rerender();
      });

    state.svg
      .on('click', ev => (state.onClick || this.zoomReset)(null, ev)) // By default reset zoom when clicking on canvas
      .on('contextmenu', ev => {
        if (state.onRightClick) { // By default do nothing when right-clicking on canvas
          state.onRightClick(null, ev);
          ev.preventDefault();
        }
      })
      .on('mouseover', ev => state.onHover && state.onHover(null, ev));
  },
  update: function(state) {
    if (state.needsReparse) {
      this._parseData();
      state.needsReparse = false;
    }

    state.svg
      .style('width', state.width + 'px')
      .style('height', state.height + 'px');

    const horiz = state.orientation === 'lr' || state.orientation === 'rl';

    state.zoom
      .translateExtent([[0, 0], [state.width, state.height]])
      .enableX(!horiz)
      .enableY(horiz);

    if (!state.layoutData) return;

    const zoomTr = state.zoom.current();

    const cell = state.canvas.selectAll('.node')
      .data(
        state.layoutData
          .filter(d => // Show only segments in scene that are wider than the threshold
            d.x1 >= -zoomTr[horiz ? 'y' : 'x'] / zoomTr.k
            && d.x0 <= (horiz ? state.height - zoomTr.y : state.width - zoomTr.x) / zoomTr.k
            && (d.x1 - d.x0) >= state.minSegmentWidth / zoomTr.k
        ),
        d => d.id
    );

    const nameOf = accessorFn(state.label);
    const colorOf = accessorFn(state.color);
    const nodeClassNameOf = accessorFn(state.nodeClassName);

    const animate = !state.skipTransitionsOnce;
    state.skipTransitionsOnce = false;
    const transition = state.disableD3Transitions ? null : d3Transition().duration(animate ? state.transitionDuration: 0);

    const x0 = { td: d => d.x0, bu: d => d.x0, lr: d => d.y0, rl: d => state.width - d.y1 }[state.orientation];
    const x1 = { td: d => d.x1, bu: d => d.x1, lr: d => d.y1, rl: d => state.width - d.y0 }[state.orientation];
    const y0 = { td: d => d.y0, bu: d => state.height - d.y1, lr: d => d.x0, rl: d => d.x0 }[state.orientation];
    const y1 = { td: d => d.y1, bu: d => state.height - d.y0, lr: d => d.x1, rl: d => d.x1 }[state.orientation];

    // Exiting
    cell.exit().transition(transition).remove();

    // Entering
    const newCell = cell.enter().append('g')
      .attr('transform', d => `translate(
        ${x0(d) + (x1(d) - x0(d)) * (horiz ? 0 : 0.5)},
        ${y0(d) + (y1(d) - y0(d)) * (horiz ? 0.5 : 0)}
      )`);

    newCell.append('rect')
      .attr('id', d => `rect-${d.id}`)
      .attr('width', d => horiz ? `${(x1(d) - x0(d)) - 1}` : 0)
      .attr('height', d => horiz ? 0 : `${(y1(d) - y0(d)) - 1}`)
      .on('click', (ev, d) => {
        ev.stopPropagation();
        (state.onClick || this.zoomToNode)(d.data, ev);
      })
      .on('contextmenu', (ev, d) => {
        ev.stopPropagation();
        if (state.onRightClick) {
          state.onRightClick(d.data, ev);
          ev.preventDefault();
        }
      })
      .on('mouseover', (ev, d) => {
        ev.stopPropagation();
        state.onHover && state.onHover(d.data, ev);

        state.tooltip.content(!!state.showTooltip(d.data, d) && `
          <div class="tooltip-title">
            ${state.tooltipTitle
              ? state.tooltipTitle(d.data, d)
              : getNodeStack(d)
                .slice(state.excludeRoot ? 1 : 0)
                .map(d => nameOf(d.data))
                .join(' &rarr; ')
            }
          </div>
          ${state.tooltipContent(d.data, d)}
        `);
      })
      .on('mouseout', () => state.tooltip.content(false));

    newCell.append('clipPath')
      .attr('id', d => `clip-${d.id}`)
      .append('use')
      .attr('xlink:href', d => `#rect-${d.id}`);

    newCell.append('g')
      .attr('clip-path', d => `url(#clip-${d.id})`)
      .append('g')
        .attr('class', 'label-container')
        .attr('transform', d => `translate(
          ${state.orientation === 'lr' ? 4 : state.orientation === 'rl' ? x1(d) - x0(d) - 4 : 0},
          ${horiz ? 0 : (y1(d) - y0(d)) / 2}
        )`)
        .append('text')
          .attr('class', 'path-label');

    // Entering + Updating
    const allCells = cell.merge(newCell);

    allCells.attr('class', d => [
      'node',
      ...(`${nodeClassNameOf(d.data) || ''}`.split(' ').map(str => str.trim()))
    ].filter(s => s).join(' '));

    allCells.transition(transition)
      .attr('transform', d => `translate(${x0(d)},${y0(d)})`);

    allCells.select('rect').transition(transition)
      .attr('width', d => `${x1(d) - x0(d) - (horiz ? 1 : 0)}`)
      .attr('height', d => `${y1(d) - y0(d) - (horiz ? 0 : 1)}`)
      .style('fill', d => colorOf(d.data, d.parent));

    allCells.select('g.label-container')
      .style('display', state.showLabels ? null : 'none')
      .transition(transition)
        .attr('transform', d => `translate(
          ${state.orientation === 'lr' ? 4 : state.orientation === 'rl' ? x1(d) - x0(d) - 4 : (x1(d) - x0(d)) / 2},
          ${(y1(d) - y0(d)) / 2}
        )`);

    if (state.showLabels) {
      // Update previous scale
      const prevK = state.prevK || 1;
      state.prevK = zoomTr.k;

      allCells.select('text.path-label')
        .classed('light', d => !tinycolor(colorOf(d.data, d.parent)).isLight())
        .style('text-anchor', state.orientation === 'lr' ? 'start' : state.orientation === 'rl' ? 'end' : 'middle')
        .text(d => nameOf(d.data))
        .transition(transition)
          .style('opacity', d => horiz
            ? LABELS_HEIGHT_OPACITY_SCALE((y1(d) - y0(d)) * zoomTr.k)
            : LABELS_WIDTH_OPACITY_SCALE((x1(d) - x0(d)) * zoomTr.k / nameOf(d.data).length)
          )
           // Scale labels inversely proportional
          .attrTween('transform', function () {
            const kTr = d3Interpolate(prevK, zoomTr.k);
            return horiz ? t => `scale(1, ${1 / kTr(t)})` : t => `scale(${1 / kTr(t)}, 1)`;
          });
    }

    //

    function getNodeStack(d) {
      const stack = [];
      let curNode = d;
      while (curNode) {
        stack.unshift(curNode);
        curNode = curNode.parent;
      }
      return stack;
    }
  }
});
