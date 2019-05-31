/*global args,client,eprintln,interpolate,println,printTable,sprintf,writeTable */
/*jslint plusplus: true*/
var environment_type = "HYBRID",
    scope = "Market",
    entity_types = ["VirtualMachine"],
    stat_names = ["all"],
    aspect_names = ["all"],
    limit = 0,
    number_of_days = 30,
    output_file = "",
    i = 0,
    vms = [],
    rows = [],
    header_row = [],
    agg_aspects,
    aspects,
    aspect_types,
    atype,
    aspect_keys,
    a,
    stats,
    agg_stats,
    hour,
    stat,
    stat_name_key,
    filter,
    stat_name,
    vm_idx,
    row,
    hd_idx;

function print_usage() {
    "use strict";
    eprintln("");
    eprintln("Usage is ..");
    eprintln("");
    eprintln("  tbscript [{cred}] entity-detail.js [-h]");
    eprintln("    [-a {aspects} (A comma separated list of Turbo aspects to include. 'all' will include every available aspect. default: unset, resulting in no aspects)]");
    eprintln("    [-t {entity_types} (A comma separated list of Turbo entity types to report on. default: VirtualMachine)]");
    eprintln("    [-d {number_of_days} (default: 30)]");
    eprintln("    [-s {scope} (A unique ID of a group or market. default: Market)]");
    eprintln("    [-e {environment} (default: HYBRID)]");
    eprintln("    [-n {stat_names} (A comma separated list of Turbo stats to include. 'all' will include every available stat. default: unset, resulting in no stats)]");
    eprintln("    [-l {limit} (default: unset, resulting in all available VMs matching the environment and scope)]");
    eprintln("    [-f {output_file} (Will be formated according to file extension. I.E. .csv, .txt, .xlsx)]");
    eprintln("");
}

function aspect_lambda(v, aspect_name) {
    "use strict";
    if (v.aspects.hasOwnProperty(aspect_name)) {
        return [v.aspects[aspect_name]];
    }
    return [""];
}

function stat_lambda(v, stat_name) {
    "use strict";
    if (v.stats.hasOwnProperty(stat_name)) {
        var avg_capacity = v.stats[stat_name].capacity_sum / v.stats[stat_name].length;
        return [
            sprintf("%.2f", v.stats[stat_name].avg_sum / v.stats[stat_name].length),
            sprintf("%.2f", v.stats[stat_name].peak),
            sprintf("%.2f", (v.stats[stat_name].avg_sum / avg_capacity) / v.stats[stat_name].length),
            sprintf("%.2f", v.stats[stat_name].peak / avg_capacity),
            sprintf("%.2f", avg_capacity)
        ];
    }
    return [0, 0, 0, 0, 0];
}

var headers = [
    {
        "name": "uuid",
        "headers": ["uuid"],
        "values": function (v) { "use strict"; return [v.entity.uuid]; }
    },
    {
        "name": "display_name",
        "headers": ["display_name"],
        "values": function (v) { "use strict"; return [v.entity.displayName]; }
    },
    {
        "name": "state",
        "headers": ["state"],
        "values": function (v) { "use strict"; return [v.entity.state]; }
    }
];

for (i = 0; i < args.length; i++) {
    if (args[i] === "-h") {
        print_usage();
        return 2;
    }
    if (args[i] === "-s") {
        scope = args[i + 1];
    }
    if (args[i] === "-e") {
        environment_type = args[i + 1];
    }
    if (args[i] === "-n") {
        stat_names = args[i + 1].split(",").map(function (s) { "use strict"; return s.toLowerCase(); });
    }
    if (args[i] === "-l") {
        limit = parseInt(args[i + 1], 10);
    }
    if (args[i] === "-f") {
        output_file = args[i + 1];
    }
    if (args[i] === "-d") {
        number_of_days = parseInt(args[i + 1], 10);
    }
    if (args[i] === "-a") {
        aspect_names = args[i + 1].split(",").map(function (s) { "use strict"; return s.toLowerCase(); });
    }
    if (args[i] === "-t") {
        entity_types = args[i + 1].split(",").map(function (s) { "use strict"; return s.toLowerCase(); });
    }
}

println(interpolate('Generating a report of stats ${stat_names.join(",")}, in the group ${scope}, in the environment ${environment_type}'));

var opts = {
    q: "",
    types: entity_types,
    environment_type: environment_type,
    scopes: [scope]
};

if (limit) {
    opts.limit = limit;
}

var rtn = client.getSearchResults(opts);

println(interpolate("Search Results completed, processing ${rtn.length} entities"));

var stats_req = {
    "startDate": interpolate("-${number_of_days}d"),
    "endDate": "-0d"
};

