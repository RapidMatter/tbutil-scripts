/*global args,client,eprintln,interpolate,println, writeJson*/
/*jslint plusplus: true*/

var Stat = (function () {
        "use strict";

        function Stat(days) {
            if (days === null) {
                this.days = [];
            } else {
                this.days = days;
            }
        }

        Stat.prototype.days = [];

        Stat.prototype.peak_capacity = function () {
            var peakval = 0,
                i = 0;

            if (this.hasOwnProperty("days") && this.days !== null && this.days.hasOwnProperty("length")) {
                for (i = 0; i < this.days.length; i++) {
                    if (this.days[i].hasOwnProperty("capacity")) {
                        if (this.days[i].capacity.total > peakval) {
                            peakval = this.days[i].capacity.total;
                        }
                    }
                }
            }
            return peakval;
        };

        Stat.prototype.peak_utilization = function () {
            var peakval = 0,
                i = 0;

            if (this.hasOwnProperty("days") && this.days !== null && this.days.hasOwnProperty("length")) {
                for (i = 0; i < this.days.length; i++) {
                    if (this.days[i].hasOwnProperty("values")) {
                        if (this.days[i].values.max > peakval) {
                            peakval = this.days[i].values.max;
                        }
                    }
                }
            }
            return peakval;
        };

        Stat.prototype.average_utilization = function () {
            var totalval = 0,
                i = 0,
                retval = 0;

            if (this.hasOwnProperty("days") && this.days !== null && this.days.hasOwnProperty("length")) {
                for (i = 0; i < this.days.length; i++) {
                    if (this.days[i].hasOwnProperty("values")) {
                        totalval = totalval + this.days[i].values.total;
                    }
                }
                retval = totalval / this.days.length;
            }

            return retval;
        };

        Stat.prototype.add_day = function (day) {
            this.days.push(day);
        };

        return Stat;
    }());

var environment_type = "HYBRID",
    scope = "Market",
    entity_types = ["VirtualMachine"],
    peak = true,
    average = false,
    anonomize = false,
    limit = 0,
    number_of_days = 30,
    vms = [],
    hosts = {},
    name_map = {},
    i,
    normalized_vm,
    aspects,
    aspect_types,
    aspect_keys,
    atype,
    a,
    stats,
    stat,
    stat_name,
    stat_name_key,
    filter,
    day,
    opts,
    days_to_ms,
    stats_req,
    rtn,
    cpuStat,
    memStat,
    ioStat,
    netStat,
    storStat,
    numVCPUs,
    state,
    displayName,
    vms_with_errors = 0;

function print_usage() {
    "use strict";
    eprintln("");
    eprintln("Usage is ..");
    eprintln("");
    eprintln("  tbscript [{cred}] generate_baremetal_file.js [-h]");
    eprintln("    [-d {number_of_days} (default: 30)]");
    eprintln("    [-s {scope} (A unique ID of a group or market. default: Market)]");
    eprintln("    [-e {environment} (default: HYBRID)]");
    eprintln("    [-l {limit} (default: unset, resulting in all available VMs matching the environment and scope)]");
    eprintln("    [-p A flag, when set the resulting file will be based on peak utilization values for each VM. (default: true)]");
    eprintln("    [-a A flag, when set the resulting file will be based on average utilization values for each VM. (default: false)]");
    eprintln("    [-n A flag, when set the resulting file will contain anonomized hostnames and a mapping file hosts-<state>-mapping.json will be created. (default: false)]");
    eprintln("");
}

for (i = 0; i < args.length; i++) {
    if (args[i] === "-h") {
        print_usage();
        return 2;
    }
    if (args[i] === "-a") {
        peak = false;
        average = true;
    }
    if (args[i] === "-s") {
        scope = args[i + 1];
    }
    if (args[i] === "-e") {
        environment_type = args[i + 1];
    }
    if (args[i] === "-l") {
        limit = parseInt(args[i + 1], 10);
    }
    if (args[i] === "-d") {
        number_of_days = parseInt(args[i + 1], 10);
    }
    if (args[i] === "-t") {
        entity_types = args[i + 1].split(",").map(function (s) { "use strict"; return s.toLowerCase(); });
    }
    if (args[i] === "-n") {
        anonomize = true;
    }
}

println(interpolate("Generating a baremetal file for the last ${number_of_days} days of utilization from the environment ${environment_type} scoped to ${scope}"));

opts = {
    q: "",
    types: entity_types,
    environment_type: environment_type,
    scopes: [scope]
};

if (limit) {
    opts.limit = limit;
} else {
    limit = "∞";
}

rtn = client.getSearchResults(opts);

println(interpolate("Found ${rtn.length}/${limit} VMs, iterating over them now."));

days_to_ms = number_of_days *
        24 * // To Hours
        60 * // To Minutes
        60 * // To Seconds
        1000; // To milliseconds
stats_req = {
    "startDate": Date.now() - days_to_ms,
    "endDate": Date.now()
};

