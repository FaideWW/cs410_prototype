// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs

var foundation_blue  = "#008CBA",
    foundation_red   = "#f04124",
    playback_speed   = 500,
    default_speed    = 500,
    auto_interval_id = -1,
    fish_common      = {};

$(document).foundation();


/**
 * Takes a stream of data produced by `git log --numstat` and parses it for relevant commit data
 * @param data         A raw file data stream from $.ajax()
 * @returns {Array}    An array of parsed commit objects containing:
 *                      hash, merge info, author, timestamp, message, files changed, etc.
 */
var parseCommits = function (data) {
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


        commits = raw_commits.map(function (commit, i) {
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


            // commits can have arbitrarily long messages
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
                // typical file change:
                // ins  del path
                // 7	1	src/ajax/xhr.js
                var file_info = file.match(/(\d+|-)\t(\d+|-)\t(\S+)\s?/),
                    changes,
                    insertions,
                    deletions;

                insertions = parseInt(file_info[1]);
                deletions  = parseInt(file_info[2]);

                changes    = insertions - deletions;

                return {
                    filename:   file_info[3],
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
    },

    /**
     * Takes an array of commits and returns an associative array of files altered by commits
     * @param commits       The list of commits (ordered or unordered)
     * @returns {Object}    A filename-indexed associative array of files including commit count and last commit
     */
    genFiles = function (commits) {
        var i, j,
            num_commits = commits.length,
            num_files,
            files = {},
            commit,
            file;

        for (i = 0; i < num_commits; i += 1) {

            commit = commits[i];
            num_files = commits[i].files.length;

            for (j = 0; j < num_files; j += 1) {

                file = commits[i].files[j];

                if (file.filename.match(/\S.cpp/)) {
                    if (!files[file.filename]) {
                        files[file.filename] = {
                            commits:     0,
                            last_commit: null
                        };
                    }

                    files[file.filename].commits    += 1;
                    files[file.filename].last_commit = commit.hash;
                }
            }

        }

        return files;
    },

    /**
     * Transforms a file object into a file array (turning the key into a `filename` attribute),
     * and injects some additional d3-specific properties
     * @param files       A file object produced by the parser
     * @returns {Array}   A file array digestible by d3
     */
    fileObjectToD3Array = function (files) {
        return Object.keys(files).map(function (filename) {
            var file = files[filename],
                initial_direction = Math.random() * Math.PI * 2;
            file.filename = filename;

            // random initial direction and velocity (defined as pixels/second)
            file.velocity = {
                x: file.commits * Math.cos(initial_direction),
                y: file.commits * Math.sin(initial_direction)
            };

            return file;
        });
    },

    /**
     * Initializes d3 and selectors, and creates the active file array
     * @param files The file object
     */
    setupD3 = function (files) {
        all_files   = fileObjectToD3Array(files);
        file_array  = all_files;
        max_width    = $(window).width();
        max_height   = $(window).height();

        svg = d3.select('body').append('svg:svg')
            .attr('width', max_width)
            .attr('height', max_height);

        // universal max velocity (as opposed to a per-file max velocity, which produces a stable equilibrium)
        max_velocity = d3.max(file_array, function (d) { return d.commits });
    },

    /**
     * Performs a data-join in d3 on the active file array.  If this is the initial data join,
     *  it also initializes the timer which moves elements around
     *      (we don't want the timer intialized on every call, or we would end up with multiple movement steps per frame)
     *
     *  Draws a circle (future: fish) for each element in the active file array
     *
     * @param {Boolean} setTimer  Whether or not to set the timer (defaults to false)
     */
    drawFish = function (setTimer) {

        var file_fish = svg.selectAll('circle')
                .data(file_array, function (d) { return d.filename; });

        file_fish
            .exit()
            .remove();
        file_fish
            .enter()
            .append('circle')
            .attr('cx', function (d) {
                d.x = Math.random() * max_width;
                return d.x;
            })
            .attr('cy', function (d) {
                d.y = Math.random() * max_height;
                return d.y;
            })
            .attr('r',  5)
            .style('fill', foundation_blue);

        // ^^^^^^^ merge other attributes here ^^^^^^^^


        var current_time = Date.now();

        if (setTimer) {
            d3.timer(function () {
                var dt = Date.now() - current_time,
                    // time since the last step in s
                    lerp = dt / 1000,
                    file_fish = svg.selectAll('circle');

                // if the simulation has not updated in a long time, skip the large step and continue as normal
                if (dt > 1500) {
                    console.log('took too long; skipping step');
                    current_time = Date.now();
                    return;
                }

                // apply forces
                calculate_gravity(lerp);

                // update positions
                file_fish
                    .attr('cx', function (d) {
                        d.x += d.velocity.x * lerp;
                        if (d.x < 0 || d.x > max_width) {
                            d.x = Math.min(Math.max(d.x, 0), max_width);
                            d.velocity.x *= -1;
                        }
                        return d.x;
                    })
                    .attr('cy', function (d) {
                        d.y += d.velocity.y * lerp;
                        if (d.y < 0 || d.y > max_height) {
                            d.y = Math.min(Math.max(d.y, 0), max_height);
                            d.velocity.y *= -1;
                        }
                        return d.y;
                    });

                current_time = Date.now();
            });
        }

    },

    /**
     * Calculates the euclidean distance between two elements
     * @param node1
     * @param node2
     * @returns {number} Distance between node1 and node2
     */
    calculate_distance = function (node1, node2) {
        return Math.sqrt((Math.pow(node2.x - node1.x, 2)) + (Math.pow(node2.y - node1.y, 2)));
    },

    /**
     * Derives and applies an artificial multi-body attractor force between all elements in the active file array
     */
    calculate_gravity = function () {
        var G = 0.005, // adjust this
            i, j,
            num_files = file_array.length,
            total_force, individual_force,
            dist;
        for (i = 0; i < num_files; i += 1) {
            total_force = {
                x: 0,
                y: 0
            };
            //gravitational force = G((m1 * m2) / (r2))
            for (j = 0; j < file_array.length; j += 1) {
                if (i === j) { continue; }

                // linear distance gives us a better looking simulation
                //  (as opposed to the proper Newtonian formula that uses distance squared)
                dist = calculate_distance(file_array[j], file_array[i]);

                if (dist === 0) {
                    continue;
                }

                individual_force = G * ((file_array[j].commits * file_array[i].commits) / dist);

                total_force.x += individual_force * (file_array[j].x - file_array[i].x) / dist;
                total_force.y += individual_force * (file_array[j].y - file_array[i].y) / dist;
            }
            // apply force
            file_array[i].velocity.x = Math.max(Math.min(file_array[i].velocity.x + total_force.x, max_velocity), -max_velocity);
            file_array[i].velocity.y = Math.max(Math.min(file_array[i].velocity.y + total_force.y, max_velocity), -max_velocity);


        }

    },

    __min_commits = 150,
    max_width     = 0,
    max_height    = 0,
    max_velocity  = 0,
    file_array    = [],
    all_files     = [],
    svg,
    $progress     = null;


(function ($) {
    $(document).ready(function () {
        var commits  = [],
            files    = {},
            $slider  = $('#min-commits'),
            $loading = $('#loading');

        $progress = $('#progress');

        $.ajax('task_git.txt', {
            success: function (data) {
                commits = parseCommits(data);
                files   = genFiles(commits);
                $loading.hide();

                setupD3(files);

                // set the active file array to a more reasonable initial value (so computers don't explode)
                file_array = all_files.filter(function (d) { return d.commits > __min_commits; });
                drawFish(true);

            },
            error: function (err) {
                console.error(err);
            }
        });

        $slider.on('input change', function () {

            // change the requisite minimum number of commits to be included in the active file array
            __min_commits = $(this).val();
            file_array = all_files.filter(function (d) { return d.commits > __min_commits; });
            drawFish(false);
        })

    })
}(jQuery));