/**
 * A parallel coordinates chart
 *
 * Examples:
 * - {@link http://dc-js.github.io/dc.js/examples/parallel-coordinates.html Scatter Chart}
 * @class parallelCoordinates
 * @memberof dc
 * @mixes dc.coordinateGridMixin
 * @example
 * // create a scatter plot under #chart-container1 element using the default global chart group
 * var chart1 = dc.parallelCoordinates('#chart-container1');
 * // create a scatter plot under #chart-container2 element using chart group A
 * var chart2 = dc.parallelCoordinates('#chart-container2', 'chartGroupA');
 * // create a sub-chart under a composite parent chart
 * var chart3 = dc.parallelCoordinates(compositeChart);
 * @param {String|node|d3.selection} parent - Any valid
 * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#selecting-elements d3 single selector} specifying
 * a dom block element such as a div; or a dom element or d3 selection.
 * @param {String} [chartGroup] - The name of the chart group this chart instance should be placed in.
 * Interaction with a chart will only trigger events and redraws within the chart's group.
 * @returns {dc.parallelCoordinates}
 */
dc.parallelCoordinates = function (parent, chartGroup) {
    var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
    var _symbol = d3.svg.symbol();

    var _g;

    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append('g')
            .attr('transform', 'translate(' + _chart.margins().left + ',' + _chart.margins().top + ')');

        drawChart();

        return _chart;
    };

    function myextent(array, accessor) {
      var min = 100000;
      var max = 0;
      array.forEach(function(datum) {
        const val = accessor(datum);
        if (val < min) {
          min = val;
        }
        if (val > max) {
          max = val;
        }
      });
      return [min, max];
    }

    function drawChart () {
        var _data = _chart.data();
        console.log(_data);

        const dimensions = Array(_data[0].key.length); // this needs to be imporved)
        for (var i = 0; i < dimensions.length; i++) {
          dimensions[i] = i;
        }
        const dimensionTitles = dimensions.map(function(index) { return "" + index; });
        const dataAccess = function(datum, dim) { return datum.key[dim]; };

        const width = _chart.width() - (_chart.margins().left + _chart.margins().right);
        const height = _chart.height() - (_chart.margins().top + _chart.margins().bottom);

        const x = d3.scale.ordinal().domain(dimensions).rangePoints([0, width]);
        const y = {};

        const line = d3.svg.line();
        const axis = d3.svg.axis().orient("left");

        var lines = null;

        // Create a scale and brush for each dimension.
        dimensions.forEach(function(dim) {
          // this.data.forEach(datum => datum[dim.key] = +datum[dim.key]); // ensure numbers?

          // Calculate domain with 5% extra space
          const extent = myextent(_data, function(datum) { return dataAccess(datum, dim); });

          // Create the scale
          y[dim] = d3.scale.linear().domain(extent).range([height, 0]).nice();

          // Create the brush
          // y[dim.key].brush = d3.svg.brush()
          //   .y(y[dim.key])
          //   .on("brush", () => {
          //     // Handles a brush event, toggling the display of forground lines.
          //     const actives = this._dimensions.filter(dim => !y[dim.key].brush.empty());
          //     const extents = actives.map(dim => y[dim.key].brush.extent());
          //     const selection = [];
          //     lines.each(datum => {
          //       const selected = actives.length != 0 && actives.every((dim, i) => extents[i][0] <= datum[dim.key] && datum[dim.key] <= extents[i][1]);
          //       if (selected) {
          //         selection.push(datum);
          //       }
          //     });
          //     this.setDirectSelection(selection);
          //   });
        });


        // Helper function: returns the path for a given data point.
        const expand = function(datum) {
          return dimensions.filter(function(dim) {
            return dataAccess(datum, dim) != 0;
          }).map(function(dim) {
            return {
              dim: dim,
              value: dataAccess(datum, dim),
              data: datum
            };
          });
        };

        const path = function(datum) {
          return line(expand(datum).map(function(expanded) {
            return [x(expanded.dim), y[expanded.dim](expanded.value)];
          }));
        };

        const flatten = function(source) {
          const result = [];
          source.forEach(function(d) { d.forEach(function(d) { result.push(d); }); });
          return result;
        };

        // Add foreground
        const foreground = _g.append("svg:g")
          .attr("class", "foreground");
        // Add lines
        const updateLines = function(lines) {
          lines.attr("d", path);
        }
        lines = foreground.selectAll("path")
          .data(_data)
          .enter().append("svg:path").style("fill", "none").style("stroke", "black");
        updateLines(lines);

        // Add dots
        const updateDots = function(dots) {
          dots
            .attr("cx", function(expanded) { return x(expanded.dim); })
            .attr("cy", function(expanded) { return y[expanded.dim](expanded.value); });
        }
        const dots = foreground.selectAll("circle")
          .data(flatten(_data.map(expand)))
          .enter().append("svg:circle")
          .attr("r", 4);
        updateDots(dots);

        // this.appendTooltip(lines);

        // let i = 0;

        // Add a group element for each dimension.
        const axisGroups = _g.selectAll(".dimension")
          .data(dimensions)
          .enter().append("g")
          .attr("class", "dimension")
          .attr("transform", function(d) {
            return "translate(" + x(d) + ")";
          });
          // .call(d3.behavior.drag()
          //   .origin(d => { return {x: x(d.key)}; })
          //   .on("dragstart", d => {
          //     i = this._dimensions.indexOf(d);
          //   })
          //   .on("drag", () => {
          //     x.range()[i] = d3.event.x;
          //     this._dimensions.sort((a, b) => x(a.key) - x(b.key));
          //     g.attr("transform", d => "translate(" + x(d.key) + ")");
          //     updateLines(lines);
          //     updateDots(dots);
          //   })
          //   .on("dragend", () => {
          //     x.domain(this._dimensions.map(dim => dim.key)).rangePoints([0, w]);
          //     const t = d3.transition().duration(500);
          //     t.selectAll(".dimension").attr("transform", dim => "translate(" + x(dim.key) + ")");
          //     updateLines(t.selectAll(".foreground path"));
          //     updateDots(t.selectAll(".foreground circle"));
          //   }));

        // Add an axis and title.
        const axisSvg = axisGroups.append("svg:g");
        axisSvg
          .attr("class", "axis")
          .each(function(d) { d3.select(this).call(axis.scale(y[d]).ticks(10, "s")); })
          .append("svg:text").classed("axisTitle", true)
          .attr("text-anchor", "middle")
          .attr("y", -9)
          .text(function(d) { return dimensionTitles[d]; });
        // this.appendAxis(axisSvg);

        // Add a brush for each axis.
        // g.append("svg:g")
        //   .attr("class", "brush")
        //   .each(function(d) { d3.select(this).call(y[d.key].brush); })
        //   .selectAll("rect")
        //   .attr("x", -8)
        //   .attr("width", 16);

        // drawAxis();
        // drawGridLines();
        //
        // var rows = _g.selectAll('g.' + _rowCssClass)
        //     .data(_rowData);
        //
        // createElements(rows);
        // removeElements(rows);
        // updateElements(rows);
    }

    var _existenceAccessor = function (d) { return d.value; };

    var originalKeyAccessor = _chart.keyAccessor();
    _chart.keyAccessor(function (d) { return originalKeyAccessor(d)[0]; });
    _chart.valueAccessor(function (d) { return originalKeyAccessor(d)[1]; });
    _chart.colorAccessor(function () { return _chart._groupName; });

    _chart.title(function (d) {
        // this basically just counteracts the setting of its own key/value accessors
        // see https://github.com/dc-js/dc.js/issues/702
        return _chart.keyAccessor()(d) + ',' + _chart.valueAccessor()(d) + ': ' +
            _chart.existenceAccessor()(d);
    });

    var _locator = function (d) {
        return 'translate(' + _chart.x()(_chart.keyAccessor()(d)) + ',' +
                              _chart.y()(_chart.valueAccessor()(d)) + ')';
    };

    var _highlightedSize = 7;
    var _symbolSize = 5;
    var _excludedSize = 3;
    var _excludedColor = null;
    var _excludedOpacity = 1.0;
    var _emptySize = 0;
    var _emptyOpacity = 0;
    var _nonemptyOpacity = 1;
    var _emptyColor = null;
    var _filtered = [];

    function elementSize (d, i) {
        if (!_existenceAccessor(d)) {
            return Math.pow(_emptySize, 2);
        } else if (_filtered[i]) {
            return Math.pow(_symbolSize, 2);
        } else {
            return Math.pow(_excludedSize, 2);
        }
    }
    _symbol.size(elementSize);

    dc.override(_chart, '_filter', function (filter) {
        if (!arguments.length) {
            return _chart.__filter();
        }

        return _chart.__filter(dc.filters.RangedTwoDimensionalFilter(filter));
    });

    _chart.plotData = function () {
        var symbols = _chart.chartBodyG().selectAll('path.symbol')
            .data(_chart.data());

        symbols
            .enter()
        .append('path')
            .attr('class', 'symbol')
            .attr('opacity', 0)
            .attr('fill', _chart.getColor)
            .attr('transform', _locator);

        symbols.call(renderTitles, _chart.data());

        symbols.each(function (d, i) {
            _filtered[i] = !_chart.filter() || _chart.filter().isFiltered([d.key[0], d.key[1]]);
        });

        dc.transition(symbols, _chart.transitionDuration(), _chart.transitionDelay())
            .attr('opacity', function (d, i) {
                if (!_existenceAccessor(d)) {
                    return _emptyOpacity;
                } else if (_filtered[i]) {
                    return _nonemptyOpacity;
                } else {
                    return _chart.excludedOpacity();
                }
            })
            .attr('fill', function (d, i) {
                if (_emptyColor && !_existenceAccessor(d)) {
                    return _emptyColor;
                } else if (_chart.excludedColor() && !_filtered[i]) {
                    return _chart.excludedColor();
                } else {
                    return _chart.getColor(d);
                }
            })
            .attr('transform', _locator)
            .attr('d', _symbol);

        dc.transition(symbols.exit(), _chart.transitionDuration(), _chart.transitionDelay())
            .attr('opacity', 0).remove();
    };

    function renderTitles (symbol, d) {
        if (_chart.renderTitle()) {
            symbol.selectAll('title').remove();
            symbol.append('title').text(function (d) {
                return _chart.title()(d);
            });
        }
    }

    /**
     * Get or set the existence accessor.  If a point exists, it is drawn with
     * {@link dc.parallelCoordinates#symbolSize symbolSize} radius and
     * opacity 1; if it does not exist, it is drawn with
     * {@link dc.parallelCoordinates#emptySize emptySize} radius and opacity 0. By default,
     * the existence accessor checks if the reduced value is truthy.
     * @method existenceAccessor
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link dc.parallelCoordinates#symbolSize symbolSize}
     * @see {@link dc.parallelCoordinates#emptySize emptySize}
     * @example
     * // default accessor
     * chart.existenceAccessor(function (d) { return d.value; });
     * @param {Function} [accessor]
     * @returns {Function|dc.parallelCoordinates}
     */
    _chart.existenceAccessor = function (accessor) {
        if (!arguments.length) {
            return _existenceAccessor;
        }
        _existenceAccessor = accessor;
        return this;
    };

    /**
     * Get or set the symbol type used for each point. By default the symbol is a circle.
     * Type can be a constant or an accessor.
     * @method symbol
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_type d3.svg.symbol.type}
     * @example
     * // Circle type
     * chart.symbol('circle');
     * // Square type
     * chart.symbol('square');
     * @param {String|Function} [type='circle']
     * @returns {String|Function|dc.parallelCoordinates}
     */
    _chart.symbol = function (type) {
        if (!arguments.length) {
            return _symbol.type();
        }
        _symbol.type(type);
        return _chart;
    };

    /**
     * Get or set the symbol generator. By default `dc.parallelCoordinates` will use
     * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol d3.svg.symbol()}
     * to generate symbols. `dc.parallelCoordinates` will set the
     * {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_size size accessor}
     * on the symbol generator.
     * @method customSymbol
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol d3.svg.symbol}
     * @see {@link https://stackoverflow.com/questions/25332120/create-additional-d3-js-symbols Create additional D3.js symbols}
     * @param {String|Function} [customSymbol=d3.svg.symbol()]
     * @returns {String|Function|dc.parallelCoordinates}
     */
    _chart.customSymbol = function (customSymbol) {
        if (!arguments.length) {
            return _symbol;
        }
        _symbol = customSymbol;
        _symbol.size(elementSize);
        return _chart;
    };

    /**
     * Set or get radius for symbols.
     * @method symbolSize
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_size d3.svg.symbol.size}
     * @param {Number} [symbolSize=3]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.symbolSize = function (symbolSize) {
        if (!arguments.length) {
            return _symbolSize;
        }
        _symbolSize = symbolSize;
        return _chart;
    };

    /**
     * Set or get radius for highlighted symbols.
     * @method highlightedSize
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_size d3.svg.symbol.size}
     * @param {Number} [highlightedSize=5]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.highlightedSize = function (highlightedSize) {
        if (!arguments.length) {
            return _highlightedSize;
        }
        _highlightedSize = highlightedSize;
        return _chart;
    };

    /**
     * Set or get size for symbols excluded from this chart's filter. If null, no
     * special size is applied for symbols based on their filter status.
     * @method excludedSize
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_size d3.svg.symbol.size}
     * @param {Number} [excludedSize=null]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.excludedSize = function (excludedSize) {
        if (!arguments.length) {
            return _excludedSize;
        }
        _excludedSize = excludedSize;
        return _chart;
    };

    /**
     * Set or get color for symbols excluded from this chart's filter. If null, no
     * special color is applied for symbols based on their filter status.
     * @method excludedColor
     * @memberof dc.parallelCoordinates
     * @instance
     * @param {Number} [excludedColor=null]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.excludedColor = function (excludedColor) {
        if (!arguments.length) {
            return _excludedColor;
        }
        _excludedColor = excludedColor;
        return _chart;
    };

    /**
     * Set or get opacity for symbols excluded from this chart's filter.
     * @method excludedOpacity
     * @memberof dc.parallelCoordinates
     * @instance
     * @param {Number} [excludedOpacity=1.0]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.excludedOpacity = function (excludedOpacity) {
        if (!arguments.length) {
            return _excludedOpacity;
        }
        _excludedOpacity = excludedOpacity;
        return _chart;
    };

    /**
     * Set or get radius for symbols when the group is empty.
     * @method emptySize
     * @memberof dc.parallelCoordinates
     * @instance
     * @see {@link https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol_size d3.svg.symbol.size}
     * @param {Number} [emptySize=0]
     * @returns {Number|dc.parallelCoordinates}
     */
    _chart.hiddenSize = _chart.emptySize = function (emptySize) {
        if (!arguments.length) {
            return _emptySize;
        }
        _emptySize = emptySize;
        return _chart;
    };

    /**
     * Set or get color for symbols when the group is empty. If null, just use the
     * {@link dc.colorMixin#colors colorMixin.colors} color scale zero value.
     * @name emptyColor
     * @memberof dc.parallelCoordinates
     * @instance
     * @param {String} [emptyColor=null]
     * @return {String}
     * @return {dc.parallelCoordinates}/
     */
    _chart.emptyColor = function (emptyColor) {
        if (!arguments.length) {
            return _emptyColor;
        }
        _emptyColor = emptyColor;
        return _chart;
    };

    /**
     * Set or get opacity for symbols when the group is empty.
     * @name emptyOpacity
     * @memberof dc.parallelCoordinates
     * @instance
     * @param {Number} [emptyOpacity=0]
     * @return {Number}
     * @return {dc.parallelCoordinates}
     */
    _chart.emptyOpacity = function (emptyOpacity) {
        if (!arguments.length) {
            return _emptyOpacity;
        }
        _emptyOpacity = emptyOpacity;
        return _chart;
    };

    /**
     * Set or get opacity for symbols when the group is not empty.
     * @name nonemptyOpacity
     * @memberof dc.parallelCoordinates
     * @instance
     * @param {Number} [nonemptyOpacity=1]
     * @return {Number}
     * @return {dc.parallelCoordinates}
     */
    _chart.nonemptyOpacity = function (nonemptyOpacity) {
        if (!arguments.length) {
            return _emptyOpacity;
        }
        _nonemptyOpacity = nonemptyOpacity;
        return _chart;
    };

    _chart.legendables = function () {
        return [{chart: _chart, name: _chart._groupName, color: _chart.getColor()}];
    };

    _chart.legendHighlight = function (d) {
        resizeSymbolsWhere(function (symbol) {
            return symbol.attr('fill') === d.color;
        }, _highlightedSize);
        _chart.chartBodyG().selectAll('.chart-body path.symbol').filter(function () {
            return d3.select(this).attr('fill') !== d.color;
        }).classed('fadeout', true);
    };

    _chart.legendReset = function (d) {
        resizeSymbolsWhere(function (symbol) {
            return symbol.attr('fill') === d.color;
        }, _symbolSize);
        _chart.chartBodyG().selectAll('.chart-body path.symbol').filter(function () {
            return d3.select(this).attr('fill') !== d.color;
        }).classed('fadeout', false);
    };

    function resizeSymbolsWhere (condition, size) {
        var symbols = _chart.chartBodyG().selectAll('.chart-body path.symbol').filter(function () {
            return condition(d3.select(this));
        });
        var oldSize = _symbol.size();
        _symbol.size(Math.pow(size, 2));
        dc.transition(symbols, _chart.transitionDuration(), _chart.transitionDelay()).attr('d', _symbol);
        _symbol.size(oldSize);
    }

    _chart.setHandlePaths = function () {
        // no handle paths for poly-brushes
    };

    _chart.extendBrush = function () {
        var extent = _chart.brush().extent();
        if (_chart.round()) {
            extent[0] = extent[0].map(_chart.round());
            extent[1] = extent[1].map(_chart.round());

            _chart.g().select('.brush')
                .call(_chart.brush().extent(extent));
        }
        return extent;
    };

    _chart.brushIsEmpty = function (extent) {
        return _chart.brush().empty() || !extent || extent[0][0] >= extent[1][0] || extent[0][1] >= extent[1][1];
    };

    _chart._brushing = function () {
        var extent = _chart.extendBrush();

        _chart.redrawBrush(_chart.g());

        if (_chart.brushIsEmpty(extent)) {
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.redrawGroup();
            });

        } else {
            var ranged2DFilter = dc.filters.RangedTwoDimensionalFilter(extent);
            dc.events.trigger(function () {
                _chart.filter(null);
                _chart.filter(ranged2DFilter);
                _chart.redrawGroup();
            }, dc.constants.EVENT_DELAY);

        }
    };

    _chart.setBrushY = function (gBrush) {
        gBrush.call(_chart.brush().y(_chart.y()));
    };

    return _chart.anchor(parent, chartGroup);
};
