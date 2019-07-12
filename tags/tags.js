/*global args,client,eprintln,exit,getenv,interpolate,println,Utilities,writeTable*/
/*jslint plusplus: true*/
var group_name = "",
    grp,
    entities,
    entities_without_tags = [],
    opts,
    i,
    tk,
    t,
    rows = [],
    uuid,
    displayName,
    template,
    targetName,
    tag_keys;

var headers = ["uuid", "displayName", "template", "targetName", "tag_key", "tag_value"];

var desired_tbuilt_commit_date = Utilities.tbutil_date_string_to_date_obj("2019-03-06 16:15:45 +0000");
var tbutil_commit_date = Utilities.tbutil_date_string_to_date_obj(getenv("TURBO_COMMIT_DATE"));

if (tbutil_commit_date < desired_tbuilt_commit_date) {
    eprintln("Expected tbutil 1.1i or newer. Currently installed " + getenv("TURBO_BRANCH") + ". Please upgrade to use this script");
    exit(1);
}

function print_usage() {
    "use strict";
    eprintln("");
    eprintln("Usage is ..");
    eprintln("");
    eprintln("  tbscript [{cred}] tags.js [-h]");
    eprintln("    [-g {group_name} (The name of the entity group in Turbonomic to search. Wildcards are allowed only in the first and last characters. Name must match exactly if no wildcards are used.)]");
    eprintln("");
}

for (i = 0; i < args.length; i++) {
    if (args[i] === "-h") {
        print_usage();
        exit(0);
    }
    if (args[i] === "-g") {
        group_name = args[i + 1];
    }
}

if (group_name === "") {
    eprintln("-g {group_name} is required");
    print_usage();
    exit(1);
}

if (group_name.startsWith("*")) {
    group_name = ".*" + group_name.slice(1);
} else {
    group_name = "^" + group_name;
}

if (group_name.endsWith("*")) {
    group_name = group_name.slice(0, group_name.length - 1);
} else {
    group_name = group_name + "$";
}

opts = {
    q: group_name,
    disable_hateoas: true,
    limit: 20,
    order_by: "severity",
    className: "Group"
};

// These searches could include results that *begin with* the supplied value, so
// more than one result is okay. The first one is always chosen.

// Find our origin group.
println("Searching for group - " + group_name);
var from_grp_resp = client.getSearchResults(opts);
if (from_grp_resp.length === 0) {
    eprintln(interpolate("Searching for group ${group_name} returned ${from_grp_resp.length} results, expecting at least 1"));
    exit(2);
} else if (from_grp_resp.length > 1) {
    eprintln(interpolate("More than one group matches the provided name, please be more specific. Matched groups are;"));
    for (i = 0; i < from_grp_resp.length; i++) {
        eprintln(from_grp_resp[i].displayName);
    }
    exit(2);
}

grp = from_grp_resp[0];
entities = client.getEntitiesByGroupUuid(grp.uuid);

for (i = 0; i < entities.length; i++) {
    uuid = entities[i].uuid;
    displayName = entities[i].displayName;
    template = "unknown";
    targetName = "unknown";
    if (entities[i].hasOwnProperty("template")) {
        template = entities[i].template.displayName;
    }
    if (entities[i].hasOwnProperty("discoveredBy")) {
        targetName = entities[i].discoveredBy.displayName;
    }
    if (!entities[i].hasOwnProperty("tags")) {
        rows.push([uuid, displayName, template, targetName, "null", "null"]);
    } else {
        tag_keys = Object.keys(entities[i].tags);
        for (tk = 0; tk < tag_keys.length; tk++) {
            for (t = 0; t < entities[i].tags[tag_keys[tk]].length; t++) {
                rows.push([uuid, displayName, template, targetName, tag_keys[tk], entities[i].tags[tag_keys[tk]][t]]);
            }
        }
    }
}

writeTable("tags.xlsx", headers, rows);
