import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity } from 'd3-zoom';
import { interpolate as d3Interpolate } from 'd3-interpolate';
import Kapsule from 'kapsule';

export default Kapsule({
  props: {
    htmlEl: { onChange(el, state) {
      state.htmlElD3 = !el
        ? null
        : typeof el === 'object' && !!el.node && typeof el.node === 'function'
          ? el // already a D3 selection
          : d3Select(el);
    }, triggerUpdate: false },
    svgEl: { onChange(el, state) {
      state.svgElD3 = !el
        ? null
        : typeof el === 'object' && !!el.node && typeof el.node === 'function'
        ? el // already a D3 selection
        : d3Select(el);
    }, triggerUpdate: false },
    enableX: { default: true, triggerUpdate: false },
    enableY: { default: true, triggerUpdate: false },
    scaleExtent: { default: [1, Infinity], onChange(extent, state) { extent && state.zoom.scaleExtent(extent)}, triggerUpdate: false },
    translateExtent: { onChange(extent, state) { extent && state.zoom.translateExtent(extent)}, triggerUpdate: false },
    onChange: { triggerUpdate: false }
  },

  methods: {
    current(state) {
      return ({ ...state.zoomTransform })
    },
    scaleBy: function(state, k, duration = 0) {
      if (state.initialised) {
        state.transitionDuration = duration;
        state.el.call(state.zoom.scaleBy, k);
      }
      return this;
    },
    zoomReset: function(state, duration = 0) {
      if (state.initialised) {
        state.transitionDuration = duration;
        state.el.call(state.zoom.transform, d3ZoomIdentity);
      }
      return this;
    },
    zoomTo: function(state, { x = 0, y = 0, k = 1 }, duration = 0) {
      if (state.initialised) {
        state.transitionDuration = duration;
        state.el.call(state.zoom.transform, d3ZoomIdentity
          .scale(k)
          .translate(x, y)
        );
      }
      return this;
    }
  },

  stateInit: () => ({
    zoom: d3Zoom().filter(() => !d3Event.button && !d3Event.dblclick),
    zoomTransform: { x: 0, y: 0, k: 1 }
  }),

  init(el, state) {
    const isD3Selection = !!el && typeof el === 'object' && !!el.node && typeof el.node === 'function';
    state.el = d3Select(isD3Selection ? el.node() : el);

    state.el
      .on('dblclick.zoom', null) // Disable double-click zoom
      .call(state.zoom
        .on('zoom', function() {
          const tr = ({ ...d3Event.transform });

          !state.enableX && (tr.x = 0);
          !state.enableY && (tr.y = 0);

          const prevTr = state.zoomTransform;
          state.zoomTransform = tr;

          const duration = state.transitionDuration || 0;
          state.transitionDuration = 0; // reset it

          const scX = state.enableX ? tr.k : 1;
          const scY = state.enableY ? tr.k : 1;

          if (state.htmlElD3) {
            (duration ? state.htmlElD3.transition().duration(duration) : state.htmlElD3)
              .style('transform', `translate(${tr.x}px, ${tr.y}px) scale(${scX}, ${scY})`);
          }

          if (state.svgElD3) {
            (duration ? state.svgElD3.transition().duration(duration) : state.svgElD3)
              .attr('transform', `translate(${tr.x}, ${tr.y}) scale(${scX}, ${scY})`);
          }

          state.onChange && state.onChange(tr, prevTr, duration);
        })
      );
  }
});
