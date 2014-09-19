// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs
$(document).foundation();

var foundation_blue = "#008CBA",
    foundation_red  = "#f04124";

    drawChangesGraph = function (changes) {

        var maxDomain = d3.max(changes.authors.author, function (d) { return parseInt(d.insertions); }),
            section = d3.select('.changes'),
            section_width = parseInt(section.style('width').substring(0, section.style('width').length - 2)),
            x = d3.scale.linear()
                .domain([0, maxDomain])
                .range([0, maxDomain / 2]),
            data = changes.authors.author.filter(function (d) {
                return (parseInt(d.insertions) + parseInt(d.deletions)) > 100;
            });

        console.log(section_width);

        var chart = section.append('svg')
            .attr('width', section_width)
            .attr('height', 20 * changes.authors.author.length)
            .attr('class', 'chart');

        var bar = chart.selectAll('g')
            .data(data);

        bar.enter().append('g');

        bar.exit().remove();

        // update

        bar.attr('class', 'bar')
            .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
        // insertions bar
        bar.append('rect')
            .attr('x', (section_width / 2))
            .attr('height', 19)
            .style('fill', foundation_blue)
            .attr('width', 0)
            .transition()
            .delay(function (d, i) { return i * 50; })
            .duration(1500)
            .attr('width', function (d) { return x(d.insertions); });

        // deletions bar
        bar.append('rect')
            .attr('height', 19)
            .attr('height', 19)
            .style('fill', foundation_red)
            .attr('width', 0)
            .attr('x', section_width / 2)
            .transition()
            .delay(function (d, i) { return i * 50; })
            .duration(1500)
            .attr('x', function (d) { return (section_width / 2) - x(d.deletions); })
            .attr('width', function (d) { return x(d.deletions); });

        // name bar
        bar.append('text')
            .attr('x', 50)
            .attr('y', 10)
            .attr('dy', '.35em')
            .text(function(d) { return d.name; });

        // insertion count
        bar.append('text')
            .attr('x', function (d) { return (section_width / 2) + 50; })
            .attr('y', 10)
            .attr('dy', '.35em')
            .text(function (d) { return '(' + d.insertions + ')'; });

        // deletion count
        bar.append('text')
            .attr('x', function (d) { return (section_width / 2) - 50; })
            .attr('y', 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .text(function (d) { return '(' + d.deletions + ')'; });


        bar.transition()
            .delay(750)
            .each("start", function() { d3.select(this).attr('width', 0); });
    };




(function ($) {
    $(document).ready(function () {

        d3.xml('jquery.xml', function (data) {
            // parse XML doc into usable JSON format
            var x2js = new X2JS(),
                json_data = x2js.xml2json(data),
                changes = json_data.gitinspector.changes;

            // we want to visualize:
            //  changes by author
            //  blame by author

            drawChangesGraph(changes);

        });
    })
}(jQuery));