// For every VM returned by the search..
for (i = 0; i < rtn.length; i++) {
    try {
        normalized_vm = rtn[i];
        normalized_vm.aspects = {};
        normalized_vm.stats = {};
        normalized_vm.new_stats = {};
        aspects = {};
        stats = [];
        println(normalized_vm.uuid);
        if (!hosts.hasOwnProperty(normalized_vm.state)) {
            hosts[normalized_vm.state] = [];
        }
        if (!name_map.hasOwnProperty(normalized_vm.state)) {
            name_map[normalized_vm.state] = [];
        }
        aspects = client.getAspectsByEntityUuid(rtn[i].uuid);
        aspect_types = Object.keys(aspects);
        for (atype = 0; atype < aspect_types.length; atype++) {
            aspect_keys = Object.keys(aspects[aspect_types[atype]]);
            for (a = 0; a < aspect_keys.length; a++) {
                normalized_vm.aspects[aspect_keys[a]] = aspects[aspect_types[atype]][aspect_keys[a]];
            }
        }

        // Grab all of the statistics for the last 30 days
        if (number_of_days > 0) {
            stats = client.getStatsByUuidQuery(rtn[i].uuid, stats_req);
        } else {
            stats = client.getStatsByEntityUuid(rtn[i].uuid, {});
        }
        // For each day of stats..
        for (day = 0; day < stats.length; day++) {
            // and each stat from that day..
            for (stat = 0; stat < stats[day].statistics.length; stat++) {
                // Build a unique "stat name"
                stat_name_key = "";
                if (stats[day].statistics[stat].hasOwnProperty("filters")) {
                    for (filter = 0; filter < stats[day].statistics[stat].filters.length; filter++) {
                        if (stats[day].statistics[stat].filters[filter].type === "key") {
                            stat_name_key = "_" + stats[day].statistics[stat].filters[filter].value.toLowerCase();
                        }
                    }
                }
                stat_name = stats[day].statistics[stat].name + stat_name_key + "_" + stats[day].statistics[stat].units;
                stat_name = stat_name.toLowerCase();
                if (!normalized_vm.new_stats.hasOwnProperty(stat_name)) {
                    normalized_vm.new_stats[stat_name] = [];
                }
                normalized_vm.new_stats[stat_name].push(stats[day].statistics[stat]);
            }
        }


        if (stats.length > 0) {
            cpuStat = new Stat(normalized_vm.new_stats.vcpu_mhz);
            memStat = new Stat(normalized_vm.new_stats.vmem_kb);
            ioStat = new Stat(normalized_vm.new_stats['iothroughput_kbit/sec']);
            netStat = new Stat(normalized_vm.new_stats['netthroughput_kbit/sec']);
            storStat = new Stat(normalized_vm.new_stats.storageamount_mb);
            numVCPUs = 1;
            displayName = normalized_vm.displayName;
            if (anonomize) {
                displayName = i.toString(10);
                name_map[normalized_vm.state].push({"anon": displayName, "real": normalized_vm.displayName});
            }
            if (normalized_vm.hasOwnProperty("aspects") && normalized_vm.aspects.hasOwnProperty("numVCPUs")) {
                numVCPUs = normalized_vm.aspects.numVCPUs;
            }

            if (peak === true) {
                hosts[normalized_vm.state].push({
                    "ipAddresses": ["0.0.0.0"],
                    "displayName": displayName,
                    "entityId": interpolate("${Date.now()}-${normalized_vm.uuid}"),
                    "osName": normalized_vm.aspects.os,
                    "numOfCPU": numVCPUs.toString(),
                    "memSizeGB": (memStat.peak_capacity() / 1048576).toString(),
                    "memUtilization": ((memStat.peak_utilization() / 1048576) / (memStat.peak_capacity()) / 1048576 * 100).toString(),
                    "cpuSpeedMhz": (cpuStat.peak_capacity() / numVCPUs).toString(),
                    "cpuUtilization": ((cpuStat.peak_utilization() / numVCPUs) / (cpuStat.peak_capacity() / numVCPUs) * 100).toString(),
                    "diskSizeGB": (storStat.peak_utilization() / 1024).toString(),
                    "diskDataKB": ioStat.peak_utilization().toString(),
                    "netTrafficKB": netStat.peak_utilization().toString()
                });
            }

            if (average === true) {
                hosts[normalized_vm.state].push({
                    "ipAddresses": ["0.0.0.0"],
                    "displayName": displayName,
                    "entityId": interpolate("${Date.now()}-${normalized_vm.uuid}"),
                    "osName": normalized_vm.aspects.os,
                    "numOfCPU": numVCPUs.toString(),
                    "memSizeGB": (memStat.peak_capacity() / 1048576).toString(),
                    "memUtilization": ((memStat.average_utilization() / 1048576) / (memStat.peak_capacity()) / 1048576 * 100).toString(),
                    "cpuSpeedMhz": (cpuStat.peak_capacity() / numVCPUs).toString(),
                    "cpuUtilization": ((cpuStat.average_utilization() / numVCPUs) / (cpuStat.peak_capacity() / numVCPUs) * 100).toString(),
                    "diskSizeGB": (storStat.average_utilization() / 1024).toString(),
                    "diskDataKB": ioStat.average_utilization().toString(),
                    "netTrafficKB": netStat.average_utilization().toString()
                });
            }
        } else {
            eprintln(interpolate("No stats for ${normalized_vm.uuid}"));
        }
    } catch (err) {
        vms_with_errors += 1;
        eprintln(interpolate("Error while fetching data for ${normalized_vm.uuid}. Error: ${err}"));
        print("Normalized VM Object: ");
        printJson(normalized_vm);
        print("Aspect Data: ");
        printJson(aspects);
        print("Stat Data: ");
        printJson(stats);
    }
}

for (state in hosts) {
    if (hosts.hasOwnProperty(state)) {
        writeJson(interpolate("hosts-${state.toLowerCase()}.json"), {"hosts": hosts[state]});
    }
}

for (state in name_map) {
    if (name_map.hasOwnProperty(state)) {
        writeJson(interpolate("hosts-${state.toLowerCase()}-mapping.json"), name_map[state]);
    }
}

println(interpolate("Baremetal hosts file(s) created for ${rtn.length-vms_with_errors}/${rtn.length} VMs. See previous output for details on ${vms_with_errors} VMs with errors."));