// For every VM returned by the search..
for (i = 0; i < rtn.length; i++) {
    agg_aspects = {};
    if (aspect_names.length) {
        aspects = client.getAspectsByEntityUuid(rtn[i].uuid);
        aspect_types = Object.keys(aspects);
        for (atype = 0; atype < aspect_types.length; atype++) {
            aspect_keys = Object.keys(aspects[aspect_types[atype]]);
            for (a = 0; a < aspect_keys.length; a++) {
                if ((aspect_names.indexOf(aspect_keys[a].toLowerCase()) === -1) && (aspect_names.indexOf("all") === -1)) {
                    continue;
                }

                agg_aspects[aspect_keys[a]] = aspects[aspect_types[atype]][aspect_keys[a]];

                // Check if this aspect has ever been recorded before, for any VM
                if (headers.map(function (h) { "use strict"; return h.name; }).indexOf(aspect_keys[a]) === -1) {
                    headers.push({
                        name: aspect_keys[a],
                        headers: [aspect_keys[a].toLowerCase()],
                        values: aspect_lambda
                    });
                }
            }
        }
    } // if (aspect_names.length)

    if (stat_names.length) {
        // Grab all of the statistics for the last 30 days
        stats = client.getStatsByUuidQuery(rtn[i].uuid, stats_req);

        // Prep an object which will be used to store the aggregate of each stat for
        // each hour returned.
        agg_stats = {};

        // For each hour of stats..
        for (hour = 0; hour < stats.length; hour++) {
            // and each stat from that hour..
            for (stat = 0; stat < stats[hour].statistics.length; stat++) {
                if ((stat_names.indexOf(stats[hour].statistics[stat].name.toLowerCase()) === -1) && (stat_names.indexOf("all") === -1)) {
                    continue;
                }
                // Build a unique "stat name"
                stat_name_key = "";
                if (stats[hour].statistics[stat].hasOwnProperty("filters")) {
                    for (filter = 0; filter < stats[hour].statistics[stat].filters.length; filter++) {
                        if (stats[hour].statistics[stat].filters[filter].type === "key") {
                            stat_name_key = "_" + stats[hour].statistics[stat].filters[filter].value.toLowerCase();
                        }
                    }
                }
                stat_name = stats[hour].statistics[stat].name + stat_name_key + "_" + stats[hour].statistics[stat].units;

                // Check if this stat has ever been recorded before, for any VM
                if (headers.map(function (h) { "use strict"; return h.name; }).indexOf(stat_name) === -1) {
                    headers.push({
                        name: stat_name,
                        headers: [
                            stat_name.toLowerCase() + "_avg",
                            stat_name.toLowerCase() + "_peak",
                            stat_name.toLowerCase() + "_avg_percent_utilized",
                            stat_name.toLowerCase() + "_peak_percent_utilized",
                            stat_name.toLowerCase() + "_avg_capacity"
                        ],
                        values: stat_lambda
                    });
                }

                // If this stat has capacity and utilization information
                if (stats[hour].statistics[stat].hasOwnProperty("values") && stats[hour].statistics[stat].hasOwnProperty("capacity")) {
                    if (!agg_stats.hasOwnProperty(stat_name)) {
                        agg_stats[stat_name] = {
                            avg_sum: stats[hour].statistics[stat].values.avg,
                            peak: stats[hour].statistics[stat].values.max,
                            capacity_sum: stats[hour].statistics[stat].capacity.total,
                            "length": 1
                        };
                    } else {
                        agg_stats[stat_name].length += 1;
                        agg_stats[stat_name].avg_sum += stats[hour].statistics[stat].values.avg;
                        agg_stats[stat_name].capacity_sum += stats[hour].statistics[stat].capacity.total;
                        if (stats[hour].statistics[stat].values.max > agg_stats[stat_name].peak) {
                            agg_stats[stat_name].peak = stats[hour].statistics[stat].values.max;
                        }
                    }
                }
            }
        }
    } // if (stat_names.length)

    vms.push({"entity": rtn[i], "stats": agg_stats, "aspects": agg_aspects});
}

for (vm_idx = 0; vm_idx < vms.length; vm_idx++) {
    row = [];
    for (hd_idx = 0; hd_idx < headers.length; hd_idx++) {
        headers[hd_idx].values(vms[vm_idx], headers[hd_idx].name).map(function (v) { "use strict"; row.push(v); });
    }
    rows.push(row);
}

headers.map(function (h) { "use strict"; h.headers.map(function (v) { header_row.push(v); }); });

if (output_file) {
    writeTable(output_file, header_row, rows);
    println("Output written to " + output_file);
} else {
    printTable(header_row, rows);
}
