icicle-chart
============

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![Dependencies][dependencies-img]][dependencies-url]

A partition interactive chart web component for visualizing hierarchical data.

<p align="center">
     <a href="https://vasturiano.github.io/icicle-chart/example/basic"><img width="80%" src="https://vasturiano.github.io/icicle-chart/example/preview.png"></a>
</p>

Also called a partition chart or a flame chart, an icicle chart...

Check out the examples:
* [Basic](https://vasturiano.github.io/icicle-chart/example/basic/) ([source](https://github.com/vasturiano/icicle-chart/blob/master/example/basic/index.html))

## Quick start

```
import Icicle from 'icicle-chart';
```
or
```
const Icicle = require('icicle-chart');
```
or even
```
<script src="//unpkg.com/icicle-chart"></script>
```
then
```
var myGraph = Icicle();
myGraph(<myDOMElement>)
    .prop(...);
```

## API reference

| Method | Description | Default |
| --- | --- | :--: |
| <b>data</b>([<i>array</i>]) | Getter/setter for element data. | `[]` |

## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!

[npm-img]: https://img.shields.io/npm/v/icicle-chart.svg
[npm-url]: https://npmjs.org/package/icicle-chart
[build-size-img]: https://img.shields.io/bundlephobia/minzip/icicle-chart.svg
[build-size-url]: https://bundlephobia.com/result?p=icicle-chart
[dependencies-img]: https://img.shields.io/david/vasturiano/icicle-chart.svg
[dependencies-url]: https://david-dm.org/vasturiano/icicle-chart
