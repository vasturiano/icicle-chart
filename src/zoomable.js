import { select as d3Select, event as d3Event } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity } from 'd3-zoom';
import Kapsule from 'kapsule';

export default Kapsule({
  props: {
    svgEl: { triggerUpdate: false },
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
      state.transitionDuration = duration;
      state.el.call(state.zoom.scaleBy, k);
      return this;
    },
    zoomReset: function(state, duration = 0) {
      state.transitionDuration = duration;
      state.el.call(state.zoom.transform, d3ZoomIdentity);
      return this;
    },
    zoomTo: function(state, { x = 0, y = 0, k = 1 }, duration = 0) {
      state.transitionDuration = duration;
      state.el.call(state.zoom.transform, d3ZoomIdentity
        .scale(k)
        .translate(x, y)
      );
      return this;
    }
  },

  stateInit: () => ({
    zoom: d3Zoom().filter(() => !d3Event.button && !d3Event.dblclick),
    zoomTransform: { x: 0, y: 0, k: 1 }
  }),

  init(el, state) {
    state.isSvg = mode === 'svg';

    const isD3Selection = !!el && typeof el === 'object' && !!el.node && typeof el.node === 'function';
    state.el = d3Select(isD3Selection ? el.node() : el);

    state.el.call(state.zoom
      .on('dblclick.zoom', null) // Disable double-click zoom
      .on('zoom', function() {
        const tr = ({ ...d3Event.transform });

        state.enableX && (tr.x = 0);
        state.enableY && (tr.y = 0);

        const prevTr = state.zoomTransform;
        state.zoomTransform = tr;

        const duration = state.transitionDuration || 0;
        state.transitionDuration = 0; // reset it

        if (state.svgEl) {
          state.svgEl.transition(duration)
            .attr('transform', `
              translate(${tr.x}, ${tr.y})
              scale(${state.enableX ? tr.k : 1}, ${state.enableY ? tr.k : 1})
            `);
        }

        state.onChange && state.onChange(tr, prevTr, duration);
      })
    );
  }
});
