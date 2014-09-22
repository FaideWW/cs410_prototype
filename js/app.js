// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs
$(document).foundation();

var foundation_blue = "#008CBA",
    foundation_red  = "#f04124",

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
            .attr('height', 20 * data.length)
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
    },

    drawCommitsGraph = function (commits) {
        /**
         *  commit: {
         *      author:  {string},
         *      email:   {string},
         *      files:   [{
         *          changes: {number},
         *          deletions: {number},
         *          filename: {string},
         *          insertions: {number}
         *      }],
         *      hash:    {string},
         *      merge:   {
         *          target: {string},
         *          destination: {string}
         *      } | undefined,
         *      message: {string},
         *      raw:     {Array},
         *      summary: {
         *          files_changed: {number},
         *          total_deletions: {number},
         *          total_insertions: {number}
         *      },
         *      timestamp: {Date}
         *  }
         *
         */
        var data = commits,
            section = d3.select('.changes'),
            section_width = parseInt(section.style('width').substring(0, section.style('width').length - 2)),
            chart, bar;


        chart = section.append('svg')
            .attr('width', section_width)
            .attr('height', 20 * data.length)
            .attr('class', 'chart');

        bar = chart.selectAll('g')
            .data(data);

        bar.enter().append('g');

        bar.exit().remove();

        // update

        bar.attr('class', 'bar')
            .attr('transform', function (d, i) { return 'translate(0,' + i * 20 + ')' });

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
            .duration(function (d) { return d.summary.total_insertions; })
            .attr('width', function (d) { return d.summary.total_insertions; });

        // deletions bar
        bar.append('rect')
            .attr('height', 19)
            .attr('height', 19)
            .style('fill', foundation_red)
            .attr('width', 0)
            .attr('x', section_width / 2)
            .transition()
            .delay(function (d, i) { return i * 50; })
            .duration(function (d) { return d.summary.total_deletions; })
            .attr('x', function (d) { return (section_width / 2) - d.summary.total_deletions; })
            .attr('width', function (d) { return d.summary.total_deletions; });

        // name bar
        bar.append('text')
            .attr('x', 50)
            .attr('y', 10)
            .attr('dy', '.35em')
            .html(function(d) { // TODO: this is a hardlink to jquery's github page; maybe allow people to expand these to see per-commit changes
                var hash_link = '<a href="https://www.github.com/jquery/jquery/commit/' + d.hash + '">' + d.hash.substr(0, 6) + '</a>';

                return hash_link +' (' + d.author + ')';
            });

        // insertion count
        bar.append('text')
            .attr('x', (section_width / 2) + 50)
            .attr('y', 10)
            .attr('dy', '.35em')
            .text(function (d) { return '(' + d.summary.total_insertions + ')'; });

        // deletion count
        bar.append('text')
            .attr('x', (section_width / 2) - 50)
            .attr('y', 10)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            .text(function (d) { return '(' + d.summary.total_deletions + ')'; });


        bar.transition()
            .delay(750)
            .each("start", function() { d3.select(this).attr('width', 0); });
    },

    parseCommits = function (data) {
        var lines = data.split('\n'),
            raw_commits = [],
            i = -1,
            time_begin = new Date().getTime(),
            commits,
            time_end;


        while (lines.length) {

            if (lines[0].indexOf('commit') === 0) {
                i += 1;
                raw_commits.push([]);
            }

            raw_commits[i].push(lines.splice(0, 1)[0]);
        }

        commits = raw_commits.map(function (commit) {
            /**
             * raw commit syntactic structure
             *
             * [0]    commit hash
             * [1?]   merge info (optional)
             * [2]    author name and email
             * [3]    timestamp
             * [4...] message (1 or more lines)
             *
             * [5...] files changed (1 or more lines)
             * [6]    file change summary
             */

            var author_line       = (commit[1].indexOf('Author') === -1) ? 2 : 1,
                date_line         = author_line + 1,
                msg_begin         = date_line + 1,
                msg_end           = msg_begin + 1,
                file_summary_line = commit.length - 2,
                files_begin       = msg_end + 1,
                files_end         = file_summary_line,
                author_data       = commit[author_line].match(/Author: (.+) <(.+)>/),
                merge_data        = (author_line === 2) ? commit[1].match(/Merge: (.+) + (.+)/) : undefined,
                time_data         = commit[date_line].match(/Date:\s+(.+)/),
                message_data,
                file_data,
                file_summary_data = commit[file_summary_line].match(/ (\d+) (?:files|file) changed(, (\d+) insertions\(\+\))?(, (\d+) deletions\(-\))?/);

            while (commit[msg_end].length) { msg_end += 1; files_begin += 1; }

            if (merge_data) {
                merge_data = {
                    target:      merge_data[1],
                    destination: merge_data[2]
                };
            }
            message_data = commit.slice(msg_begin + 1, msg_end).join('\n');
            file_data = commit.slice(files_begin, files_end);


            // parse files
            file_data = file_data.map(function (file) {
                var file_info = file.match(/ (\S+)\s*\|\s+(\d+)\s?(\+*)(-*)| (\S+)\s*\|\s+Bin (\d+) -> (\d+) bytes/),
                    insertion_str,
                    deletion_str,
                    total_str,
                    changes,
                    insertions,
                    deletions;

                if (file_info[3] || file_info[4]) {
                    // standard text file line change
                    insertion_str = file_info[3].length;
                    deletion_str  = file_info[4].length;
                    total_str     = insertion_str + deletion_str;

                    changes       = parseInt(file_info[2]);

                    insertions    = ((insertion_str / total_str) * changes) | 0;
                    deletions     = ((deletion_str / total_str) * changes) | 0;
                } else {
                    // newly created files or binary files (images, executables, etc)
                    changes = parseInt(file_info[6]) - parseInt(file_info[5]);

                    insertions = 0;
                    deletions  = 0;
                }


                return {
                    filename:   file_info[1],
                    changes:    changes,
                    insertions: insertions,
                    deletions:  deletions
                };
            });

            if (file_summary_data) {
                file_summary_data = {
                    files_changed:    parseInt(file_summary_data[1]),
                    total_insertions: parseInt(file_summary_data[3]) || 0,
                    total_deletions:  parseInt(file_summary_data[5]) || 0
                };
            }

            return {
                hash:      commit[0].substring(7),
                merge:     merge_data,
                author:    author_data[1],
                email:     author_data[2],
                timestamp: new Date(time_data[1]),
                message:   message_data,
                files:     file_data,
                summary:   file_summary_data,
                raw:       commit
            };
        });

        time_end = new Date().getTime();

        console.log('Processed', commits.length, 'commits: took',((time_end - time_begin) / 1000), 'seconds');

        return commits;
    };





(function ($) {
    $(document).ready(function () {
//
//        d3.xml('jquery.xml', function (data) {
//            // parse XML doc into usable JSON format
//            var x2js = new X2JS(),
//                json_data = x2js.xml2json(data),
//                changes = json_data.gitinspector.changes;
//
//            // we want to visualize:
//            //  changes by author
//            //  blame by author
//
//            drawChangesGraph(changes);
//
//        });
        var commits = [],
            $commits_button = $('#commits');

        $commits_button.prop('disabled', true)
            .text('Loading...')
            .click(function () {
                drawCommitsGraph(commits);
            });
        $.ajax('jquery_git.txt', {
            success: function (data) {
                commits = parseCommits(data).filter(function (commit) {
                    return (commit.summary &&
                        commit.summary.total_deletions !== undefined &&
                        commit.summary.total_insertions !== undefined);
                }).sort(function (b, a) {
                    return (a.summary.total_deletions + a.summary.total_insertions) -
                        (b.summary.total_deletions + b.summary.total_insertions);
                });
                $commits_button.prop('disabled', false)
                    .text('Click to start');
            },
            error: function (err) {
                console.error(err);
            }
        })
    })
}(jQuery));