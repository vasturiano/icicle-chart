import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { hierarchy as d3Hierarchy, partition as d3Partition } from 'd3-hierarchy';
import { transition as d3Transition } from 'd3-transition';
import { interpolate as d3Interpolate } from 'd3-interpolate';
import Kapsule from 'kapsule';
import tinycolor from 'tinycolor2';
import accessorFn from 'accessor-fn';

const LABELS_OPACITY_SCALE = scaleLinear().domain([15, 40]).range([0, 1]);
const TRANSITION_DURATION = 800;

export default Kapsule({

  props: {
    width: {
      default: window.innerWidth,
      onChange: function() { this.zoomReset(); this._parseData(); }
    },
    height: {
      default: window.innerHeight,
      onChange: function() { this.zoomReset(); this._parseData(); }
    },
    orientation: {
      default: 'lr', // td, bu, lr, rl
      onChange: function() { this.zoomReset(); this._parseData(); }
    },
    data: { onChange: function() { this._parseData(); } },
    children: { default: 'children', onChange: function() { this._parseData(); }},
    sort: { onChange: function() { this._parseData(); }},
    label: { default: d => d.name },
    size: {
      default: 'value',
      onChange: function() { this.zoomReset(); this._parseData(); }
    },
    color: { default: d => 'lightgrey' },
    minSegmentWidth: { default: .8 },
    showLabels: { default: true },
    tooltipContent: { default: d => '', triggerUpdate: false },
    onClick: { triggerUpdate: false }
  },
  methods: {
    zoomBy: function(state, k) {
      if(state.initialised) {
        state.zoomWithTransition = true;
        state.svg
          .call(state.zoom.scaleBy, k);
      }
      return this;
    },
    zoomReset: function(state) {
      if (state.initialised) {
        state.zoomWithTransition = true;
        state.svg
          .call(state.zoom.transform, d3ZoomIdentity); // Reset zoom level
      }
      return this;
    },
    zoomToNode: function(state, d = {}) {
      const node = d.__dataNode;
      if (state.initialised && node) {
        state.zoomWithTransition = true;

        const horiz = state.orientation === 'lr' || state.orientation === 'rl';

        const scale = state[horiz ? 'height' : 'width'] / (node.x1 - node.x0);
        const translate = [-node.x0, 0];
        horiz && translate.reverse();

        state.svg
          .call(state.zoom.transform, d3ZoomIdentity
            .scale(scale)
            .translate(...translate)
        );
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

        state.layoutData = hierData.descendants();
      }
    }
  },
  init: function(domNode, state) {
    const el = d3Select(domNode)
      .append('div').attr('class', 'icicle-viz');

    state.svg = el.append('svg');
    state.canvas = state.svg.append('g');

    // tooltips
    state.tooltip = d3Select('body')
      .append('div')
        .attr('class', 'chart-tooltip icicle-tooltip');

    // tooltip cleanup on unmount
    domNode.addEventListener ('DOMNodeRemoved', function(e) {
      if (e.target === this) { state.tooltip.remove(); }
    });

    state.canvas.on('mousemove', () => {
      state.tooltip
        .style('left', d3Event.pageX + 'px')
        .style('top', d3Event.pageY + 'px')
        .style('transform', `translate(-${d3Event.pageX / state.width * 100}%, 21px)`); // adjust horizontal position to not exceed canvas boundaries
    });

    // zoom/pan
    state.svg.call(state.zoom = d3Zoom()
      .scaleExtent([1, Infinity])
      .filter(() => !d3Event.button && !d3Event.dblclick)
      .on('zoom', handleZoom)
    );

    state.svg
      .on('dblclick.zoom', null)  // Disable double-click zoom
      .on('click', () => (state.onClick || this.zoomReset)()); // By default reset zoom when clicking on canvas

    state.zoomTransform = { x: 0, y: 0, k: 1 };

    //

    function handleZoom() {
      // Prevent using transitions when using mouse wheel to zoom
      state.skipTransitionsOnce = !state.zoomWithTransition;
      state.zoomWithTransition = false;

      state.zoomTransform = d3Event.transform;
      state._rerender();
    }
  },
  update: function(state) {
    state.svg
      .style('width', state.width + 'px')
      .style('height', state.height + 'px');

    state.zoom
      .translateExtent([[0, 0], [state.width, state.height]]);

    if (!state.layoutData) return;

    const horiz = state.orientation === 'lr' || state.orientation === 'rl';

    const cell = state.canvas.selectAll('.node')
      .data(
        state.layoutData
          .filter(d => // Show only segments in scene that are wider than the threshold
            d.x1 >= -state.zoomTransform[horiz ? 'y' : 'x'] / state.zoomTransform.k
            && d.x0 <= (horiz ? state.height - state.zoomTransform.y : state.width - state.zoomTransform.x) / state.zoomTransform.k
            && (d.x1 - d.x0) >= state.minSegmentWidth / state.zoomTransform.k
        ),
        d => d.id
    );

    const nameOf = accessorFn(state.label);
    const colorOf = accessorFn(state.color);
    const transition = d3Transition().duration(state.skipTransitionsOnce ? 0 : TRANSITION_DURATION);
    state.skipTransitionsOnce = false;

    const x0 = { td: d => d.x0, bu: d => d.x0, lr: d => d.y0, rl: d => state.width - d.y1 }[state.orientation];
    const x1 = { td: d => d.x1, bu: d => d.x1, lr: d => d.y1, rl: d => state.width - d.y0 }[state.orientation];
    const y0 = { td: d => d.y0, bu: d => state.height - d.y1, lr: d => d.x0, rl: d => d.x0 }[state.orientation];
    const y1 = { td: d => d.y1, bu: d => state.height - d.y0, lr: d => d.x1, rl: d => d.x1 }[state.orientation];

    // Exiting
    cell.exit().transition(transition).remove();

    // Entering
    const newCell = cell.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(
        ${x0(d) + (x1(d) - x0(d)) * (horiz ? 0 : 0.5)},
        ${y0(d) + (y1(d) - y0(d)) * (horiz ? 0.5 : 0)}
      )`);

    newCell.append('rect')
      .attr('id', d => `rect-${d.id}`)
      .attr('width', d => horiz ? `${(x1(d) - x0(d)) - 1}` : 0)
      .attr('height', d => horiz ? 0 : `${(y1(d) - y0(d)) - 1}`)
      .on('click', d => {
        d3Event.stopPropagation();
        (state.onClick || this.zoomToNode)(d.data);
      })
      .on('mouseover', d => {
        state.tooltip.style('display', 'inline');
        state.tooltip.html(`
          <div class="tooltip-title">${getNodeStack(d).map(d => nameOf(d.data)).join(' &rarr; ')}</div>
          ${state.tooltipContent(d.data, d)}
        `);
      })
      .on('mouseout', () => { state.tooltip.style('display', 'none'); });

    newCell.append('clipPath')
      .attr('id', d => `clip-${d.id}`)
      .append('use')
      .attr('xlink:href', d => `#rect-${d.id}`);

    const label = newCell.append('g')
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

    allCells.transition(transition)
      .attr('transform', d => `translate(${x0(d)},${y0(d)})`);

    allCells.select('rect').transition(transition)
      .attr('width', d => `${x1(d) - x0(d) - (horiz ? 1 : 0)}`)
      .attr('height', d => `${y1(d) - y0(d) - (horiz ? 0 : 1)}`)
      .style('fill', d => colorOf(d.data, d.parent));

    allCells.select('g.label-container').transition(transition)
      .attr('transform', d => `translate(
          ${state.orientation === 'lr' ? 4 : state.orientation === 'rl' ? x1(d) - x0(d) - 4 : (x1(d) - x0(d)) / 2},
          ${(y1(d) - y0(d)) / 2}
        )`);

    allCells.select('text.path-label')
      .classed('light', d => !tinycolor(colorOf(d.data, d.parent)).isLight())
      .transition(transition)
        .style('text-anchor', state.orientation === 'lr' ? 'start' : state.orientation === 'rl' ? 'end' : 'middle')
        .style('opacity', d => LABELS_OPACITY_SCALE((horiz ? y1(d) - y0(d) : x1(d) - x0(d)) * state.zoomTransform.k))
        .text(d => nameOf(d.data));

    // Apply zoom
    state.canvas.transition(transition)
      .attr('transform', `
        translate(${(horiz ? [0, state.zoomTransform.y] : [state.zoomTransform.x, 0]).join(',')})
        scale(${(horiz ? [1, state.zoomTransform.k] : [state.zoomTransform.k, 1]).join(',')})
      `);

    // Scale labels inversely proportional
    const [,,scx,scy] = (state.canvas.attr('transform') || 'translate(0,0) scale(1,1)').match(/[+-]?\d+(\.\d+)?/g);
    const curK = (horiz ? +scy : +scx) || 1;
    allCells.selectAll('text').transition(transition)
      .attrTween('transform', function() {
        const kTr = d3Interpolate(curK, state.zoomTransform.k);
        return horiz ? t => `scale(1,${1/kTr(t)})` : t => `scale(${1/kTr(t)},1)`;
      });

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
